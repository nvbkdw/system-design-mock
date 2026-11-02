// Parser and validator for tutorials/*.md. Pure functions with no Node or DOM
// dependencies, shared by the Vite plugin, the CLI check and the tests.
//
// Format: the file name is "<NN>-<id>.md", where NN is the chapter number
// (its position in the book) and <id> the URL slug, so chapters can be
// reordered without breaking links. A front matter block with `title` and
// `summary` is followed by the chapter body in Markdown, which starts at ##
// (the page renders the title as the h1).
import { parseFrontMatter } from "./questionFormat";
import type { Chapter } from "./types";

const FIELDS = new Set(["title", "summary"]);
const FILE_PATTERN = /^(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;
const LIMITS = { title: 80, summary: 240 };
// The body's HTML is injected into the page; keep it to what Markdown produces.
const RAW_HTML = /<\/?[a-z][^>]*>/i;

export type ChapterResult = { ok: true; chapter: Chapter } | { ok: false; errors: string[] };

export function parseChapter(file: string, text: string): ChapterResult {
  const name = file.match(FILE_PATTERN);
  if (!name) return { ok: false, errors: ['file name must be "<NN>-<kebab-case-id>.md", e.g. 01-interview-format.md'] };

  const errors: string[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines[0] !== "---") return { ok: false, errors: ["file must start with a front matter block (---)"] };
  const end = lines.indexOf("---", 1);
  if (end === -1) return { ok: false, errors: ["front matter block is not closed with ---"] };
  const meta = parseFrontMatter(lines.slice(1, end), errors, FIELDS);
  const markdown = lines.slice(end + 1).join("\n").trim();

  const { title, summary } = meta;
  if (typeof title !== "string" || !title) errors.push("title is required");
  else if (title.length > LIMITS.title) errors.push(`title is ${title.length} chars; keep it under ${LIMITS.title}`);
  if (typeof summary !== "string" || !summary) errors.push("summary is required");
  else if (summary.length > LIMITS.summary) errors.push(`summary is ${summary.length} chars; keep it under ${LIMITS.summary}`);
  if (!markdown) errors.push("chapter body is empty");
  if (/^#\s/m.test(markdown)) errors.push("use ## and below in the body; the title is the chapter's only # heading");
  if (RAW_HTML.test(markdown.replace(/```[\s\S]*?```|`[^`\n]*`/g, ""))) errors.push("body must be Markdown without raw HTML tags");

  if (errors.length) return { ok: false, errors };
  return { ok: true, chapter: { id: name[2], number: Number(name[1]), title: title as string, summary: summary as string, markdown } };
}

export interface BookResult {
  chapters: Chapter[];
  /** "tutorials/<file>: <message>" for every problem found. */
  errors: string[];
}

/** Parses a set of files (name → contents) into chapters ordered by number. Files starting with "_" are skipped. */
export function parseTutorialBook(files: Record<string, string>): BookResult {
  const chapters: Chapter[] = [];
  const errors: string[] = [];
  for (const [file, text] of Object.entries(files)) {
    if (!file.endsWith(".md") || file.startsWith("_")) continue;
    const result = parseChapter(file, text);
    if (result.ok) chapters.push(result.chapter);
    else errors.push(...result.errors.map((e) => `tutorials/${file}: ${e}`));
  }
  chapters.sort((a, b) => a.number - b.number);
  chapters.forEach((chapter, i) => {
    if (chapter.number !== i + 1) errors.push(`tutorials: chapter numbers must run 1, 2, 3… without gaps or repeats; found ${chapter.number} at position ${i + 1}`);
    if (chapters.findIndex((c) => c.id === chapter.id) !== i) errors.push(`tutorials: duplicate chapter id "${chapter.id}"`);
  });
  return { chapters, errors };
}

/** URL fragment for a heading: lowercase words joined by "-", unique within `taken`. */
export function slugify(text: string, taken: Set<string>): string {
  const base =
    text
      .toLowerCase()
      .replace(/[`*_]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "section";
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  taken.add(slug);
  return slug;
}
