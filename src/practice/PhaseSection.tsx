import { memo, type Ref } from "react";
import type { Phase } from "../content/types";
import { RichEditor, type RichEditorHandle } from "../editor/RichEditor";
import { formatClock } from "../lib/time";
import type { PhaseTimer } from "../timer/PhaseTimer";
import { useTimerState } from "../timer/useTimerState";

const Editor = memo(RichEditor);

interface PhaseSectionProps {
  phase: Phase;
  index: number;
  timer: PhaseTimer;
  timed: boolean;
  initialHtml: string;
  onChange(html: string): void;
  editorRef: Ref<RichEditorHandle>;
}

export function PhaseSection({ phase, index, timer, timed, initialHtml, onChange, editorRef }: PhaseSectionProps) {
  useTimerState(timer);
  const isActive = timed && timer.started && !timer.completed && timer.index === index;
  const used = timer.usedMs(phase.id);
  const over = used > timer.budgetMs(phase.id);

  return (
    <section className={"phase" + (isActive ? " is-active" : "")} id={`phase-${phase.id}`} aria-labelledby={`phase-title-${phase.id}`}>
      <header className="phase-head">
        <span className="phase-num">{index + 1}</span>
        <div className="phase-titles">
          <h2 id={`phase-title-${phase.id}`} className="phase-title">
            {phase.title}
          </h2>
          <p className="phase-goal">{phase.goal}</p>
        </div>
        <div className="phase-meta">
          {isActive && <span className="chip-now">Now</span>}
          <span className="phase-budget">{phase.minutes} min</span>
          {timed && used > 0 && <span className={"phase-used" + (over ? " is-over" : "")}>used {formatClock(used)}</span>}
        </div>
      </header>
      <details className="phase-prompts">
        <summary>Checklist</summary>
        <ul>
          {phase.prompts.map((prompt) => (
            <li key={prompt}>{prompt}</li>
          ))}
        </ul>
      </details>
      <Editor
        ref={editorRef}
        label={phase.title}
        placeholder={phase.placeholder}
        initialHtml={initialHtml}
        outline={phase.outline}
        onChange={onChange}
      />
    </section>
  );
}
