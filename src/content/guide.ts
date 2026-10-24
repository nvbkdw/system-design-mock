// "How to practice" steps. Rendered on the home page and published as HowTo
// structured data. *Text in asterisks* names a feature and is emphasized.
import { TOTAL_MINUTES } from "./phases";

export interface GuideStep {
  title: string;
  text: string;
  /** The features this step uses. */
  uses: string[];
}

export const GUIDE_STEPS: readonly GuideStep[] = [
  {
    title: "Pick a question",
    text:
      "Browse the question bank below and filter by topic or difficulty. First time? Start with *TinyURL shortener service*. " +
      "To practice a prompt from a real interview, paste it into *Your own question*.",
    uses: ["Question bank", "Filters", "Your own question"],
  },
  {
    title: "Work through the six phases",
    text:
      "Write your answer in each phase's editor, using its checklist and *Insert outline* to get started. Write your own " +
      "clarifying questions before opening *Interviewer answers*, the way you'd ask them in the room. Sketch the architecture " +
      "in the *Diagram* panel. It stays next to your answers in every phase.",
    uses: ["Phase checklists", "Rich-text editor", "Interviewer answers", "Diagram"],
  },
  {
    title: "Export and get feedback",
    text:
      "Tick the self-review, then export everything as Markdown: the question, your answers, the diagram as Mermaid and your " +
      "timing. The export ends with a feedback prompt, so you can paste the whole file into an AI assistant and get critical " +
      "feedback, not encouragement. Or send it to a friend.",
    uses: ["Self-review", "Markdown export"],
  },
  {
    title: "Practice again, timed",
    text:
      "Turn on *Timed* and start the interview clock. Each phase counts down from its budget. You get a warning with one minute " +
      "left and a prompt to move on when time is up, the way an interviewer would steer you. This is where you learn to fit a " +
      `complete design into ${TOTAL_MINUTES} minutes.`,
    uses: ["Timed mode", "Phase prompts", "Timing table"],
  },
  {
    title: "Repeat",
    text:
      "Redo the same question a few days later, or move to a new one. Compare your exports: are your clarifying questions " +
      "sharper, do you finish every phase on time, do you raise failure modes before being asked? Keep going until the " +
      "structure feels natural.",
    uses: ["Progress tracking", "Exports to compare"],
  },
];

/** Splits step text into plain and emphasized parts. */
export function splitEmphasis(text: string): { text: string; em: boolean }[] {
  return text
    .split(/\*([^*]+)\*/)
    .map((part, i) => ({ text: part, em: i % 2 === 1 }))
    .filter((part) => part.text);
}

export const plainText = (text: string) => text.replace(/\*([^*]+)\*/g, "$1");
