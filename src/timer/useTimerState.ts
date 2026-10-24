import { useSyncExternalStore } from "react";
import type { PhaseTimer } from "./PhaseTimer";

/** Re-renders the calling component on every timer tick or change. */
export function useTimerState(timer: PhaseTimer): void {
  useSyncExternalStore(timer.subscribe, () => timer.version);
}
