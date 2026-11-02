// Serializes diagrams to Mermaid. The canvas becomes a flowchart using the
// classic shape syntax (A[(db)], A{{queue}}, …) so GitHub and older Mermaid
// versions render it; sequence diagrams are already Mermaid source.
import { isWritten, sequenceTitle, type SequenceDiagram } from "./sequence";
import { EDGE_STYLES, SHAPES, type Diagram } from "./types";

/** Escapes text for a quoted Mermaid label. */
export function escapeLabel(text: string): string {
  return text
    .trim()
    .replace(/"/g, "#quot;")
    .replace(/</g, "#lt;")
    .replace(/>/g, "#gt;")
    .replace(/\|/g, "#124;")
    .replace(/\r?\n/g, "<br/>");
}

/** Label plus an optional note as a second line. */
function withNoteLine(label: string, note: string | undefined): string {
  const line = escapeLabel(note ?? "");
  return label && line ? `${label}<br/>${line}` : label || line;
}

// Text boxes are annotations, not components: no fill, dashed outline.
const TEXT_CLASS = "  classDef note fill:none,stroke-dasharray:4 3";

export function toMermaid(diagram: Diagram, direction: "LR" | "TD" = "LR"): string {
  // Short generated ids keep the output readable and avoid reserved words like "end".
  const ids = new Map(diagram.nodes.map((node, i) => [node.id, `n${i + 1}`]));
  const lines = [`flowchart ${direction}`];

  for (const node of diagram.nodes) {
    const [open, close] = SHAPES[node.shape].mermaid;
    const label = withNoteLine(escapeLabel(node.label) || SHAPES[node.shape].label, node.note);
    lines.push(`  ${ids.get(node.id)}${open}"${label}"${close}${node.shape === "text" ? ":::note" : ""}`);
  }
  for (const edge of diagram.edges) {
    const source = ids.get(edge.source);
    const target = ids.get(edge.target);
    if (!source || !target) continue;
    const arrow = EDGE_STYLES[edge.style].mermaid;
    const label = withNoteLine(escapeLabel(edge.label), edge.note);
    lines.push(`  ${source} ${arrow}${label ? `|"${label}"|` : ""} ${target}`);
  }
  if (diagram.nodes.some((n) => n.shape === "text")) lines.push(TEXT_CLASS);
  return lines.join("\n");
}

export interface MermaidBlock {
  title: string;
  code: string;
}

/** Every diagram of a question as Mermaid, in export order: the canvas, then each sequence. */
export function mermaidBlocks(diagram: Diagram, sequences: readonly SequenceDiagram[]): MermaidBlock[] {
  const blocks: MermaidBlock[] = [];
  if (diagram.nodes.length) blocks.push({ title: "Architecture", code: toMermaid(diagram) });
  sequences.forEach((s, i) => isWritten(s) && blocks.push({ title: sequenceTitle(s, i), code: s.code.trim() }));
  return blocks;
}

/** Blocks as Markdown: a heading and a fenced Mermaid block each. */
export const fencedBlocks = (blocks: readonly MermaidBlock[]) =>
  blocks.map(({ title, code }) => `### ${title}\n\n\`\`\`mermaid\n${code}\n\`\`\``).join("\n\n");
