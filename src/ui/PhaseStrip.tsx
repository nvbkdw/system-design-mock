import { PHASES } from "../content/phases";

/** The six phases drawn proportionally to their time budgets. */
export function PhaseStrip() {
  return (
    <div className="phase-strip" aria-label="Interview phases and time budgets">
      {PHASES.map((phase, i) => (
        <div key={phase.id} className="strip-seg" style={{ flexGrow: phase.minutes }} title={`${phase.title} · ${phase.minutes} min`}>
          <span className="strip-num">{i + 1}</span>
          <span className="strip-name">{phase.short}</span>
          <span className="strip-min">{phase.minutes}m</span>
        </div>
      ))}
    </div>
  );
}
