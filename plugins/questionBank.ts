// Vite plugin exposing questions/*.md as two virtual modules:
//   `virtual:question-bank`        the questions, imported by every page
//   `virtual:question-statements`  id → statement HTML, imported only by the
//                                  lazy practice page so home doesn't carry it
// Invalid questions fail the build (and show the error overlay in dev).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { marked } from "marked";
import type { Plugin } from "vite";
import { parseQuestionBank, type BankResult } from "../src/content/questionFormat";

const BANK_ID = "virtual:question-bank";
const STATEMENTS_ID = "virtual:question-statements";
const RESOLVED = new Map([BANK_ID, STATEMENTS_ID].map((id) => ["\0" + id, id]));

export const QUESTIONS_DIR = path.resolve(import.meta.dirname, "..", "questions");

export function loadQuestionBank(dir = QUESTIONS_DIR): BankResult {
  const files: Record<string, string> = {};
  for (const file of readdirSync(dir)) {
    if (file.endsWith(".md")) files[file] = readFileSync(path.join(dir, file), "utf8");
  }
  return parseQuestionBank(files);
}

/** Statement Markdown → HTML. The parser has already rejected raw HTML. */
export const renderStatement = (markdown: string) => marked.parse(markdown, { async: false });

export function questionBank(): Plugin {
  let serving = false;
  return {
    name: "question-bank",
    configResolved(config) {
      serving = config.command === "serve";
    },
    resolveId: (id) => (id === BANK_ID || id === STATEMENTS_ID ? "\0" + id : undefined),
    load(id) {
      const module = RESOLVED.get(id);
      if (!module) return;
      // The dev server watches the folder in configureServer. There, watch files
      // become import-analysis dependencies, and a directory can't be resolved.
      // So register them only for `vite build --watch`, and only as files.
      if (!serving) {
        for (const file of readdirSync(QUESTIONS_DIR)) {
          if (file.endsWith(".md")) this.addWatchFile(path.join(QUESTIONS_DIR, file));
        }
      }
      const { questions, errors } = loadQuestionBank();
      if (errors.length) this.error("Invalid question bank:\n" + errors.map((e) => "  - " + e).join("\n"));
      if (module === BANK_ID) return "export default " + JSON.stringify(questions) + ";";
      const html = Object.fromEntries(questions.map((q) => [q.id, renderStatement(q.statement)]));
      return "export default " + JSON.stringify(html) + ";";
    },
    configureServer(server) {
      // New or deleted question files should refresh the bank in dev.
      server.watcher.add(QUESTIONS_DIR);
      const refresh = (file: string) => {
        if (!file.startsWith(QUESTIONS_DIR)) return;
        for (const resolved of RESOLVED.keys()) {
          const mod = server.moduleGraph.getModuleById(resolved);
          if (mod) server.moduleGraph.invalidateModule(mod);
        }
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", refresh);
      server.watcher.on("unlink", refresh);
      server.watcher.on("change", refresh);
    },
  };
}
