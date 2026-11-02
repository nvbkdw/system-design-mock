import { describe, expect, it } from "vitest";
import { escapeLabel, toMermaid } from "./mermaid";
import { normalizeDiagram, type Diagram } from "./types";

const diagram: Diagram = {
  nodes: [
    { id: "a", shape: "client", label: "Browser", x: 0, y: 0 },
    { id: "b", shape: "service", label: "API Gateway", x: 200, y: 0 },
    { id: "c", shape: "database", label: "Users DB", x: 400, y: 0 },
    { id: "d", shape: "queue", label: "", x: 400, y: 100 },
    { id: "e", shape: "cache", label: "Redis", x: 200, y: 100 },
    { id: "f", shape: "external", label: "Stripe", x: 0, y: 100 },
  ],
  edges: [
    { id: "1", source: "a", target: "b", label: "HTTPS", style: "sync" },
    { id: "2", source: "b", target: "c", label: "", style: "sync" },
    { id: "3", source: "b", target: "d", label: "usage event", style: "async" },
  ],
};

describe("toMermaid", () => {
  it("maps shapes and arrows to classic flowchart syntax", () => {
    expect(toMermaid(diagram)).toBe(
      [
        "flowchart LR",
        '  n1(("Browser"))',
        '  n2["API Gateway"]',
        '  n3[("Users DB")]',
        '  n4{{"Queue"}}',
        '  n5(["Redis"])',
        '  n6[["Stripe"]]',
        '  n1 -->|"HTTPS"| n2',
        "  n2 --> n3",
        '  n2 -.->|"usage event"| n4',
      ].join("\n"),
    );
  });

  it("exports notes as a second label line and text boxes with the note class", () => {
    const annotated: Diagram = {
      nodes: [
        { id: "a", shape: "service", label: "API", x: 0, y: 0 },
        { id: "b", shape: "database", label: "Users DB", note: "sharded by user_id", x: 0, y: 0 },
        { id: "t", shape: "text", label: "Reads hit\nthe cache first", x: 0, y: 0 },
      ],
      edges: [
        { id: "1", source: "a", target: "b", label: "writes", note: "p99 < 50ms", style: "sync" },
        { id: "2", source: "t", target: "a", label: "", note: "hot path", style: "async" },
      ],
    };
    expect(toMermaid(annotated)).toBe(
      [
        "flowchart LR",
        '  n1["API"]',
        '  n2[("Users DB<br/>sharded by user_id")]',
        '  n3["Reads hit<br/>the cache first"]:::note',
        '  n1 -->|"writes<br/>p99 #lt; 50ms"| n2',
        '  n3 -.->|"hot path"| n1',
        "  classDef note fill:none,stroke-dasharray:4 3",
      ].join("\n"),
    );
  });

  it("skips edges whose endpoints no longer exist", () => {
    const broken = { ...diagram, edges: [{ id: "x", source: "a", target: "missing", label: "", style: "sync" as const }] };
    expect(toMermaid(broken)).not.toContain("-->");
  });
});

describe("escapeLabel", () => {
  it("escapes characters that break Mermaid labels", () => {
    expect(escapeLabel(' say "hi" <b> a|b\nnext ')).toBe("say #quot;hi#quot; #lt;b#gt; a#124;b<br/>next");
  });
});

describe("normalizeDiagram", () => {
  it("drops malformed nodes and dangling edges", () => {
    const result = normalizeDiagram({
      nodes: [{ id: "a", shape: "service", label: "A", x: 0, y: 0 }, { id: "b", shape: "blob", x: 0, y: 0 }],
      edges: [{ id: "1", source: "a", target: "b", label: "", style: "sync" }],
    });
    expect(result.nodes.map((n) => n.id)).toEqual(["a"]);
    expect(result.edges).toEqual([]);
    expect(normalizeDiagram(undefined)).toEqual({ nodes: [], edges: [] });
  });

  it("keeps notes and text boxes, and drops empty or invalid notes", () => {
    const result = normalizeDiagram({
      nodes: [
        { id: "a", shape: "text", label: "Callout", x: 0, y: 0 },
        { id: "b", shape: "cache", label: "Redis", note: "TTL 5 min", x: 0, y: 0 },
        { id: "c", shape: "service", label: "API", note: "", x: 0, y: 0 },
      ],
      edges: [{ id: "1", source: "b", target: "c", label: "", note: 42, style: "sync" }],
    });
    expect(result.nodes.map((n) => n.shape)).toEqual(["text", "cache", "service"]);
    expect(result.nodes[1].note).toBe("TTL 5 min");
    expect(result.nodes[2]).not.toHaveProperty("note");
    expect(result.edges[0]).not.toHaveProperty("note");
  });
});
