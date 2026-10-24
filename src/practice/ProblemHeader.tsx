import { isCustom, questionNumber } from "../content/questions";
import type { Question } from "../content/types";
import { ArmedButton } from "../ui/ArmedButton";
import { useRecordSlice, type RecordStore } from "./RecordStore";

interface ProblemHeaderProps {
  question: Question;
  store: RecordStore;
  onClear(): void;
}

export function ProblemHeader({ question, store, onClear }: ProblemHeaderProps) {
  const clear = (
    <div className="problem-actions">
      <ArmedButton label="Clear answers" armedLabel="Click again to clear" onConfirm={onClear} />
    </div>
  );
  if (isCustom(question)) return <CustomProblem store={store}>{clear}</CustomProblem>;

  return (
    <section className="problem">
      <p className="eyebrow">{[questionNumber(question), question.difficulty, ...question.tags].join(" · ")}</p>
      <h1 className="problem-title">{question.title}</h1>
      <div className="problem-statement">
        {question.statement.split("\n\n").map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {question.author && <p className="problem-author">Contributed by {question.author}</p>}
      <div className="hints">
        <details className="hint">
          <summary>
            Interviewer answers <span className="hint-note">open after writing your questions</span>
          </summary>
          <ul className="hint-list">
            {question.clarify.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
        <details className="hint">
          <summary>Where interviewers probe</summary>
          <ul className="hint-list">
            {question.probes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      </div>
      {clear}
    </section>
  );
}

function CustomProblem({ store, children }: { store: RecordStore; children: React.ReactNode }) {
  const custom = useRecordSlice(store, (r) => r.custom);
  const set = (patch: Partial<typeof custom>) => store.update((r) => ({ ...r, custom: { ...r.custom, ...patch } }));

  return (
    <section className="problem">
      <p className="eyebrow">Your own question</p>
      <input
        id="custom-title"
        className="custom-title"
        type="text"
        placeholder="Question title, e.g. Design a URL shortener"
        aria-label="Question title"
        value={custom.title}
        onChange={(e) => set({ title: e.target.value })}
      />
      <textarea
        id="custom-statement"
        className="custom-statement"
        rows={4}
        placeholder="Paste the problem statement here."
        aria-label="Problem statement"
        value={custom.statement}
        onChange={(e) => set({ statement: e.target.value })}
      />
      {children}
    </section>
  );
}
