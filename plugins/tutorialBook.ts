// Vite plugin exposing tutorials/*.md as `virtual:tutorial-book`: the chapters
// in book order, each with its body rendered to HTML. Only the lazy tutorial
// page imports it, so other pages don't carry the text. Invalid chapters fail
// the build (and show the error overlay in dev).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Marked } from "marked";
import type { Plugin } from "vite";
import { parseTutorialBook, slugify, type BookResult } from "../src/content/tutorialFormat";
import type { Chapter, ChapterSection, RenderedChapter } from "../src/content/types";

const MODULE_ID = "virtual:tutorial-book";
const RESOLVED_ID = "\0" + MODULE_ID;

export const TUTORIALS_DIR = path.resolve(import.meta.dirname, "..", "tutorials");

export function loadTutorialBook(dir = TUTORIALS_DIR): BookResult {
  const files: Record<string, string> = {};
  for (const file of readdirSync(dir)) {
    if (file.endsWith(".md")) files[file] = readFileSync(path.join(dir, file), "utf8");
  }
  return parseTutorialBook(files);
}

/** Renders a chapter body, giving every heading an id and collecting the ## headings as sections. */
export function renderChapter(chapter: Chapter): RenderedChapter {
  const taken = new Set<string>();
  const sections: ChapterSection[] = [];
  const marked = new Marked({
    renderer: {
      heading({ tokens, depth, text }) {
        const id = slugify(text, taken);
        const inner = this.parser.parseInline(tokens);
        if (depth === 2) sections.push({ id, title: inner.replace(/<[^>]+>/g, "") });
        return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
      },
    },
  });
  const html = marked.parse(chapter.markdown, { async: false });
  return { ...chapter, html, sections };
}

/** Loads and renders the book; throws with every problem listed if it is invalid. */
export function loadRenderedBook(): RenderedChapter[] {
  const { chapters, errors } = loadTutorialBook();
  if (errors.length) throw new Error("Invalid tutorials:\n" + errors.map((e) => "  - " + e).join("\n"));
  return chapters.map(renderChapter);
}

export function tutorialBook(): Plugin {
  let serving = false;
  return {
    name: "tutorial-book",
    configResolved(config) {
      serving = config.command === "serve";
    },
    resolveId: (id) => (id === MODULE_ID ? RESOLVED_ID : undefined),
    load(id) {
      if (id !== RESOLVED_ID) return;
      // See questionBank.ts: the dev server watches the folder instead.
      if (!serving) {
        for (const file of readdirSync(TUTORIALS_DIR)) {
          if (file.endsWith(".md")) this.addWatchFile(path.join(TUTORIALS_DIR, file));
        }
      }
      try {
        return "export default " + JSON.stringify(loadRenderedBook()) + ";";
      } catch (error) {
        this.error((error as Error).message);
      }
    },
    configureServer(server) {
      server.watcher.add(TUTORIALS_DIR);
      const refresh = (file: string) => {
        if (!file.startsWith(TUTORIALS_DIR)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", refresh);
      server.watcher.on("unlink", refresh);
      server.watcher.on("change", refresh);
    },
  };
}
