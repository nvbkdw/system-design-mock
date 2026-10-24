import { useState, type ReactNode } from "react";
import { FEEDBACK_PROMPT } from "../content/feedbackPrompt";
import { TOTAL_MINUTES } from "../content/phases";

interface Step {
  title: string;
  body: ReactNode;
  /** The features this step uses. */
  uses: string[];
  extra?: ReactNode;
}

const STEPS: Step[] = [
  {
    title: "Pick a question",
    body: (
      <>
        Browse the question bank below and filter by topic or difficulty. First time? Start with <em>TinyURL shortener service</em>. To
        practice a prompt from a real interview, paste it into <em>Your own question</em>.
      </>
    ),
    uses: ["Question bank", "Filters", "Your own question"],
  },
  {
    title: "Work through the six phases",
    body: (
      <>
        Write your answer in each phase's editor, using its checklist and <em>Insert outline</em> to get started. Write your own
        clarifying questions before opening <em>Interviewer answers</em>, the way you'd ask them in the room. Sketch the architecture in
        the <em>Diagram</em> panel. It stays next to your answers in every phase.
      </>
    ),
    uses: ["Phase checklists", "Rich-text editor", "Interviewer answers", "Diagram"],
  },
  {
    title: "Export and get feedback",
    body: (
      <>
        Tick the self-review, then export everything as Markdown: the question, your answers, the diagram as Mermaid and your timing.
        The export ends with a feedback prompt, so you can paste the whole file into an AI assistant and get critical feedback, not
        encouragement. Or send it to a friend.
      </>
    ),
    uses: ["Self-review", "Markdown export"],
    extra: <FeedbackPrompt />,
  },
  {
    title: "Practice again, timed",
    body: (
      <>
        Turn on <em>Timed</em> and start the interview clock. Each phase counts down from its budget. You get a warning with one minute
        left and a prompt to move on when time is up, the way an interviewer would steer you. This is where you learn to fit a
        complete design into {TOTAL_MINUTES} minutes.
      </>
    ),
    uses: ["Timed mode", "Phase prompts", "Timing table"],
  },
  {
    title: "Repeat",
    body: (
      <>
        Redo the same question a few days later, or move to a new one. Compare your exports: are your clarifying questions sharper, do
        you finish every phase on time, do you raise failure modes before being asked? Keep going until the structure feels natural.
      </>
    ),
    uses: ["Progress tracking", "Exports to compare"],
  },
];

function FeedbackPrompt() {
  const [status, setStatus] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(FEEDBACK_PROMPT);
      setStatus("Copied");
    } catch {
      setStatus("Select the text to copy it");
    }
  }

  return (
    <details className="guide-prompt">
      <summary>The feedback prompt included in every export</summary>
      <pre className="guide-prompt-text">{FEEDBACK_PROMPT}</pre>
      <div className="guide-prompt-foot">
        <span role="status">{status}</span>
        <button type="button" className="btn" onClick={copy}>
          Copy prompt
        </button>
      </div>
    </details>
  );
}

export function PracticeGuide() {
  return (
    <section className="guide" aria-labelledby="guide-title">
      <h2 id="guide-title" className="guide-title">
        How to practice
      </h2>
      <ol className="guide-steps">
        {STEPS.map((step, i) => (
          <li key={step.title} className="guide-step">
            <span className="guide-num" aria-hidden="true">
              {i + 1}
            </span>
            <div className="guide-content">
              <h3 className="guide-step-title">{step.title}</h3>
              <p className="guide-body">{step.body}</p>
              <ul className="guide-uses" aria-label="Features used">
                {step.uses.map((use) => (
                  <li key={use}>{use}</li>
                ))}
              </ul>
              {step.extra}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
