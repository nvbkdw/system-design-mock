export type Difficulty = "easy" | "medium" | "hard";

/** A question from the bank, compiled from questions/<id>.md. */
export interface Question {
  id: string;
  title: string;
  tags: string[];
  difficulty: Difficulty;
  order?: number;
  author?: string;
  /** Paragraphs separated by a blank line. */
  statement: string;
  /** What the interviewer answers when asked clarifying questions. */
  clarify: string[];
  /** Areas the interviewer pushes on. */
  probes: string[];
}

export interface Phase {
  id: string;
  title: string;
  short: string;
  minutes: number;
  goal: string;
  prompts: string[];
  placeholder: string;
  /** Starter HTML inserted by "Insert outline". */
  outline: string;
}

export interface RubricItem {
  id: string;
  text: string;
}

export const CUSTOM_QUESTION_ID = "custom";
