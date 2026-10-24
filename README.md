# System Design Interview Mock

A practice app for system design interviews. Pick a question from the bank, work through the six phases of a 60-minute interview, write your answer for each phase in a rich-text editor, and export everything as a Markdown file.

It's a static, client-side React app. It runs entirely in the browser, deploys to GitHub Pages, and saves answers in `localStorage`. Nothing is sent to a server.

## Features

- **Question bank** home page, with filters for topic, difficulty and progress, plus search.
- **Practice page** for each question, split into six phases with time budgets that add up to 50 minutes of design time:

  | # | Phase | Budget |
  |---|---|---|
  | 1 | Requirements & scope | 7 min |
  | 2 | Estimation | 3 min |
  | 3 | API & data model | 5 min |
  | 4 | High-level architecture | 10 min |
  | 5 | Deep dives | 20 min |
  | 6 | Failures, ops & evolution | 5 min |

  Each phase has a checklist, an "Insert outline" starter and a rich-text editor (TipTap). The editor accepts Markdown shortcuts: `- `, `1. `, `### `, `> `, ```` ``` ````, `**bold**` and `` `code` ``.
- **Diagram panel:** one box-and-arrow diagram per question, shared by all phases.
  - On wide screens it docks next to your answers so you can draw while you write; there's also a full-screen mode.
  - Shapes: service, database, queue, cache, client and external system. Arrows can have labels and be marked request or async.
  - The Mermaid tab shows the generated `flowchart`, and the export includes it as a fenced `mermaid` block.
  - Built on React Flow, which loads only when you open the panel.
- **Timed mode:** a countdown for each phase and a total clock. You get a warning at one minute left and a prompt to move on when time is up (or take 2 more minutes). Optional beeps, a progress timeline and a budget-vs-actual table are included.
- **Interviewer answers** and **probe areas** for each question, hidden until you open them.
- **Self-review checklist** based on what interviewers score.
- **Markdown export** with the question, timing, the diagram (as Mermaid), one section per phase and the self-review. You can preview, copy or download it.
- **Your own question:** paste any prompt and practice it the same way.

## Getting started

Requires Node 20.19+; Node 24 is recommended and is what CI uses (see `.nvmrc`).

```sh
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload, including the question files |
| `npm run build` | Type-check and build the static site into `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run check` | Validate questions, type-check, lint and run tests (what CI runs) |
| `npm run check:questions` | Validate `questions/*.md` only |
| `npm test` | Unit tests (Vitest) |

## Deploy to GitHub Pages

`.github/workflows/pages.yml` runs `npm run check` and a build on every PR and every push to `main`. On `main` it also deploys `dist/` to Pages.

One-time setup:
1. Push the repo to GitHub.
2. Go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Push to `main`. The site is published at `https://<user>.github.io/<repo>/`.

No base-path configuration is needed:
- Every route is a real file. The build writes `index.html` for home and `q/<id>/index.html` for each question, so GitHub Pages serves refreshes and shared links directly.
- Assets use relative URLs (`base: "./"`), and each page's `<base>` tag points at the site root, so they resolve at any page depth.
- On `main`, CI reads the site URL from `actions/configure-pages` and passes it to the build as `SITE_URL`.
- `public/.nojekyll` turns off Jekyll processing.

## SEO

Each page is generated with its own metadata, so search engines can index every question:

| Page | Metadata | Structured data (JSON-LD) |
|---|---|---|
| Home `/` | Title, description, canonical, Open Graph, Twitter card | `WebSite`, `WebApplication`, `HowTo` (the practice guide), `ItemList` of questions |
| Question `/q/<id>/` | Title, description from the statement, canonical, Open Graph (`article`) | `LearningResource` with the statement, difficulty, tags and the six timed phases, plus `BreadcrumbList` |
| Your own question, 404 | `noindex` | none |

- **Crawler-visible content:** each page's HTML also contains the question statement (or the question list on home) for crawlers that don't run JavaScript. React replaces it when the app loads.
- **Sitemap:** `sitemap.xml` lists home and every bank question.
- **robots.txt:** written to the site root and points at the sitemap. Crawlers only read `robots.txt` at the domain root (`https://<user>.github.io/robots.txt`), so for a project site, submit `sitemap.xml` in [Google Search Console](https://search.google.com/search-console) instead.

Build locally with the deployed URL to preview the absolute URLs:

```sh
SITE_URL=https://<user>.github.io/<repo>/ npm run build
```

## Adding questions

See [CONTRIBUTING.md](CONTRIBUTING.md). In short: copy `questions/_template.md` to `questions/<id>.md`, fill in the front matter and three sections, then run `npm run check:questions`.

## Architecture

```
questions/*.md                 Question bank source, one file per question
plugins/questionBank.ts        Vite plugin: questions/*.md → `virtual:question-bank` (fails the build on errors)
plugins/seoPages.ts            Vite plugin: per-route pages with metadata, sitemap.xml, robots.txt, 404.html
scripts/check-questions.ts     CLI validation for contributors and CI
src/
  main.tsx                     Router basename from <base>; redirects old #/q/<id> links
  app/App.tsx                  Path router (/q/<id>/); practice page is lazy-loaded
  content/
    types.ts                   Question, Phase, RubricItem
    questionFormat.ts          Parser + validator for the question format (pure, tested)
    questions.ts               Bank + the built-in "your own question" entry
    phases.ts                  Phase definitions, budgets, outlines, rubric
    site.ts, guide.ts          Site name and descriptions; "How to practice" steps
    seo.ts                     Page metadata, JSON-LD, sitemap, robots.txt (pure, tested)
    routes.ts                  URL paths for questions
  timer/
    PhaseTimer.ts              Framework-free timer state machine (tested)
    useTimerState.ts           Subscribes a component to timer ticks
  lib/
    storage.ts                 localStorage records and prefs (fails soft)
    markdown.ts                HTML → Markdown export via Turndown (tested)
    time.ts, sound.ts, download.ts, repo.ts, usePrefs.ts
  editor/RichEditor.tsx        TipTap editor with toolbar and outline insert
  diagram/
    types.ts                   Diagram model (boxes, arrows) saved with each question
    mermaid.ts                 Diagram → Mermaid flowchart, with label escaping (pure, tested)
    DiagramPanel.tsx           Panel shell, Mermaid view; lazy-loads the canvas
    DiagramCanvas.tsx          React Flow canvas: palette, connections, inspector
    BoxNode.tsx, flow.ts       Custom box shapes; model ↔ React Flow conversion
  home/                        Home page and question cards
  practice/
    PracticeSession.tsx        Owns the timer, record store, prompts and export
    RecordStore.ts             Answer state outside React; slice subscriptions
    TopBar, ProblemHeader, PhaseSection, SelfReview, ExportDialog
  ui/                          Small shared components (Switch, Toast, ArmedButton, PhaseStrip)
```

### Design decisions

- **Static, client-only.** There's no backend to run or pay for. State lives in `localStorage`, keyed by question id, and the export keeps a permanent copy.
- **Questions in Markdown, compiled at build time.** Contributors edit readable files and get precise validation errors. A Vite plugin bundles the files as JSON, so the browser never fetches or parses Markdown. The same parser runs in the plugin, the CLI and the tests.
- **Framework-free core logic.** The timer, the question parser and the export are plain TypeScript with unit tests. React components stay thin.
- **Timer derived from timestamps.** Elapsed time comes from `Date.now()` differences rather than counting ticks, so throttled background tabs stay accurate. Components subscribe through `useSyncExternalStore`, so only the clock-dependent parts re-render each tick.
- **Answers outside React state.** Editors are uncontrolled. `RecordStore` holds answers and notifies only the components whose slice changed, so typing doesn't re-render the page.
- **Path URLs backed by generated pages.** GitHub Pages has no rewrite rules, so every route is written as a real file at build time (`plugins/seoPages.ts`). That gives each question an indexable URL with its own metadata, without a server or a `404.html` redirect trick. Links from the earlier hash URLs (`#/q/<id>`) redirect to the new paths.
- **Code splitting.** The editor (ProseMirror) ships only with the practice page, which keeps the home page at about 90 KB gzipped. React Flow is a separate chunk of about 60 KB that loads when the diagram panel opens.
- **Diagram model separate from React Flow.** The saved diagram is plain data (`src/diagram/types.ts`). The Mermaid export, storage and tests never touch the canvas library, so it could be swapped later. Mermaid uses classic shape syntax (`[( )]`, `{{ }}`) and generated ids (`n1`, `n2`) so GitHub renders it. Box positions are saved in the browser, but they aren't in the Mermaid output because Mermaid lays out the graph itself.
