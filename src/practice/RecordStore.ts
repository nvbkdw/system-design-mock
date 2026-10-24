// Holds one question's answers outside React state, so typing in an editor
// does not re-render the page. Components subscribe to the slices they show.
import { useSyncExternalStore } from "react";
import type { Diagram } from "../diagram/types";
import { clearRecord, loadRecord, saveRecord, type AnswerRecord, type Timing } from "../lib/storage";

const SAVE_DELAY_MS = 400;

export class RecordStore {
  private record: AnswerRecord;
  private listeners = new Set<() => void>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private discarded = false;

  constructor(
    private readonly questionId: string,
    private readonly timing: () => Timing,
  ) {
    this.record = loadRecord(questionId);
  }

  get = (): AnswerRecord => this.record;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Applies an edit by the user and schedules a save. */
  update(fn: (record: AnswerRecord) => AnswerRecord): void {
    this.record = { ...fn(this.record), updatedAt: Date.now() };
    for (const listener of this.listeners) listener();
    this.scheduleSave();
  }

  setAnswer(phaseId: string, html: string): void {
    this.update((r) => ({ ...r, answers: { ...r.answers, [phaseId]: html } }));
  }

  setDiagram(diagram: Diagram): void {
    this.update((r) => ({ ...r, diagram }));
  }

  /** Current record with live timing, e.g. for export. */
  snapshot(): AnswerRecord {
    return { ...this.record, timing: this.timing() };
  }

  scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), SAVE_DELAY_MS);
  }

  flush(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    if (!this.discarded) saveRecord(this.questionId, this.snapshot());
  }

  /** Deletes the saved record; this store never saves again. */
  discard(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.discarded = true;
    clearRecord(this.questionId);
  }
}

/** Subscribes to one slice; re-renders only when that slice changes identity. */
export function useRecordSlice<T>(store: RecordStore, select: (record: AnswerRecord) => T): T {
  return useSyncExternalStore(store.subscribe, () => select(store.get()));
}
