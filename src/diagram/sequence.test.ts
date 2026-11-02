import { describe, expect, it } from "vitest";
import { emptyRecord, hasAnyDiagram } from "../lib/storage";
import { mermaidBlocks } from "./mermaid";
import { newSequence, normalizeSequences, SEQUENCE_TEMPLATE } from "./sequence";
import { emptyDiagram } from "./types";

describe("sequence diagrams", () => {
  it("starts new sequences from the template with a numbered title", () => {
    const s = newSequence(1);
    expect(s).toMatchObject({ title: "Flow 2", code: SEQUENCE_TEMPLATE });
    expect(SEQUENCE_TEMPLATE.startsWith("sequenceDiagram\n")).toBe(true);
  });

  it("exports written sequences after the canvas, falling back to a numbered title", () => {
    const blocks = mermaidBlocks(emptyDiagram(), [
      { id: "a", title: "", code: "sequenceDiagram\n  A ->> B: x" },
      { id: "b", title: "Read path", code: "" },
      { id: "c", title: "  Read path ", code: "sequenceDiagram\n  B -->> A: y\n" },
    ]);
    expect(blocks).toEqual([
      { title: "Flow 1", code: "sequenceDiagram\n  A ->> B: x" },
      { title: "Read path", code: "sequenceDiagram\n  B -->> A: y" },
    ]);
  });

  it("normalizes saved data, dropping malformed entries", () => {
    expect(normalizeSequences(undefined)).toEqual([]);
    expect(normalizeSequences([null, { id: "a", code: "x" }, { id: 1, code: "y" }, { id: "b", title: "T", code: "z", extra: 1 }])).toEqual([
      { id: "a", title: "", code: "x" },
      { id: "b", title: "T", code: "z" },
    ]);
  });

  it("counts a written sequence as diagram work", () => {
    const record = emptyRecord();
    expect(hasAnyDiagram(record)).toBe(false);
    record.sequences = [{ id: "a", title: "", code: " " }];
    expect(hasAnyDiagram(record)).toBe(false);
    record.sequences = [{ id: "a", title: "", code: "sequenceDiagram" }];
    expect(hasAnyDiagram(record)).toBe(true);
  });
});
