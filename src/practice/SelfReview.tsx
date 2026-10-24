import { Link } from "react-router-dom";
import { PHASES, RUBRIC } from "../content/phases";
import { ALL_QUESTIONS } from "../content/questions";
import { questionRoute } from "../content/routes";
import type { Question } from "../content/types";
import { formatClock, wholeSeconds } from "../lib/time";
import type { PhaseTimer } from "../timer/PhaseTimer";
import { useTimerState } from "../timer/useTimerState";
import { useRecordSlice, type RecordStore } from "./RecordStore";

interface SelfReviewProps {
  question: Question;
  store: RecordStore;
  timer: PhaseTimer;
  onExport(): void;
}

export function SelfReview({ question, store, timer, onExport }: SelfReviewProps) {
  const rubric = useRecordSlice(store, (r) => r.rubric);
  const index = ALL_QUESTIONS.indexOf(question);
  const prev = ALL_QUESTIONS[index - 1];
  const next = ALL_QUESTIONS[index + 1];

  return (
    <section className="review" id="self-review" aria-labelledby="review-title">
      <h2 id="review-title" className="review-title">
        Self-review
      </h2>
      <p className="review-intro">Tick what you actually did. The checklist is included in the export.</p>
      <ul className="rubric">
        {RUBRIC.map((item) => (
          <li key={item.id}>
            <input
              type="checkbox"
              id={`rubric-${item.id}`}
              checked={!!rubric[item.id]}
              onChange={(e) => store.update((r) => ({ ...r, rubric: { ...r.rubric, [item.id]: e.target.checked } }))}
            />
            <label htmlFor={`rubric-${item.id}`}>{item.text}</label>
          </li>
        ))}
      </ul>
      <TimingSummary timer={timer} />
      <div className="review-actions">
        <button type="button" className="btn btn-primary" onClick={onExport}>
          Export answers as Markdown
        </button>
      </div>
      <nav className="pager" aria-label="Other questions">
        {prev ? (
          <Link className="pager-link" to={questionRoute(prev.id)}>
            <span>← Previous</span>
            <strong>{prev.title}</strong>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link className="pager-link pager-next" to={questionRoute(next.id)}>
            <span>Next →</span>
            <strong>{next.title}</strong>
          </Link>
        )}
      </nav>
    </section>
  );
}

function TimingSummary({ timer }: { timer: PhaseTimer }) {
  useTimerState(timer);
  if (!timer.started) return null;
  return (
    <div className="timing-summary">
      <h3>Timing</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Phase</th>
              <th>Budget</th>
              <th>Used</th>
              <th>Over / under</th>
            </tr>
          </thead>
          <tbody>
            {PHASES.map((phase) => {
              const used = wholeSeconds(timer.usedMs(phase.id));
              const delta = used - timer.budgetMs(phase.id);
              return (
                <tr key={phase.id}>
                  <td>{phase.title}</td>
                  <td>{formatClock(timer.budgetMs(phase.id))}</td>
                  <td>{formatClock(used)}</td>
                  <td className={delta > 0 ? "is-over" : undefined}>{(delta > 0 ? "+" : "−") + formatClock(Math.abs(delta))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
