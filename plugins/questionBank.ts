// Vite plugin exposing questions/*.md as `virtual:question-bank`.
// Invalid questions fail the build (and show the error overlay in dev).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { parseQuestionBank, type BankResult } from "../src/content/questionFormat";

const MODULE_ID = "virtual:question-bank";
const RESOLVED_ID = "\0" + MODULE_ID;

export const QUESTIONS_DIR = path.resolve(import.meta.dirname, "..", "questions");

export function loadQuestionBank(dir = QUESTIONS_DIR): BankResult {
  const files: Record<string, string> = {};
  for (const file of readdirSync(dir)) {
    if (file.endsWith(".md")) files[file] = readFileSync(path.join(dir, file), "utf8");
  }
  return parseQuestionBank(files);
}

export function questionBank(): Plugin {
  let serving = false;
  return {
    name: "question-bank",
    configResolved(config) {
      serving = config.command === "serve";
    },
    resolveId: (id) => (id === MODULE_ID ? RESOLVED_ID : undefined),
    load(id) {
      if (id !== RESOLVED_ID) return;
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
      return "export default " + JSON.stringify(questions) + ";";
    },
    configureServer(server) {
      // New or deleted question files should refresh the bank in dev.
      server.watcher.add(QUESTIONS_DIR);
      const refresh = (file: string) => {
        if (!file.startsWith(QUESTIONS_DIR)) return;
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
