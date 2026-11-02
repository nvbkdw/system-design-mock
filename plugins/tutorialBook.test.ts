import { describe, expect, it } from "vitest";
import { PHASES } from "../src/content/phases";
import { chapterPath } from "../src/content/routes";
import { loadRenderedBook, loadTutorialBook, renderChapter } from "./tutorialBook";

describe("renderChapter", () => {
  it("gives headings ids and lists the ## headings as sections", () => {
    const rendered = renderChapter({ id: "a", number: 1, title: "A", summary: "S", markdown: "## The **clock**\n\n### Detail\n\n## You'll need Q&A" });
    expect(rendered.html).toContain('<h2 id="the-clock">The <strong>clock</strong></h2>');
    expect(rendered.html).toContain('<h3 id="detail">Detail</h3>');
    expect(renderChapter({ id: "a", number: 1, title: "A", summary: "S", markdown: "See [below](#prep)." }).html).toContain(
      '<a href="tutorials/a/#prep">below</a>',
    );
    expect(rendered.sections).toEqual([
      { id: "the-clock", title: "The clock" },
      { id: "you-ll-need-q-a", title: "You'll need Q&A" },
    ]);
  });
});

describe("tutorials/", () => {
  it("is a valid book", () => {
    const { chapters, errors } = loadTutorialBook();
    expect(errors).toEqual([]);
    expect(chapters.length).toBeGreaterThan(0);
  });

  it("has no broken links between or within chapters", () => {
    const book = loadRenderedBook();
    const ids = new Map(book.map((c) => [chapterPath(c.id), new Set([...c.html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]))]));
    const broken = book.flatMap((c) =>
      [...c.html.matchAll(/href="(tutorials\/[^"#]*)(?:#([^"]*))?"/g)]
        .filter(([, page, anchor]) => !ids.get(page) || (anchor && !ids.get(page)!.has(anchor)))
        .map(([link]) => `${c.id}: ${link}`),
    );
    expect(broken).toEqual([]);
  });

  // The practice tool's phases are the source of truth; the chapter that
  // teaches them must not drift from what users practice.
  it("introduces every practice phase with its time budget in chapter 1", () => {
    const [intro] = loadRenderedBook();
    for (const [i, phase] of PHASES.entries()) {
      expect(intro.markdown).toContain(`| ${i + 1}. ${phase.title} | ${phase.minutes} min |`);
      expect(intro.markdown).toContain(`### ${i + 1}. ${phase.title}`);
    }
  });
});
