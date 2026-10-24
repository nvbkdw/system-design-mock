// Interview phases and self-review rubric, from Interview_Playbook.md.
// Budgets add up to the 50 minutes of design time in a 60-minute interview.
import type { Phase, RubricItem } from "./types";

const bullets = (...items: string[]) => "<ul>" + items.map((i) => `<li><p>${i}</p></li>`).join("") + "</ul>";
const steps = (...items: string[]) => "<ol>" + items.map((i) => `<li><p>${i}</p></li>`).join("") + "</ol>";

export const PHASES: readonly Phase[] = [
  {
    id: "requirements",
    title: "Requirements & scope",
    short: "Requirements",
    minutes: 7,
    goal: "Narrow the scope and write the non-functional requirements as numbers.",
    prompts: [
      "Users & scale: how many, read- vs write-heavy, global or single region?",
      "Core operations: 3–5 must-haves, and say what you are leaving out.",
      "Latency & freshness: p99 target? Can reads be seconds stale?",
      "Correctness: is losing or duplicating an event acceptable?",
      "Constraints: cost, existing infrastructure, compliance, multi-tenancy.",
    ],
    placeholder: "Clarifying questions, functional requirements, non-goals, NFRs as numbers…",
    outline:
      "<h3>Clarifying questions</h3>" + bullets("") +
      "<h3>Functional requirements</h3>" + bullets("") +
      "<h3>Out of scope</h3>" + bullets("") +
      "<h3>Non-functional requirements</h3>" +
      bullets("Scale: ", "Latency (p99): ", "Availability: ", "Consistency / durability: "),
  },
  {
    id: "estimation",
    title: "Estimation",
    short: "Estimation",
    minutes: 3,
    goal: "Find the number that drives the design and name the first bottleneck.",
    prompts: [
      "DAU × actions/day ÷ 10⁵ = avg QPS; × 2–3 for peak; split reads and writes.",
      "Storage per year × 3 replication; bandwidth = QPS × payload size.",
      "Concurrency with Little's Law: L = λ × W.",
      "Say which resource saturates first, and what you will not need yet.",
    ],
    placeholder: "Back-of-envelope numbers, then: “so the bottleneck is …”",
    outline:
      bullets("Avg / peak QPS: ", "Read : write: ", "Storage / year: ", "Bandwidth: ", "Concurrency (L = λW): ") +
      "<h3>Bottleneck</h3><p></p><h3>Not needed yet</h3><p></p>",
  },
  {
    id: "api",
    title: "API & data model",
    short: "API & data",
    minutes: 5,
    goal: "Write concrete endpoints and entities, and pick stores from access patterns.",
    prompts: [
      "3–5 endpoints with request and response shapes.",
      "Idempotency keys, cursor pagination, versioning, auth.",
      "Core entities with primary key and partition key.",
      "Access patterns → store choice (and why not the alternative).",
    ],
    placeholder: "POST /v1/… {…} → 202 {…}; entities, keys, stores…",
    outline:
      "<h3>API</h3><pre><code>POST /v1/resource  {idempotency_key, …} → 202 {id}\nGET  /v1/resource/{id} → 200 {…}</code></pre>" +
      "<h3>Data model</h3>" + bullets("Entity — PK: , partition key: , store: ") +
      "<h3>Access patterns</h3>" + bullets(""),
  },
  {
    id: "architecture",
    title: "High-level architecture",
    short: "Architecture",
    minutes: 10,
    goal: "Start with the simplest design that works and trace a request end to end.",
    prompts: [
      "Say “this is v1; next I'll find where it breaks.”",
      "Trace client → gateway → service → store → response.",
      "Separate the write path and the read path if they differ.",
      "Give every component a one-line responsibility.",
    ],
    placeholder: "Components, request flow, read path vs write path…",
    outline:
      "<h3>Components</h3>" + bullets("Name — responsibility") +
      "<h3>Write path</h3>" + steps("") +
      "<h3>Read path</h3>" + steps(""),
  },
  {
    id: "deep-dives",
    title: "Deep dives",
    short: "Deep dives",
    minutes: 20,
    goal: "Go deep on the 2–3 hardest parts, with alternatives and a reasoned choice.",
    prompts: [
      "Pick the hard parts yourself and ask which to start with.",
      "Problem → 2–3 options → trade-off → pick → what would change your mind.",
      "Get concrete: schemas, keys, retry semantics, numbers.",
      "Treat interviewer hints as signals and follow them.",
    ],
    placeholder: "Problem → options → trade-off → decision → what would flip it…",
    outline: [1, 2]
      .map(
        (n) =>
          `<h3>Deep dive ${n}: </h3>` +
          bullets("Problem: ", "Options: ", "Trade-off: ", "Decision: ", "Would change if: "),
      )
      .join(""),
  },
  {
    id: "failures",
    title: "Failures, ops & evolution",
    short: "Failures & ops",
    minutes: 5,
    goal: "Walk each component: what if it dies, slows down, or is overloaded?",
    prompts: [
      "Crash, slow, overload, retries (idempotent?), partial failure, hot spots.",
      "Dependency outage: fail open or fail closed, and why.",
      "Bad deploy and region loss: RTO/RPO, what users see.",
      "Name the degraded mode. Metrics, SLOs, alerts. What changes at 10×.",
    ],
    placeholder: "Failure modes, degraded mode, observability, growth…",
    outline:
      "<h3>Failure modes</h3>" + bullets("Component — failure → behavior → mitigation") +
      "<h3>Degraded mode</h3><p></p>" +
      "<h3>Observability</h3>" + bullets("") +
      "<h3>At 10×</h3><p></p>",
  },
];

export const TOTAL_MINUTES = PHASES.reduce((sum, p) => sum + p.minutes, 0);

export const RUBRIC: readonly RubricItem[] = [
  { id: "nfr", text: "Clarified requirements and wrote NFRs as numbers" },
  { id: "bottleneck", text: "Named the number that drives the design and the first bottleneck" },
  { id: "api", text: "Wrote concrete API signatures (idempotency, pagination)" },
  { id: "stores", text: "Chose stores from access patterns, with partition keys" },
  { id: "deep", text: "Went deep on 2–3 hard parts with alternatives and reasons" },
  { id: "failures", text: "Raised 3+ failure modes before being asked" },
  { id: "degrade", text: "Described a degraded mode" },
  { id: "ops", text: "Covered observability and SLOs" },
  { id: "growth", text: "Explained what changes at 10×" },
  { id: "time", text: "Kept to the time budget in every phase" },
];
