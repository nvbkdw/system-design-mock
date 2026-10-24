import bank from "virtual:question-bank";
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

export const QUESTION_BANK: readonly Question[] = bank;

/** Bank questions followed by the custom entry, in display order. */
export const ALL_QUESTIONS: readonly Question[] = [...bank, CUSTOM_QUESTION];

export const isCustom = (q: Question) => q.id === CUSTOM_QUESTION_ID;

export const findQuestion = (id: string | undefined) => ALL_QUESTIONS.find((q) => q.id === id);

export const questionNumber = (q: Question) => "Q" + String(ALL_QUESTIONS.indexOf(q) + 1).padStart(2, "0");
