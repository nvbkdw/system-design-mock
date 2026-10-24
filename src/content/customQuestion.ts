import { CUSTOM_QUESTION_ID, type Question } from "./types";

/** The "your own question" entry: title and statement come from the user. */
export const CUSTOM_QUESTION: Question = {
  id: CUSTOM_QUESTION_ID,
  title: "Your own question",
  tags: [],
  difficulty: "medium",
  statement: "",
  clarify: [],
  probes: [],
};
