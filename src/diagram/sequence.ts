// Sequence diagrams saved with each question. They are written as Mermaid
// source and exported verbatim, so the model is just named text.

export interface SequenceDiagram {
  id: string;
  /** Shown on the tab and as the export heading, e.g. "Write path". */
  title: string;
  /** Mermaid source, normally starting with "sequenceDiagram". */
  code: string;
}

/** A starting point that shows the common syntax. */
export const SEQUENCE_TEMPLATE = [
  "sequenceDiagram",
  "    autonumber",
  "    participant Client",
  "    participant API",
  "    participant DB",
  "",
  "    Client ->> API: POST /v1/items",
  "    API ->> DB: Insert item",
  "    DB -->> API: OK",
  "    API -->> Client: 201 Created",
].join("\n");

export const newSequence = (index: number): SequenceDiagram => ({
  id: `s-${Math.random().toString(36).slice(2, 9)}`,
  title: `Flow ${index + 1}`,
  code: SEQUENCE_TEMPLATE,
});

export const sequenceTitle = (s: SequenceDiagram, index: number) => s.title.trim() || `Flow ${index + 1}`;

/** Blank sequences are kept while editing but not exported. */
export const isWritten = (s: SequenceDiagram) => s.code.trim() !== "";

/** Coerces saved data into valid sequences, dropping anything malformed. */
export function normalizeSequences(value: unknown): SequenceDiagram[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is SequenceDiagram => !!s && typeof s.id === "string" && typeof s.code === "string")
    .map(({ id, title, code }) => ({ id, title: typeof title === "string" ? title : "", code }));
}
