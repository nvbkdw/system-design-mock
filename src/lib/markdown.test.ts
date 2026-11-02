// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { FEEDBACK_PROMPT } from "../content/feedbackPrompt";
import { PHASES } from "../content/phases";
import type { Question } from "../content/types";
import { emptyRecord } from "./storage";
import { exportFilename, htmlToMarkdown, toMarkdown } from "./markdown";

describe("htmlToMarkdown", () => {
  it("converts editor HTML to compact Markdown", () => {
    const html =
      "<h3>Functional</h3><ul><li><p>RPM &amp; <strong>TPM</strong></p><ul><li><p>nested</p></li></ul></li><li><p><code>cap</code></p></li></ul>" +
      "<ol><li><p>one</p></li><li><p>two</p></li></ol><pre><code>POST /v1/check\nGET /v1/limits</code></pre><blockquote><p>quote</p></blockquote>";
    expect(htmlToMarkdown(html)).toBe(
      [
        "### Functional",
        "",
        "- RPM & **TPM**",
        "  - nested",
        "- `cap`",
        "",
        "1. one",
        "2. two",
        "",
        "```",
        "POST /v1/check",
        "GET /v1/limits",
        "```",
        "",
        "> quote",
      ].join("\n"),
    );
  });
});

describe("toMarkdown", () => {
  const question: Question = {
    id: "q", title: "Rate limits", tags: ["x"], difficulty: "medium", statement: "Design it.", summary: "Design it.", clarify: [], probes: [],
  };

  it("includes the problem, every phase and timing, but not the self-review", () => {
    const record = emptyRecord();
    record.answers.requirements = "<p>Hello</p>";
    record.rubric.nfr = true; // ticked on the page, but not exported
    const timing = { ...record.timing, used: { requirements: 7.5 * 60_000 } };
    const md = toMarkdown({
      question, statement: question.statement, record, timing,
      phases: PHASES,
    });
    expect(md).toContain("# System Design Problem Statement\n\nDesign it.\n");
    expect(md).toContain("| Requirements & scope | 07:00 | 07:30 | +00:30 |");
    expect(md).toContain("## 1. Requirements & scope\n\n*Budget 7 min · used 07:30*\n\nHello");
    expect(md).toContain("## 6. Failures, ops & evolution");
    expect(md).toContain("*(no answer)*");
    expect(md).not.toContain("Self-review");
    expect(md).not.toContain("Clarified requirements");
  });

  it("exports each diagram as a fenced Mermaid block before the phases", () => {
    const record = emptyRecord();
    record.diagram = {
      nodes: [
        { id: "a", shape: "service", label: "API", x: 0, y: 0 },
        { id: "b", shape: "database", label: "DB", x: 0, y: 0 },
      ],
      edges: [{ id: "e", source: "a", target: "b", label: "", style: "sync" }],
    };
    record.sequences = [
      { id: "s1", title: "Write path", code: "sequenceDiagram\n  A ->> B: hi\n" },
      { id: "s2", title: "Blank", code: "  " },
    ];
    const md = toMarkdown({ question, statement: "S", record, timing: record.timing, phases: PHASES });
    expect(md).toContain(
      '## Diagrams\n\n### Architecture\n\n```mermaid\nflowchart LR\n  n1["API"]\n  n2[("DB")]\n  n1 --> n2\n```\n\n' +
        "### Write path\n\n```mermaid\nsequenceDiagram\n  A ->> B: hi\n```\n\n## 1. Requirements",
    );
    expect(md).not.toContain("### Blank");
  });

  it("omits the diagram section when nothing is drawn", () => {
    const record = emptyRecord();
    const md = toMarkdown({ question, statement: "S", record, timing: record.timing, phases: PHASES });
    expect(md).not.toContain("## Diagrams");
  });

  it("starts with the feedback prompt as instructions, then the problem", () => {
    const record = emptyRecord();
    const md = toMarkdown({ question, statement: "S", record, timing: record.timing, phases: PHASES });
    expect(md.startsWith(FEEDBACK_PROMPT + "\n\n# System Design Problem Statement\n\nS\n")).toBe(true);
    expect(md).toContain("\nS\n\n# My Design Solution (break down into 6 progressive phases):\n\n## 1. Requirements & scope\n");
    expect(md).not.toContain("Exported");
    expect(md.split(FEEDBACK_PROMPT)).toHaveLength(2);
    expect(md).not.toContain("## Feedback request");
  });

  it("omits timing for untimed practice", () => {
    const record = emptyRecord();
    const md = toMarkdown({ question, statement: "S", record, timing: record.timing, phases: PHASES });
    expect(md).not.toContain("## Timing");
    expect(md).not.toContain("*Budget");
  });
});

describe("exportFilename", () => {
  it("slugifies and dates the file name", () => {
    expect(exportFilename("Design a URL Shortener!", new Date(2026, 0, 2))).toBe("sysdesign-design-a-url-shortener-2026-01-02.md");
  });
});
