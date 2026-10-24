import { describe, expect, it } from "vitest";
import { loadQuestionBank } from "../../plugins/questionBank";
import { parseQuestion, parseQuestionBank } from "./questionFormat";

const VALID = `---
title: Design a URL shortener
tags: [storage, caching]
difficulty: medium
# comments are ignored
order: 5
---

## Statement

Design a service that turns long URLs into short links
and redirects visitors to the original URL.

Users can see click counts.

## Interviewer answers

- ~100M new links/day
- Redirect p99 < 50ms
  worldwide
- Out of scope: billing

## Where interviewers probe

- ID generation
- Hot links
* Click counting
`;

describe("parseQuestion", () => {
  it("parses front matter, paragraphs and bullet lists", () => {
    const result = parseQuestion("url-shortener", VALID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.question).toMatchObject({
      id: "url-shortener",
      title: "Design a URL shortener",
      tags: ["storage", "caching"],
      difficulty: "medium",
      order: 5,
      clarify: ["~100M new links/day", "Redirect p99 < 50ms worldwide", "Out of scope: billing"],
      probes: ["ID generation", "Hot links", "Click counting"],
    });
    expect(result.question.statement.split("\n\n")).toHaveLength(2);
  });

  it("reports every problem with a readable message", () => {
    const broken = VALID.replace("difficulty: medium", "difficulty: brutal")
      .replace("tags: [storage, caching]", "tags: [Storage]")
      .replace("## Where interviewers probe", "## Extras");
    const result = parseQuestion("Bad_Name", broken);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("kebab-case"),
        expect.stringContaining('tag "Storage"'),
        expect.stringContaining("difficulty must be one of"),
        expect.stringContaining('unknown section "## Extras"'),
        expect.stringContaining('missing section "## Where interviewers probe"'),
      ]),
    );
  });

  it("rejects files without front matter and unknown fields", () => {
    expect(parseQuestion("x", "## Statement").ok).toBe(false);
    const result = parseQuestion("url-shortener", VALID.replace("order: 5", "level: 5"));
    expect(result.ok).toBe(false);
  });
});

describe("parseQuestionBank", () => {
  it("skips templates and sorts by order, then title", () => {
    const later = VALID.replace("order: 5", "order: 9").replace("Design a URL shortener", "Another");
    const unordered = VALID.replace("order: 5\n", "").replace("Design a URL shortener", "Zeta");
    const { questions, errors } = parseQuestionBank({ "b.md": later, "a.md": VALID, "c.md": unordered, "_template.md": "junk" });
    expect(errors).toEqual([]);
    expect(questions.map((q) => q.id)).toEqual(["a", "b", "c"]);
  });
});

describe("questions/ directory", () => {
  it("contains only valid questions", () => {
    const { questions, errors } = loadQuestionBank();
    expect(errors).toEqual([]);
    expect(questions.length).toBeGreaterThan(0);
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
  });
});
