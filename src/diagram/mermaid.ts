// Serializes a diagram to a Mermaid flowchart. Uses the classic shape syntax
// (A[(db)], A{{queue}}, …) so GitHub and older Mermaid versions render it.
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

export function toMermaid(diagram: Diagram, direction: "LR" | "TD" = "LR"): string {
  // Short generated ids keep the output readable and avoid reserved words like "end".
  const ids = new Map(diagram.nodes.map((node, i) => [node.id, `n${i + 1}`]));
  const lines = [`flowchart ${direction}`];

  for (const node of diagram.nodes) {
    const [open, close] = SHAPES[node.shape].mermaid;
    const label = escapeLabel(node.label) || SHAPES[node.shape].label;
    lines.push(`  ${ids.get(node.id)}${open}"${label}"${close}`);
  }
  for (const edge of diagram.edges) {
    const source = ids.get(edge.source);
    const target = ids.get(edge.target);
    if (!source || !target) continue;
    const arrow = EDGE_STYLES[edge.style].mermaid;
    const label = escapeLabel(edge.label);
    lines.push(`  ${source} ${arrow}${label ? `|"${label}"|` : ""} ${target}`);
  }
  return lines.join("\n");
}
