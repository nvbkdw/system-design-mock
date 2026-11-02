import { describe, expect, it } from "vitest";
import { PHASES } from "../src/content/phases";
import { loadRenderedBook, loadTutorialBook, renderChapter } from "./tutorialBook";

describe("renderChapter", () => {
  it("gives headings ids and lists the ## headings as sections", () => {
    const rendered = renderChapter({ id: "a", number: 1, title: "A", summary: "S", markdown: "## The **clock**\n\n### Detail\n\n## Prep" });
    expect(rendered.html).toContain('<h2 id="the-clock">The <strong>clock</strong></h2>');
    expect(rendered.html).toContain('<h3 id="detail">Detail</h3>');
    expect(rendered.sections).toEqual([
      { id: "the-clock", title: "The clock" },
      { id: "prep", title: "Prep" },
    ]);
  });
});

describe("tutorials/", () => {
  it("is a valid book", () => {
    const { chapters, errors } = loadTutorialBook();
    expect(errors).toEqual([]);
    expect(chapters.length).toBeGreaterThan(0);
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
