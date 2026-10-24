// Phase timer for timed mode. Framework-free so it can be unit tested.
// Time is derived from timestamps rather than counted per tick, so throttled
// background tabs stay accurate.
import type { Phase } from "../content/types";
import { emptyTiming, type Timing } from "../lib/storage";

export const WARNING_MS = 60_000;

export type TimerEvent =
  | { type: "phase"; index: number }
  | { type: "warning"; phase: Phase }
  | { type: "expire"; phase: Phase; isLast: boolean }
  | { type: "complete" };

type Flags = { warned: boolean; expired: boolean };

export class PhaseTimer {
  private used: Record<string, number> = {};
  private extra: Record<string, number> = {};
  private flags: Record<string, Flags> = {};
  private runStart = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<() => void>();
  private eventListeners = new Set<(event: TimerEvent) => void>();

  index = 0;
  started = false;
  running = false;
  completed = false;
  /** Increments on every observable change; the React snapshot. */
  version = 0;

  constructor(
    readonly phases: readonly Phase[],
    timing: Timing = emptyTiming(),
    private readonly now: () => number = Date.now,
  ) {
    this.load(timing);
  }

  // ---- reads ---------------------------------------------------------------

  get current(): Phase {
    return this.phases[this.index];
  }

  get isLast(): boolean {
    return this.index === this.phases.length - 1;
  }

  budgetMs(id: string): number {
    const phase = this.phases.find((p) => p.id === id);
    return (phase ? phase.minutes * 60_000 : 0) + (this.extra[id] ?? 0);
  }

  usedMs(id: string): number {
    const live = this.running && this.current.id === id ? this.now() - this.runStart : 0;
    return (this.used[id] ?? 0) + live;
  }

  remainingMs(id: string): number {
    return this.budgetMs(id) - this.usedMs(id);
  }

  totalUsedMs(): number {
    return this.phases.reduce((sum, p) => sum + this.usedMs(p.id), 0);
  }

  totalBudgetMs(): number {
    return this.phases.reduce((sum, p) => sum + p.minutes * 60_000, 0);
  }

  serialize(): Timing {
    const used: Record<string, number> = {};
    for (const phase of this.phases) used[phase.id] = this.usedMs(phase.id);
    return { used, extra: { ...this.extra }, index: this.index, completed: this.completed };
  }

  // ---- subscriptions -------------------------------------------------------

  /** Called on every tick and state change. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Called on phase changes, warnings, expiry and completion. */
  onEvent(listener: (event: TimerEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  // ---- transitions ---------------------------------------------------------

  load(timing: Timing): void {
    this.stopLoop();
    this.used = { ...timing.used };
    this.extra = { ...timing.extra };
    this.index = Math.min(Math.max(timing.index, 0), this.phases.length - 1);
    this.completed = timing.completed;
    this.started = this.completed || Object.values(this.used).some((ms) => ms > 0);
    this.running = false;
    // Thresholds already passed should not prompt again after a reload.
    this.flags = {};
    for (const phase of this.phases) {
      const remaining = this.remainingMs(phase.id);
      this.flags[phase.id] = { warned: remaining <= WARNING_MS, expired: remaining <= 0 };
    }
    this.changed();
  }

  start(): void {
    if (this.completed || this.running) return;
    const first = !this.started;
    this.started = true;
    this.running = true;
    this.runStart = this.now();
    this.startLoop();
    if (first) this.emit({ type: "phase", index: this.index });
    this.changed();
  }

  pause(): void {
    if (!this.running) return;
    this.commit();
    this.running = false;
    this.stopLoop();
    this.changed();
  }

  next(): void {
    if (!this.started || this.completed) return;
    if (this.isLast) return this.finish();
    if (this.running) this.commit();
    this.index += 1;
    this.emit({ type: "phase", index: this.index });
    this.changed();
  }

  extend(ms: number): void {
    const id = this.current.id;
    this.extra[id] = (this.extra[id] ?? 0) + ms;
    this.flags[id] = { warned: this.remainingMs(id) <= WARNING_MS, expired: false };
    this.changed();
  }

  finish(): void {
    if (this.running) this.commit();
    this.running = false;
    this.completed = true;
    this.stopLoop();
    this.emit({ type: "complete" });
    this.changed();
  }

  reset(): void {
    this.load(emptyTiming());
  }

  dispose(): void {
    this.stopLoop();
    this.listeners.clear();
    this.eventListeners.clear();
  }

  /** Checks thresholds; runs every 250 ms while running. Public for tests. */
  tick(): void {
    const phase = this.current;
    const remaining = this.remainingMs(phase.id);
    const flags = (this.flags[phase.id] ??= { warned: false, expired: false });
    if (remaining <= WARNING_MS && remaining > 0 && !flags.warned) {
      flags.warned = true;
      this.emit({ type: "warning", phase });
    }
    if (remaining <= 0 && !flags.expired) {
      flags.warned = flags.expired = true;
      this.emit({ type: "expire", phase, isLast: this.isLast });
    }
    this.changed();
  }

  // ---- internals -----------------------------------------------------------

  private commit(): void {
    const id = this.current.id;
    const now = this.now();
    this.used[id] = (this.used[id] ?? 0) + (now - this.runStart);
    this.runStart = now;
  }

  private startLoop(): void {
    this.stopLoop();
    this.interval = setInterval(() => this.tick(), 250);
  }

  private stopLoop(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  private changed(): void {
    this.version += 1;
    for (const listener of this.listeners) listener();
  }

  private emit(event: TimerEvent): void {
    for (const listener of this.eventListeners) listener(event);
  }
}
