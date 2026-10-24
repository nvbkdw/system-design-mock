// The diagram model saved with each question. Independent of React Flow so it
// can be serialized, tested and exported without loading the canvas.

export type NodeShape = "service" | "database" | "queue" | "cache" | "client" | "external";
export type EdgeStyle = "sync" | "async";

export interface DiagramNode {
  id: string;
  shape: NodeShape;
  label: string;
  x: number;
  y: number;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  /** Which side of the box the arrow attaches to ("t", "r", "b", "l"). */
  sourceHandle?: string;
  targetHandle?: string;
  label: string;
  style: EdgeStyle;
}

export interface Diagram {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export const emptyDiagram = (): Diagram => ({ nodes: [], edges: [] });

export const SHAPES: Record<NodeShape, { label: string; hint: string; mermaid: [open: string, close: string] }> = {
  service: { label: "Service", hint: "API, worker, gateway", mermaid: ["[", "]"] },
  database: { label: "Database", hint: "SQL, KV, object store", mermaid: ["[(", ")]"] },
  queue: { label: "Queue", hint: "Kafka, SQS, stream", mermaid: ["{{", "}}"] },
  cache: { label: "Cache", hint: "Redis, CDN", mermaid: ["([", "])"] },
  client: { label: "Client", hint: "User, browser, app", mermaid: ["((", "))"] },
  external: { label: "External", hint: "Third-party system", mermaid: ["[[", "]]"] },
};

export const SHAPE_ORDER = Object.keys(SHAPES) as NodeShape[];

export const EDGE_STYLES: Record<EdgeStyle, { label: string; mermaid: string }> = {
  sync: { label: "Request", mermaid: "-->" },
  async: { label: "Async", mermaid: "-.->" },
};

/** Coerces saved data into a valid diagram, dropping anything malformed. */
export function normalizeDiagram(value: unknown): Diagram {
  const raw = (value ?? {}) as Partial<Diagram>;
  const nodes = (Array.isArray(raw.nodes) ? raw.nodes : []).filter(
    (n): n is DiagramNode => !!n && typeof n.id === "string" && n.shape in SHAPES && Number.isFinite(n.x) && Number.isFinite(n.y),
  );
  const ids = new Set(nodes.map((n) => n.id));
  const edges = (Array.isArray(raw.edges) ? raw.edges : []).filter(
    (e): e is DiagramEdge => !!e && typeof e.id === "string" && ids.has(e.source) && ids.has(e.target),
  );
  return {
    nodes: nodes.map((n) => ({ ...n, label: String(n.label ?? "") })),
    edges: edges.map((e) => ({ ...e, label: String(e.label ?? ""), style: e.style === "async" ? "async" : "sync" })),
  };
}
