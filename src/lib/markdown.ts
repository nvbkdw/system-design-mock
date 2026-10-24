// Builds the Markdown export: question, timing, one section per phase, self-review.
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import type { Phase, Question, RubricItem } from "../content/types";
import { toMermaid } from "../diagram/mermaid";
import type { AnswerRecord, Timing } from "./storage";
import { formatClock, localDate, wholeSeconds } from "./time";

let service: TurndownService | null = null;

function turndown(): TurndownService {
  if (service) return service;
  service = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-", emDelimiter: "*" });
  service.use(gfm);
  // "- item" instead of Turndown's default "-   item".
  service.addRule("compactListItem", {
    filter: "li",
    replacement: (content, node, options) => {
      const parent = node.parentNode as HTMLElement;
      let prefix = options.bulletListMarker + " ";
      if (parent.nodeName === "OL") {
        const start = Number(parent.getAttribute("start") || 1);
        prefix = `${start + Array.prototype.indexOf.call(parent.children, node)}. `;
      }
      // TipTap wraps item text in <p>; collapse the resulting blank lines so lists stay tight.
      const indent = " ".repeat(prefix.length);
      const body = content.trim().replace(/\n{2,}/g, "\n").replace(/\n/g, "\n" + indent);
      return prefix + body + (node.nextSibling ? "\n" : "");
    },
  });
  return service;
}

export function htmlToMarkdown(html: string | undefined): string {
  if (!html) return "";
  return turndown().turndown(html).trim();
}

export interface ExportInput {
  question: Question;
  title: string;
  statement: string;
  record: AnswerRecord;
  timing: Timing;
  phases: readonly Phase[];
  rubric: readonly RubricItem[];
  now?: Date;
}

export function toMarkdown({ title, statement, record, timing, phases, rubric, now = new Date() }: ExportInput): string {
  const timed = Object.values(timing.used).some((ms) => ms > 0);
  const budgetOf = (p: Phase) => p.minutes * 60000 + (timing.extra[p.id] ?? 0);
  const totalUsed = phases.reduce((sum, p) => sum + (timing.used[p.id] ?? 0), 0);
  const totalBudget = phases.reduce((sum, p) => sum + p.minutes * 60000, 0);
  const lines: string[] = [];

  lines.push(`# ${title}`, "");
  lines.push(
    `*Exported ${localDate(now)} · ${timed ? `Timed: ${formatClock(totalUsed)} of ${formatClock(totalBudget)}` : "Untimed practice"}*`,
    "",
  );
  lines.push("## Problem", "", statement || "*(no problem statement)*", "");

  if (timed) {
    lines.push("## Timing", "", "| Phase | Budget | Used | Over / under |", "|---|---|---|---|");
    for (const phase of phases) {
      const used = wholeSeconds(timing.used[phase.id] ?? 0);
      const delta = used - budgetOf(phase);
      const signed = (delta > 0 ? "+" : "-") + formatClock(Math.abs(delta));
      lines.push(`| ${phase.title} | ${formatClock(budgetOf(phase))} | ${formatClock(used)} | ${signed} |`);
    }
    lines.push("");
  }

  if (record.diagram.nodes.length) {
    lines.push("## Diagram", "", "```mermaid", toMermaid(record.diagram), "```", "");
  }

  phases.forEach((phase, i) => {
    lines.push(`## ${i + 1}. ${phase.title}`, "");
    if (timed) lines.push(`*Budget ${phase.minutes} min · used ${formatClock(timing.used[phase.id] ?? 0)}*`, "");
    lines.push(htmlToMarkdown(record.answers[phase.id]) || "*(no answer)*", "");
  });

  lines.push("## Self-review", "");
  for (const item of rubric) lines.push(`- [${record.rubric[item.id] ? "x" : " "}] ${item.text}`);
  lines.push("");
  return lines.join("\n");
}

export function exportFilename(slugSource: string, now = new Date()): string {
  const slug = slugSource.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "answer";
  return `sysdesign-${slug}-${localDate(now)}.md`;
}
