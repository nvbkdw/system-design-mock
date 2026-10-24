import { useState } from "react";
import { FEEDBACK_PROMPT } from "../content/feedbackPrompt";
import { GUIDE_STEPS, splitEmphasis } from "../content/guide";

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
        {GUIDE_STEPS.map((step, i) => (
          <li key={step.title} className="guide-step">
            <span className="guide-num" aria-hidden="true">
              {i + 1}
            </span>
            <div className="guide-content">
              <h3 className="guide-step-title">{step.title}</h3>
              <p className="guide-body">
                {splitEmphasis(step.text).map((part, j) => (part.em ? <em key={j}>{part.text}</em> : part.text))}
              </p>
              <ul className="guide-uses" aria-label="Features used">
                {step.uses.map((use) => (
                  <li key={use}>{use}</li>
                ))}
              </ul>
              {/* The export step shows the prompt that every export ends with. */}
              {step.uses.includes("Markdown export") && <FeedbackPrompt />}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
