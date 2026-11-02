---
title: The system design interview
summary: How the 60-minute interview runs, what the interviewer scores, the six phases of a strong answer, and a two-week plan to prepare.
---

A system design interview gives you an open-ended prompt ("design a webhook delivery system") and about an hour to design it out loud. There is no single right answer. **You are graded on your reasoning, not on the final diagram.** Two candidates can draw the same boxes and get opposite verdicts: the one who explained *why* each choice was made and *what breaks* gets the hire.

## What the interviewer scores

| They score | What they listen for | Red flag |
|---|---|---|
| Clarifying requirements | You narrow the scope and write numbers: QPS, data size, latency target | Drawing boxes in minute 3 |
| Practical choices | Real technology with a reason: "Postgres, because balance updates need transactions" | "NoSQL because it scales" |
| Explicit trade-offs | "A or B. I pick A because X; B wins if Y changes" | One option, presented as obvious |
| Depth | Schemas, keys, API shapes, partition keys, retry semantics | Staying at box-and-arrow level |
| Failure handling | You raise failure modes **before** being asked | Waiting for them to break it |
| Growth | "At 10× the bottleneck moves to Z; here is how it evolves" | Building for 1000× on day one |
| Staying current | Outbox, change data capture, cells, backpressure, token streaming | Only 2015-era vocabulary |

## The 60-minute clock

Introductions and your questions at the end take about 10 minutes, which leaves about **50 minutes for the design**. Split them into six phases:

| Phase | Time | What you produce |
|---|---|---|
| 1. Requirements & scope | 7 min | 3–5 core features, explicit non-goals, non-functional requirements as numbers |
| 2. Estimation | 3 min | Average and peak QPS, storage, bandwidth, and *the one number that drives the design* |
| 3. API & data model | 5 min | 3–5 endpoints with request and response; core entities and keys |
| 4. High-level architecture & Data flow | 10 min | The simplest design that works, traced end to end |
| 5. Deep dives | 20 min | 2–3 hard parts: the bottleneck, consistency, failure handling |
| 6. Failures, ops & evolution | 5 min | A failure sweep, observability, what changes at 10× |

**Narrate your checkpoints:** "I have the requirements; three minutes on estimates, then the API." Interviewers score pacing, and saying it out loud invites them to redirect you early.

## The six phases

### 1. Requirements & scope

The most underrated phase. Ask questions that **change the design**, not filler:

- **Users and scale:** how many? Read- or write-heavy? One region or global?
- **Core operations:** "The must-haves are X, Y and Z. I'm leaving out A and B unless you want them." Wait for a nod.
- **Latency and freshness:** what is the p99 target? Can reads be a few seconds stale?
- **Correctness:** is losing or duplicating an event acceptable? This decides idempotency, exactly-once processing and consistency.
- **Constraints:** cost, existing infrastructure, compliance, multi-tenancy.

Write the non-functional requirements as numbers, for example `p99 read < 200ms, 99.95% availability, durable writes, feeds may be eventually consistent`. Every later decision should point back to this list.

### 2. Estimation

Estimation is not arithmetic theater. It answers one question: **which resource saturates first, and at what scale?** That resource is your bottleneck, and it shapes the architecture. Round to powers of 10 and end every number with "so the design needs…".

The chain is always the same: users → daily active users → actions per day → average QPS → peak QPS → read/write split, then storage, bandwidth and concurrency from there.

| Quantity | Rule of thumb |
|---|---|
| Average QPS | daily actions ÷ 10⁵ (a day is about 86,400 seconds) |
| Peak QPS | 2–3× average for daily cycles; 5–10× for launches and events |
| Storage per year | writes/day × object size × 365 × 3 replicas |
| Cache | about 20% of the daily hot read set, and it must fit in RAM |
| Servers | peak QPS ÷ per-node QPS ÷ 0.5–0.7 target utilization, plus spares |
| Concurrency | **Little's Law: `L = λ × W`** (in-flight requests = arrival rate × time in system) |

Little's Law is the most underused formula in interviews. 10K requests/s × 50ms is 500 requests in flight, which a few servers handle. 1K LLM requests/s × 30s of streaming is 30K concurrent streams, where connections, GPU slots and memory become the problem, not QPS.

Say what the numbers mean: *"100M daily users × 20 writes is about 2K writes/s on average, 10K at peak, so one Postgres primary is enough and we don't need write sharding yet. Reads are 100× that, so caching is the real problem."*

### 3. API & data model

- Write real signatures: `POST /v1/jobs {idempotency_key, payload} → 202 {job_id}`.
- Mention **idempotency keys, cursor pagination, versioning and auth** in a sentence each. It is a cheap, strong seniority signal.
- For each core entity, give the primary key, the partition key and the access patterns. Choose the store from the access patterns, not from habit.

### 4. High-level architecture & Data flow

- Start with the **simplest design that works**, and say so: "This is v1. Next I'll find where it breaks."
- Walk one request end to end: client → load balancer or gateway → service → store → response. If the write path and the read path differ, draw them separately.
- Give every box a one-line responsibility. An unexplained box loses points.

### 5. Deep dives

This is where hire or no-hire is decided. Pick the 2–3 hardest parts yourself ("The interesting problems are X and Y. Shall I start with X?") and work through each with the same shape:

> **Problem → 2–3 options → trade-off → pick → what would change my mind**

For example, feed fan-out: push on write gives O(1) reads but write storms for celebrities; pull on read makes writes cheap and reads expensive. Pick a **hybrid**: push for most users, pull for accounts with more than 100K followers. Switch to pull if writes came to dominate.

Get concrete: schemas, keys, retry semantics, numbers. When the interviewer asks "what about…?", they are steering you. Follow the hint; don't defend.

### 6. Failures, ops & evolution

Walk your diagram box by box and ask: **if this dies, slows down or returns garbage, what happens?**

- **Crash:** is there a replica? Who detects it, and how fast? How much data is lost?
- **Slow** (worse than dead): timeouts, circuit breakers, bulkheads. Does slowness spread upstream?
- **Overload:** backpressure, load shedding by priority, queue limits, `429` with `Retry-After`.
- **Retries:** exponential backoff with jitter and retry budgets. Is every retried operation idempotent?
- **Partial failure:** the database write succeeded but the event was never published, so use an outbox.
- **Hot spots:** a hot key or one huge tenant. Split keys, cache locally, cap per tenant.
- **Dependency outage:** if the cache is down, do you fail open (and risk melting the database) or fail closed? Say which, and why.
- **Bad deploy and region loss:** canaries, feature flags, fast rollback; recovery time and data-loss targets.

Name the degraded mode: "If ranking is down, serve the feed in time order." Then spend a minute on operations (rate, errors and latency per service; SLO alerts on p99 and error rate; tracing across queues) and on what changes at 10×.

## Building blocks

Most prompts recombine the same dozen sub-problems. Know the standard tools and the trade-off you will be asked about:

| Sub-problem | Standard tools | Trade-off to explain |
|---|---|---|
| Read scaling | Cache-aside, CDN, read replicas | Staleness vs load; stampedes (coalescing, jittered TTLs) |
| Write scaling | Hash or range sharding, batching, write-behind | Hot keys, cross-shard queries, resharding cost |
| Async work | Queue (SQS, Kafka), workers, dead-letter queue | At-least-once delivery needs idempotent consumers; ordering only per partition |
| Exactly-once effects | Idempotency keys, dedupe table, transactional outbox | Storage and lookup cost vs correctness |
| Cross-service consistency | Outbox + change data capture, sagas, rarely 2PC | Sagas are eventual with compensation; 2PC blocks |
| Rate limiting | Token bucket in Redis, sliding window, local + global | Accuracy vs latency; fail open or closed when Redis is down |
| Real-time delivery | WebSocket or SSE, pub/sub, connection gateway | Stateful connections complicate deploys and rebalancing |
| Scheduling, long jobs | Durable job table with leases and heartbeats | Short leases duplicate work; long leases slow recovery |
| Search | Inverted index, vector (ANN) index | Freshness vs write cost; recall vs latency |
| Multi-region | Active-passive, active-active, geo-routing | Consistency vs latency vs cost |
| Large files | Object storage, presigned URLs, metadata database | Never stream bytes through app servers |

### When the system serves AI models

Many prompts now involve LLMs, and their physics are unusual. Raising these unprompted is a strong signal:

- **Requests are slow and expensive:** seconds to minutes on scarce GPUs, so "stateless 1ms request behind a load balancer" assumptions break.
- **Responses stream:** what happens when the client disconnects mid-stream? Can it resume? Is partial output billed?
- **Limits are in tokens, not requests:** output length is unknown up front, so reserve an estimate and reconcile afterwards.
- **GPU capacity is the bottleneck:** admission control, priority tiers, queues with deadlines, batching, shedding load before collapse.
- **Fairness and money:** per-tenant quotas so one customer can't starve others; exactly-once usage metering, because it is billing.
- **Agents:** long-running tool calls need durable execution, timeouts, and care when retrying non-idempotent tools.

## How to communicate

1. **Narrate intent:** "I'll make an assumption here and flag it."
2. **Use one trade-off sentence:** "I choose X over Y because of requirement N; if that changed, I'd switch to Y."
3. **Zoom on demand:** go from box → schema → index → partition key → failure behavior in two minutes.
4. **Handle unknowns honestly:** "I haven't run X in production, but I'd expect Y because Z, and I'd confirm it with a load test."
5. **Keep the board tidy:** requirements on the left, diagram in the center, open questions and risks on the right.
6. **Avoid the classic mistakes:** unexplained buzzword boxes, Google-scale designs for 10K users, long silences, skipping the API, never mentioning a failure.

## How to prepare

A two-week plan:

- **Days 1–3: learn the building blocks.** Explain each row of the building blocks table out loud in 60 seconds, including its trade-off, and memorize the estimation rules of thumb.
- **Days 4–10: one full mock a day.** Pick a question from the [question bank](./) (the [URL shortener](q/url-shortener/) is a good first one), turn on *Timed*, and design it out loud in 50 minutes. Rotate through different kinds of systems.
- **After every mock, check three things:** the one number that drove your design, the 2 deep dives you chose, and 3 failure modes you raised before being asked. If any is missing, redo the question a few days later.
- **Get feedback:** export your answer and paste it into an AI assistant (the export includes a feedback prompt), or swap with a friend. Score yourself against the table at the top of this chapter.
- **Read:** *Designing Data-Intensive Applications* (especially chapters 5–9) and engineering blogs on real systems at scale, so you have concrete, current examples to cite.
