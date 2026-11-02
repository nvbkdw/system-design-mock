// @vitest-environment jsdom
// Every ```mermaid block in tutorials/*.md must parse, so no chapter ships a
// diagram that renders as an error. Mermaid's parser needs a DOM, hence jsdom.
import mermaid from "mermaid";
import { beforeAll, describe, expect, it } from "vitest";
import { loadTutorialBook } from "./tutorialBook";

const blocks = loadTutorialBook().chapters.flatMap((chapter) =>
  [...chapter.markdown.matchAll(/^```mermaid\n([\s\S]*?)^```/gm)].map((match, i) => ({
    name: `tutorials ${chapter.number}-${chapter.id} diagram ${i + 1}: ${match[1].split("\n")[0]}`,
    source: match[1],
  })),
);

describe("tutorial diagrams", () => {
  beforeAll(() => mermaid.initialize({ startOnLoad: false }));

  it.each(blocks.length ? blocks : [{ name: "(no diagrams yet)", source: "" }])("$name", async ({ source }) => {
    if (source) await expect(mermaid.parse(source)).resolves.toBeTruthy();
  });
});
