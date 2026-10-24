# Contributing

Thanks for helping. Most contributions are new questions. Each question is one Markdown file in [`questions/`](questions/), and you don't need to touch any code.

## Add a question

### 1. Set up

You need Node 20.19+ (Node 22 recommended).

```sh
git clone <your fork>
cd system-design-mock
npm install
git checkout -b add-url-shortener
```

### 2. Create the file

```sh
cp questions/_template.md questions/url-shortener.md
```

The file name is the question's id. It appears in links (`#/q/url-shortener`), so use lowercase kebab-case and don't rename it after it's merged. Files starting with `_` are ignored.

### 3. Fill it in

Use the format below.

### 4. Check and preview

```sh
npm run check:questions   # validates every file in questions/
npm run dev               # opens the site at http://localhost:5173 and reloads on save
```

### 5. Open a pull request

CI runs the same checks, and the PR template has a short checklist.

## File format

```markdown
---
title: Design a URL shortener
tags: [storage, caching]
difficulty: medium
order: 200
author: your-github-handle
---

## Statement

Design a service that turns long URLs into short links and redirects visitors
who open a short link to the original URL. Users can create custom aliases and
see click counts for their links.

## Interviewer answers

- ~100M new links/day; redirects are ~100× creations.
- Redirect latency < 50ms p99 worldwide.
- Links never expire unless the owner deletes them.
- Click counts may lag by a minute.
- Out of scope: user accounts and billing.

## Where interviewers probe

- Short ID generation without collisions across regions
- Read path caching and hot links
- Click counting at redirect volume
- Abuse: malicious links and spam
```

### Front matter

| Field | Required | Rules |
|---|---|---|
| `title` | yes | Up to 80 characters. Name the system, e.g. "Webhook delivery". |
| `tags` | yes | 1–4 lowercase tags in `[a, b]` form. Reuse existing tags where you can (see below). |
| `difficulty` | yes | `easy`, `medium` or `hard`. |
| `order` | no | Integer position in the bank; lower comes first. Without it, the question sorts by title after the ordered ones. |
| `author` | no | Your name or GitHub handle; shown on the practice page. |

Lines starting with `#` inside the front matter are comments.

### Sections

All three sections are required, with exactly these headings, in any order:

| Section | What goes in it | Shown as |
|---|---|---|
| `## Statement` | 1–2 short paragraphs (80–1200 chars): the product, who uses it, what to design. | The problem statement |
| `## Interviewer answers` | 3+ bullets: what an interviewer says when asked clarifying questions. | A hidden panel the candidate opens after writing their own questions |
| `## Where interviewers probe` | 3+ bullets: the hard parts an interviewer would push on. | A hidden panel used for the deep dives |

Bullets start with `-` or `*`, and each one must be at most 240 characters. A bullet can wrap onto indented lines. Text is plain: Markdown formatting inside sections is shown as-is.

### Existing tags

Check what's already in use before inventing a tag:

```sh
grep -h '^tags:' questions/*.md | sort | uniq -c
```

## Writing a good question

- **Describe the product, not the solution.** "Users upload files and ask questions about them" is good. "Build a RAG pipeline with a vector DB" gives the answer away.
- **Keep numbers out of the statement.** Scale, latency targets and consistency needs go in **Interviewer answers**, so candidates practice asking for them.
- **Make interviewer answers concrete and decisive.** Use numbers ("~50K requests/s peak", "p99 < 200ms"), state correctness needs ("no event may be lost or counted twice"), and say what's out of scope.
- **Make probes specific.** "Hot partitions when one tenant is 30% of traffic" is more useful than "scalability".
- **Size it for 50 minutes.** If the question needs three separate systems, narrow it.
- **Keep it shareable.** Don't copy questions verbatim from interviews covered by an NDA. Paraphrase in your own words, or write an original.

## When the check fails

`npm run check:questions` lists every problem with its file name:

```
✗ 2 problem(s) in the question bank:
  - questions/url-shortener.md: tag "Caching" must be lowercase, max 24 chars
  - questions/url-shortener.md: missing section "## Where interviewers probe"
```

`npm run dev` and `npm run build` also refuse to run with an invalid question and show the same messages.

## Change the app

The app is React 19 + TypeScript (strict) + Vite. See [README.md](README.md#architecture) for how it fits together.

- Run `npm run check` before opening a PR. It covers questions, types, lint and tests.
- Keep logic that doesn't need React in plain TypeScript modules with unit tests, the way `src/timer/PhaseTimer.ts` and `src/lib/markdown.ts` work.
- The site must stay fully static: no server, and no runtime network calls besides fonts.
- For larger changes, open an issue first to discuss the approach.
