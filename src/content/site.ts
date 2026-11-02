// Site-wide names and descriptions, shared by the app and the generated page metadata.
import { TOTAL_MINUTES } from "./phases";

export const SITE_NAME = "System Design Interview Mock";

export const HOME_TITLE = `${SITE_NAME} · Practice timed system design interviews`;

export const SITE_DESCRIPTION =
  `Free system design interview practice. Work through a ${TOTAL_MINUTES}-minute mock interview in six timed phases, ` +
  "from requirements and estimation to deep dives and failure modes, then export your answer as Markdown for AI feedback.";

/** Browser tab and search result title for a question page. */
export const questionPageTitle = (questionTitle: string) => `${questionTitle} · ${SITE_NAME}`;

export const TUTORIALS_NAME = "System Design Interview Tutorial";

export const TUTORIALS_TITLE = `${TUTORIALS_NAME} · ${SITE_NAME}`;

export const TUTORIALS_DESCRIPTION =
  "A short, free tutorial on system design interviews: how the interview runs, what interviewers score, " +
  "the six phases of a strong answer, and how to prepare.";

/** Browser tab and search result title for a tutorial chapter. */
export const chapterPageTitle = (chapterTitle: string) => `${chapterTitle} · ${TUTORIALS_NAME}`;
