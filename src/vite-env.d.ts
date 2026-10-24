/// <reference types="vite/client" />

declare module "virtual:question-bank" {
  import type { Question } from "./content/types";
  const questions: Question[];
  export default questions;
}

declare module "turndown-plugin-gfm" {
  import type TurndownService from "turndown";
  export const gfm: TurndownService.Plugin;
}

interface ImportMetaEnv {
  /** Repository URL, set in CI, used for "Contribute a question" links. */
  readonly VITE_REPO_URL?: string;
}
