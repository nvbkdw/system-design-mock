// Site-wide names and descriptions, shared by the app and the generated page metadata.
import { TOTAL_MINUTES } from "./phases";

export const SITE_NAME = "System Design Interview Mock";

export const HOME_TITLE = `${SITE_NAME} · Practice timed system design interviews`;

export const SITE_DESCRIPTION =
  `Free system design interview practice. Work through a ${TOTAL_MINUTES}-minute mock interview in six timed phases, ` +
  "from requirements and estimation to deep dives and failure modes, then export your answer as Markdown for AI feedback.";

/** Browser tab and search result title for a question page. */
export const questionPageTitle = (questionTitle: string) => `${questionTitle} · ${SITE_NAME}`;
