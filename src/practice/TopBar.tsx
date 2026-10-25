import { useEffect, useRef } from "react";
import { PHASES } from "../content/phases";
import { formatClock } from "../lib/time";
import type { PhaseTimer } from "../timer/PhaseTimer";
import { WARNING_MS } from "../timer/PhaseTimer";
import { useTimerState } from "../timer/useTimerState";
import { ArmedButton } from "../ui/ArmedButton";
import { RepoLink } from "../ui/RepoLink";
import { SiteBrand } from "../ui/SiteBrand";
import { Switch } from "../ui/Switch";

interface TopBarProps {
  timer: PhaseTimer;
  timed: boolean;
  sound: boolean;
  onTimedChange(timed: boolean): void;
  onSoundChange(sound: boolean): void;
  onStart(): void;
  onReset(): void;
  onExport(): void;
  diagramOpen: boolean;
  onToggleDiagram(): void;
}

export function TopBar(props: TopBarProps) {
  const { timer, timed, sound, onTimedChange, onSoundChange, onStart, onReset, onExport, diagramOpen, onToggleDiagram } = props;
  useTimerState(timer);
  const header = useRef<HTMLElement>(null);

  // Publish the bar's height so the docked diagram panel can sit right below it.
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    const observer = new ResizeObserver(() => document.documentElement.style.setProperty("--topbar-h", `${el.offsetHeight}px`));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const active = timer.started && !timer.completed;
  const total = `${formatClock(timer.totalUsedMs())} / ${formatClock(timer.totalBudgetMs())}`;

  let phaseLabel = `Ready · ${PHASES.length} phases`;
  let time = formatClock(timer.totalBudgetMs());
  let state = "";
  if (timer.completed) {
    phaseLabel = "Complete";
    time = formatClock(timer.totalUsedMs());
  } else if (timer.started) {
    const remaining = timer.remainingMs(timer.current.id);
    phaseLabel = `${timer.index + 1}/${PHASES.length} · ${timer.current.title}${timer.running ? "" : " · paused"}`;
    time = remaining < 0 ? "+" + formatClock(-remaining) : formatClock(remaining);
    state = remaining < 0 ? "is-over" : remaining <= WARNING_MS ? "is-warn" : "";
  }

  return (
    <header className="topbar" ref={header}>
      <div className="wrap topbar-inner">
        <SiteBrand />
        {timed && (
          <div className="clock" aria-label="Interview clock">
            <span className="clock-phase">{phaseLabel}</span>
            <span className={`clock-time ${state}`}>{time}</span>
            <span className="clock-total">{total}</span>
          </div>
        )}
        <div className="controls">
          {timed && (
            <div className="timer-controls">
              {!timer.started && (
                <button type="button" className="btn btn-primary" onClick={onStart}>
                  Start interview
                </button>
              )}
              {active && (
                <>
                  <button type="button" className="btn" onClick={() => (timer.running ? timer.pause() : onStart())}>
                    {timer.running ? "Pause" : "Resume"}
                  </button>
                  <button type="button" className="btn" onClick={() => timer.next()}>
                    {timer.isLast ? "Finish" : "Next phase"}
                  </button>
                </>
              )}
              {timer.started && <ArmedButton label="Reset" armedLabel="Click again to reset" onConfirm={onReset} />}
              <button type="button" className="btn btn-ghost" aria-pressed={sound} onClick={() => onSoundChange(!sound)}>
                {sound ? "Sound on" : "Sound off"}
              </button>
            </div>
          )}
          <Switch id="toggle-timed" label="Timed" checked={timed} onChange={onTimedChange} />
          <button type="button" className="btn" aria-pressed={diagramOpen} onClick={onToggleDiagram}>
            {diagramOpen ? "Hide diagram" : "Diagram"}
          </button>
          <button type="button" className="btn" onClick={onExport}>
            Export
          </button>
          <RepoLink />
        </div>
      </div>
      {timed && (
        <div className="wrap">
          <div className="timeline" aria-hidden="true">
            {PHASES.map((phase, i) => {
              const used = timer.usedMs(phase.id);
              const budget = timer.budgetMs(phase.id);
              const classes = ["tl-seg", active && i === timer.index && "is-current", used > budget && "is-over"];
              return (
                <div key={phase.id} className={classes.filter(Boolean).join(" ")} style={{ flexGrow: phase.minutes }} title={phase.title}>
                  <span className="tl-fill" style={{ width: `${Math.min(100, (used / budget) * 100)}%` }} />
                  <span className="tl-label">{phase.short}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
