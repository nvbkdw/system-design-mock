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
});
