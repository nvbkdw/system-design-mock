// Parser and validator for questions/*.md. Pure functions with no Node or DOM
// dependencies, shared by the Vite plugin, the CLI check and the tests.
//
// Format: a front matter block (a small YAML subset) followed by exactly the
// sections in SECTIONS. See CONTRIBUTING.md for the contributor-facing guide.
import type { Difficulty, Question } from "./types";
import { CUSTOM_QUESTION_ID } from "./types";

export const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];
const FIELDS = new Set(["title", "tags", "difficulty", "order", "author"]);
const SECTIONS = {
  Statement: "statement",
  "Interviewer answers": "clarify",
  "Where interviewers probe": "probes",
} as const;
type SectionName = keyof typeof SECTIONS;

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TAG_PATTERN = /^[a-z0-9][a-z0-9 -]{0,23}$/;
const LIMITS = { title: 80, statementMin: 80, statementMax: 1200, bullet: 240, minBullets: 3, maxTags: 4 };

type Scalar = string | number;
type FrontMatter = Record<string, Scalar | Scalar[]>;

export type ParseResult = { ok: true; question: Question } | { ok: false; errors: string[] };

function parseScalar(raw: string): Scalar {
  const value = raw.trim();
  if (/^-?\d+$/.test(value)) return Number(value);
  return value.replace(/^(["'])(.*)\1$/, "$2");
}

function parseFrontMatter(lines: string[], errors: string[]): FrontMatter {
  const data: FrontMatter = {};
  lines.forEach((line, i) => {
    if (!line.trim() || line.trim().startsWith("#")) return;
    const match = line.match(/^([a-z]+):\s*(.*)$/);
    if (!match) {
      errors.push(`front matter line ${i + 2}: expected "key: value", got "${line}"`);
      return;
    }
    const [, key, raw] = match;
    if (!FIELDS.has(key)) errors.push(`unknown front matter field "${key}" (allowed: ${[...FIELDS].join(", ")})`);
    if (key in data) errors.push(`duplicate front matter field "${key}"`);
    const list = raw.trim().match(/^\[(.*)\]$/);
    data[key] = list
      ? list[1]
          .split(",")
          .map(parseScalar)
          .filter((v) => v !== "")
      : parseScalar(raw);
  });
  return data;
}

function parseList(lines: string[], name: string, errors: string[]): string[] {
  const items: string[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const item = line.match(/^[-*]\s+(.*)$/);
    if (item) items.push(item[1].trim());
    else if (/^\s+\S/.test(line) && items.length) items[items.length - 1] += " " + line.trim();
    else errors.push(`"${name}" must be a bullet list; unexpected line "${line.trim()}"`);
  }
  return items;
}

function parseParagraphs(lines: string[]): string {
  return lines
    .join("\n")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

export function parseQuestion(id: string, text: string): ParseResult {
  const errors: string[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines[0] !== "---") return { ok: false, errors: ["file must start with a front matter block (---)"] };
  const end = lines.indexOf("---", 1);
  if (end === -1) return { ok: false, errors: ["front matter block is not closed with ---"] };

  const meta = parseFrontMatter(lines.slice(1, end), errors);
  const sections: Partial<Record<SectionName, string[]>> = {};
  let current: SectionName | null = null;
  for (const line of lines.slice(end + 1)) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      const name = heading[1];
      if (!(name in SECTIONS)) {
        errors.push(`unknown section "## ${name}" (allowed: ${Object.keys(SECTIONS).join(", ")})`);
        current = null;
        continue;
      }
      current = name as SectionName;
      if (sections[current]) errors.push(`duplicate section "## ${name}"`);
      sections[current] = [];
    } else if (current) {
      sections[current]!.push(line);
    } else if (line.trim()) {
      errors.push(`text outside a known section: "${line.trim()}"`);
    }
  }
  for (const name of Object.keys(SECTIONS) as SectionName[]) {
    if (!sections[name]) errors.push(`missing section "## ${name}"`);
  }

  const question: Question = {
    id,
    title: meta.title as string,
    tags: meta.tags as string[],
    difficulty: meta.difficulty as Difficulty,
    ...(meta.order !== undefined && { order: meta.order as number }),
    ...(meta.author !== undefined && { author: meta.author as string }),
    statement: parseParagraphs(sections.Statement ?? []),
    clarify: parseList(sections["Interviewer answers"] ?? [], "Interviewer answers", errors),
    probes: parseList(sections["Where interviewers probe"] ?? [], "Where interviewers probe", errors),
  };
  errors.push(...validateQuestion(question));
  return errors.length ? { ok: false, errors } : { ok: true, question };
}

export function validateQuestion(q: Question): string[] {
  const errors: string[] = [];
  if (!ID_PATTERN.test(q.id)) errors.push(`file name must be kebab-case (a-z, 0-9, -), got "${q.id}"`);
  if (q.id === CUSTOM_QUESTION_ID) errors.push(`"${q.id}" is reserved`);

  if (typeof q.title !== "string" || !q.title) errors.push("title is required");
  else if (q.title.length > LIMITS.title) errors.push(`title is ${q.title.length} chars; keep it under ${LIMITS.title}`);

  if (!Array.isArray(q.tags) || q.tags.length < 1 || q.tags.length > LIMITS.maxTags) {
    errors.push(`tags must be a list of 1–${LIMITS.maxTags} items, e.g. tags: [storage, streaming]`);
  } else {
    for (const tag of q.tags) {
      if (typeof tag !== "string" || !TAG_PATTERN.test(tag)) errors.push(`tag "${tag}" must be lowercase, max 24 chars`);
    }
  }

  if (!DIFFICULTIES.includes(q.difficulty)) errors.push(`difficulty must be one of: ${DIFFICULTIES.join(", ")}`);
  if (q.order !== undefined && !Number.isInteger(q.order)) errors.push("order must be an integer");
  if (q.author !== undefined && (typeof q.author !== "string" || !q.author)) errors.push("author must be a non-empty string");

  if (q.statement.length < LIMITS.statementMin) {
    errors.push(`statement is too short; describe the product and what to design (${LIMITS.statementMin}+ chars)`);
  }
  if (q.statement.length > LIMITS.statementMax) {
    errors.push(`statement is too long; keep it under ${LIMITS.statementMax} chars and move numbers to Interviewer answers`);
  }
  if (q.clarify.length < LIMITS.minBullets) errors.push(`Interviewer answers needs at least ${LIMITS.minBullets} bullets`);
  if (q.probes.length < LIMITS.minBullets) errors.push(`Where interviewers probe needs at least ${LIMITS.minBullets} bullets`);
  for (const item of [...q.clarify, ...q.probes]) {
    if (item.length > LIMITS.bullet) errors.push(`bullet is too long (${item.length} chars): "${item.slice(0, 40)}…"`);
  }
  return errors;
}

/** Bank order: explicit `order` first, then by title. */
export function compareQuestions(a: Question, b: Question): number {
  return (a.order ?? Infinity) - (b.order ?? Infinity) || a.title.localeCompare(b.title);
}

export interface BankResult {
  questions: Question[];
  /** "questions/<file>: <message>" for every problem found. */
  errors: string[];
}

/** Parses a set of files (name → contents). Files starting with "_" are skipped. */
export function parseQuestionBank(files: Record<string, string>): BankResult {
  const questions: Question[] = [];
  const errors: string[] = [];
  for (const [file, text] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    if (!file.endsWith(".md") || file.startsWith("_")) continue;
    const result = parseQuestion(file.slice(0, -3), text);
    if (result.ok) questions.push(result.question);
    else errors.push(...result.errors.map((e) => `questions/${file}: ${e}`));
  }
  return { questions: questions.sort(compareQuestions), errors };
}
