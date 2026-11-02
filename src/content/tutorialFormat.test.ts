import { describe, expect, it } from "vitest";
import { parseChapter, parseTutorialBook, slugify } from "./tutorialFormat";

const chapter = (title = "The interview", body = "## Format\n\nIt runs 60 minutes.") =>
  `---\ntitle: ${title}\nsummary: How the interview runs.\n---\n\n${body}\n`;

describe("parseChapter", () => {
  it("takes the number and id from the file name and the title and summary from front matter", () => {
    const result = parseChapter("01-interview-format.md", chapter());
    expect(result).toEqual({
      ok: true,
      chapter: { id: "interview-format", number: 1, title: "The interview", summary: "How the interview runs.", markdown: "## Format\n\nIt runs 60 minutes." },
    });
  });

  it("rejects bad file names, missing fields, # headings and raw HTML", () => {
    expect(parseChapter("intro.md", chapter())).toEqual({ ok: false, errors: [expect.stringContaining("<NN>-<kebab-case-id>.md")] });
    const missing = parseChapter("01-a.md", "---\ntitle: A\n---\n\n## Body");
    expect(missing.ok || missing.errors).toEqual(["summary is required"]);
    const h1 = parseChapter("01-a.md", chapter("A", "# Title again"));
    expect(h1.ok || h1.errors).toEqual([expect.stringContaining("only # heading")]);
    const html = parseChapter("01-a.md", chapter("A", "## X\n\n<script>alert(1)</script>"));
    expect(html.ok || html.errors).toEqual(["body must be Markdown without raw HTML tags"]);
  });

  it("allows angle brackets inside code", () => {
    expect(parseChapter("01-a.md", chapter("A", "## X\n\nUse `<base>` here.\n\n```\n<div></div>\n```")).ok).toBe(true);
  });
});

describe("parseTutorialBook", () => {
  it("orders chapters by number and skips templates", () => {
    const { chapters, errors } = parseTutorialBook({ "02-b.md": chapter("B"), "01-a.md": chapter("A"), "_template.md": "x" });
    expect(errors).toEqual([]);
    expect(chapters.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("reports gaps and repeats in chapter numbers", () => {
    expect(parseTutorialBook({ "01-a.md": chapter(), "03-c.md": chapter() }).errors).toEqual([expect.stringContaining("without gaps")]);
    expect(parseTutorialBook({ "01-a.md": chapter(), "02-a.md": chapter() }).errors).toEqual([expect.stringContaining('duplicate chapter id "a"')]);
  });
});

describe("slugify", () => {
  it("makes readable, unique fragments", () => {
    const taken = new Set<string>();
    expect(slugify("1. Requirements & scope", taken)).toBe("1-requirements-scope");
    expect(slugify("What the `interviewer` scores", taken)).toBe("what-the-interviewer-scores");
    expect(slugify("1. Requirements & scope", taken)).toBe("1-requirements-scope-2");
    expect(slugify("???", taken)).toBe("section");
  });
});
