import { describe, expect, it } from "vitest";
import type { Phase } from "../content/types";
import { emptyTiming } from "../lib/storage";
import { PhaseTimer, type TimerEvent } from "./PhaseTimer";

const phase = (id: string, minutes: number): Phase => ({
  id, title: id, short: id, minutes, goal: "", prompts: [], placeholder: "", outline: "",
});
const PHASES = [phase("a", 5), phase("b", 3)];
const MIN = 60_000;

function setup() {
  let now = 1_000_000;
  const timer = new PhaseTimer(PHASES, emptyTiming(), () => now);
  const events: string[] = [];
  timer.onEvent((e: TimerEvent) => events.push(e.type + ("phase" in e && typeof e.phase === "object" ? ":" + e.phase.id : "")));
  return { timer, events, advance: (ms: number) => ((now += ms), timer.tick()) };
}

describe("PhaseTimer", () => {
  it("counts time only while running", () => {
    const { timer, advance } = setup();
    timer.start();
    advance(2 * MIN);
    timer.pause();
    advance(10 * MIN);
    expect(timer.usedMs("a")).toBe(2 * MIN);
    expect(timer.remainingMs("a")).toBe(3 * MIN);
    timer.dispose();
  });

  it("warns once at one minute left and expires once", () => {
    const { timer, events, advance } = setup();
    timer.start();
    advance(4 * MIN + 1000);
    advance(1000);
    advance(MIN);
    advance(MIN);
    expect(events).toEqual(["phase", "warning:a", "expire:a"]);
    timer.dispose();
  });

  it("extending re-arms expiry for the current phase", () => {
    const { timer, events, advance } = setup();
    timer.start();
    advance(5 * MIN);
    timer.extend(2 * MIN);
    expect(timer.remainingMs("a")).toBe(2 * MIN);
    advance(2 * MIN);
    expect(events.filter((e) => e === "expire:a")).toHaveLength(2);
    timer.dispose();
  });

  it("advances phases and completes after the last one", () => {
    const { timer, events, advance } = setup();
    timer.start();
    advance(MIN);
    timer.next();
    advance(MIN);
    timer.next();
    expect(timer.completed).toBe(true);
    expect(timer.running).toBe(false);
    expect(events).toContain("complete");
    expect(timer.serialize()).toMatchObject({ used: { a: MIN, b: MIN }, completed: true });
  });

  it("restores from saved timing without re-prompting past thresholds", () => {
    const { timer, advance } = setup();
    timer.start();
    advance(6 * MIN);
    timer.pause();
    let now = 0;
    const restored = new PhaseTimer(PHASES, timer.serialize(), () => now);
    const events: string[] = [];
    restored.onEvent((e) => events.push(e.type));
    restored.start();
    now += 1000;
    restored.tick();
    expect(restored.started).toBe(true);
    expect(events).toEqual([]);
    restored.dispose();
    timer.dispose();
  });
});
