// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { PHASES, RUBRIC } from "../content/phases";
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
    id: "q", title: "Rate limits", tags: ["x"], difficulty: "medium", statement: "Design it.", clarify: [], probes: [],
  };

  it("includes the problem, every phase, timing and the self-review", () => {
    const record = emptyRecord();
    record.answers.requirements = "<p>Hello</p>";
    record.rubric.nfr = true;
    const timing = { ...record.timing, used: { requirements: 7.5 * 60_000 } };
    const md = toMarkdown({
      question, title: question.title, statement: question.statement, record, timing,
      phases: PHASES, rubric: RUBRIC, now: new Date(2026, 9, 24),
    });
    expect(md).toContain("# Rate limits");
    expect(md).toContain("*Exported 2026-10-24 · Timed: 07:30 of 50:00*");
    expect(md).toContain("| Requirements & scope | 07:00 | 07:30 | +00:30 |");
    expect(md).toContain("## 1. Requirements & scope\n\n*Budget 7 min · used 07:30*\n\nHello");
    expect(md).toContain("## 6. Failures, ops & evolution");
    expect(md).toContain("*(no answer)*");
    expect(md).toContain("- [x] Clarified requirements and wrote NFRs as numbers");
  });

  it("exports the diagram as a fenced Mermaid block before the phases", () => {
    const record = emptyRecord();
    record.diagram = {
      nodes: [
        { id: "a", shape: "service", label: "API", x: 0, y: 0 },
        { id: "b", shape: "database", label: "DB", x: 0, y: 0 },
      ],
      edges: [{ id: "e", source: "a", target: "b", label: "", style: "sync" }],
    };
    const md = toMarkdown({ question, title: "T", statement: "S", record, timing: record.timing, phases: PHASES, rubric: RUBRIC });
    expect(md).toContain('## Diagram\n\n```mermaid\nflowchart LR\n  n1["API"]\n  n2[("DB")]\n  n1 --> n2\n```');
    expect(md.indexOf("## Diagram")).toBeLessThan(md.indexOf("## 1. Requirements"));
  });

  it("omits the diagram section when nothing is drawn", () => {
    const record = emptyRecord();
    const md = toMarkdown({ question, title: "T", statement: "S", record, timing: record.timing, phases: PHASES, rubric: RUBRIC });
    expect(md).not.toContain("## Diagram");
  });

  it("omits timing for untimed practice", () => {
    const record = emptyRecord();
    const md = toMarkdown({ question, title: "T", statement: "S", record, timing: record.timing, phases: PHASES, rubric: RUBRIC });
    expect(md).toContain("Untimed practice");
    expect(md).not.toContain("## Timing");
  });
});

describe("exportFilename", () => {
  it("slugifies and dates the file name", () => {
    expect(exportFilename("Design a URL Shortener!", new Date(2026, 0, 2))).toBe("sysdesign-design-a-url-shortener-2026-01-02.md");
  });
});
