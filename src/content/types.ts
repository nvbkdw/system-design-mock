export type Difficulty = "easy" | "medium" | "hard";

/** A question from the bank, compiled from questions/<id>.md. */
export interface Question {
  id: string;
  title: string;
  tags: string[];
  difficulty: Difficulty;
  order?: number;
  author?: string;
  /** The full problem, as Markdown. Rendered for the practice page at build time. */
  statement: string;
  /** Plain-text first paragraph of the statement, for cards and search snippets. */
  summary: string;
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

/** A heading inside a tutorial chapter, for the chapter outline and deep links. */
export interface ChapterSection {
  id: string;
  title: string;
}

/** A tutorial chapter, compiled from tutorials/<NN>-<id>.md. */
export interface Chapter {
  id: string;
  /** 1-based position in the book, from the file name prefix. */
  number: number;
  title: string;
  /** One or two sentences for the table of contents and meta description. */
  summary: string;
  /** The chapter body (Markdown after the front matter). */
  markdown: string;
}

/** A chapter with its body rendered to HTML at build time. */
export interface RenderedChapter extends Chapter {
  html: string;
  /** The chapter's ## headings, in order. */
  sections: ChapterSection[];
}
