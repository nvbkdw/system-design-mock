/// <reference types="vite/client" />

declare module "virtual:question-bank" {
  // An inline import() type: a relative `import type` in an ambient module
  // resolves to `any` (an error that skipLibCheck hides).
  const questions: import("./content/types").Question[];
  export default questions;
}

declare module "virtual:question-statements" {
  /** Question id → statement Markdown rendered to HTML at build time. */
  const statements: Record<string, string>;
  export default statements;
}

declare module "turndown-plugin-gfm" {
  import type TurndownService from "turndown";
  export const gfm: TurndownService.Plugin;
}

interface ImportMetaEnv {
  /** Repository URL, set in CI, used for "Contribute a question" links. */
  readonly VITE_REPO_URL?: string;
}

declare module "virtual:tutorial-book" {
  /** Tutorial chapters in book order, bodies rendered to HTML at build time. */
  const chapters: import("./content/types").RenderedChapter[];
  export default chapters;
}
