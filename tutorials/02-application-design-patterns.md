---
title: Application design patterns
summary: A map of distributed application patterns, from low-level primitives to architecture: what each one guarantees, what it costs, and how to choose the smallest design that stays correct.
---

Deep dives are where you name patterns: outbox, saga, CQRS, circuit breaker. Naming them earns nothing. Interviewers listen for whether you know what each pattern guarantees, what it does **not** guarantee, and what it costs to run.

One rule ties this chapter together: **first decide who owns the authoritative state and which correctness guarantee you need. Then choose the smallest combination of patterns that keeps that guarantee under the failures you must tolerate.**

This chapter is the map. The next three chapters cover each level in depth, with mechanisms, diagrams, numbers and real-world examples: [low-level primitives](tutorials/low-level-primitives/), [infrastructure building blocks](tutorials/infrastructure-building-blocks/) and [architectural patterns](tutorials/architectural-patterns/).

## Three levels of design

Patterns work at different scopes, and each level answers a different question:

- **Low-level primitives:** what can a single operation guarantee under concurrency and failure?
- **Mid-level infrastructure:** which reusable component gives applications those guarantees?
- **High-level architecture:** how are business responsibilities, state and interactions organized?

| Level | Category | Patterns and techniques |
|---|---|---|
| **Low-level primitives** | State and concurrency | Atomic operations, compare-and-swap, transactions, constraints, pessimistic locking, optimistic concurrency control |
| | Persistence and recovery | Write-ahead logs, append-only logs, snapshots, checkpoints |
| | Communication and ownership | Request/reply, deadlines, acknowledgments, operation IDs, deduplication, sequence numbers, logical clocks, heartbeats, leases, fencing |
| | Agreement and distribution | Consensus, quorums, replication, partitioning, consistent hashing, two-phase commit, gossip, CRDTs |
| | Resource control | Bounded buffers, backpressure, semaphores, token buckets |
| **Mid-level infrastructure** | Serving and resilience | Service discovery, load balancing, gateways, hostname/path/header routing, retries, circuit breakers, bulkheads, rate limits, load shedding |
| | Messaging and execution | Work queues, competing consumers, pub/sub, retained logs, CDC, outbox, inbox, dead-letter queues, schedulers, durable workflow engines |
| | Data and performance | Indexes, pagination, caches, read replicas, sharded databases, materialized views, search indexes, object storage, CDN, batching |
| | Shared operations | Identity, authorization, service mesh, tracing, backups, failover, reconciliation controllers |
| **High-level architecture** | Application structure | CRUD applications, layered design, domain models, modular monoliths, bounded-context services, private data ownership, hexagonal architecture |
| | Data and interactions | API composition, backends for frontends, event-driven integration, CQRS, event sourcing |
| | Business coordination | Saga orchestration, saga choreography, reservations / Try-Confirm-Cancel, scatter-gather, pipes and filters, single-writer entities |
| | Evolution and isolation | Anti-corruption layers, strangler migrations, control/data plane separation, cells, multi-region architecture |

The levels describe the scope of a decision, not a strict stack. **Pub/sub and the transactional outbox are infrastructure building blocks; CQRS, event sourcing and sagas are architectural choices.** Hexagonal architecture is architectural too, but it governs code dependencies inside one application, not distribution across machines.

**Complexity ratings** in the tables below: **L** adds little machinery; **M** adds a policy or another component; **H** adds cross-component state, failure recovery or real operational work; **VH** makes correctness or recovery an ongoing specialist concern. Ratings assume mature databases and middleware, and they rise sharply when patterns interact.

## Guarantees to define first

Pick the guarantee before the pattern. Each one is narrower than it sounds:

| Guarantee | What it means | What it does not imply |
|---|---|---|
| Atomicity | A transaction's changes commit or abort together | Protection for remote API calls or messages outside that transaction |
| Serializability | Concurrent transactions behave as if run one at a time | That the default isolation level protects every business invariant |
| Linearizability | Each operation appears to happen at one instant, in real-time order | Atomic multi-record transactions |
| Eventual consistency | Replicas converge once updates stop and propagation makes progress | A staleness bound, read-your-writes, or automatic conflict resolution |
| Durability | Acknowledged data survives the failures the replication contract covers | Survival of every disaster, operator mistake or loss of all replicas |
| Idempotency | Repeating the same logical operation has no extra effect | Effects on other systems, or that a new operation may reuse an old key |
| Ordering | A defined scope (one entity, one partition) keeps a sequence | A global order across partitions, or ordered external effects |

Database isolation and distributed consistency answer different questions. PostgreSQL's default Read Committed level allows anomalies across statements, and serializable transactions can fail and need retries.

During a network partition, a replicated service cannot both answer linearizably and complete every request at every node. Treat CAP as a decision about **which operations wait, which reject, and which tolerate divergence**, not as "pick two letters".

## The patterns you'll name most

A quick reference for the patterns that come up most in interviews. The catalog after it covers the rest.

| Pattern | Main benefit | Main cost or trade-off |
|---|---|---|
| Anti-corruption layer | Keeps an external model from leaking into your domain | Translation logic and contract maintenance |
| API routing | Gives clients a stable route to services | Shared configuration, policy coordination, routing failures |
| Circuit breaker | Stops wasting resources on a failing dependency | False trips, threshold tuning, recovery probes |
| Event sourcing | Lets you reconstruct domain history | Event evolution, replay, projections, correcting past events |
| Hexagonal architecture | Separates business logic from integrations | Extra interfaces and adapters |
| Pub/sub | Lets independent consumers react to one fact | Subscriber lag, schema evolution, delivery semantics |
| Retry with backoff | Recovers from transient failures | Duplicate effects and load amplification |
| Saga (orchestration or choreography) | Coordinates committed work across services | Intermediate states, compensation, durable recovery |
| Scatter-gather | Parallelizes requests or computation | Slow branches, fan-out load, partial results |
| Strangler fig | Replaces a system incrementally | Running both systems and migrating write ownership |
| Transactional outbox | Closes the database-then-message dual-write gap | Relay operations, duplicate delivery, cleanup and ordering |

Patterns compose without implying each other. A saga might use outbox delivery, idempotent consumers and pub/sub, and none of them requires event sourcing.

## Low-level primitives

*In depth: [Chapter 3](tutorials/low-level-primitives/).*

### State and concurrency

| Primitive | Use it for | Watch out for |
|---|---|---|
| Atomic operations, compare-and-swap (L–M) | Counters, unique claims, state transitions | Protects one key, not an invariant across keys; contention causes retries |
| Local transactions and constraints (L–M) | The default for business operations in one store | Long transactions hold resources; choose isolation deliberately; remote calls stay outside the commit |
| Pessimistic locking (M) | Short critical sections with real contention | Deadlocks, hot rows, locks held across slow work |
| Optimistic concurrency (M) | Rare conflicts, or when waiting is costly | Retry storms under contention; checking one row's version can miss an invariant across rows |
| Write-ahead and append-only logs (M) | Durability, replication, ordered records | Flush latency, retention, replay cost; a storage WAL is not a domain-event model |
| Snapshots and checkpoints (M) | Faster recovery and replay | Saving state and offset inconsistently loses or repeats work; a local snapshot is not a backup |

A row lock in the database that already owns the data is usually simpler than a separate distributed lock. Make a transaction protect the actual invariant, not just wrap the code.

### Communication and work ownership

| Primitive | Use it for | Watch out for |
|---|---|---|
| Request/reply (L–M) | Immediate validation or results from a known authority | A timeout leaves the outcome unknown; every sync hop spends latency and availability |
| Deadlines and cancellation (M) | Every remote call and expensive request path | Cancellation is cooperative; timing out does not undo a remote commit |
| Acknowledgments (M) | Reliable messaging, resumable consumers | Ack before durable work risks loss; ack after it allows duplicates after a crash |
| Operation IDs and deduplication (M) | Retried mutations, payments, jobs, message consumption | The dedup record and the effect must commit together; define key scope, retention and reuse with a different payload |
| Sequence numbers, logical clocks (M) | Detecting stale updates, per-entity ordering | Wall clocks and sortable IDs do not give a trustworthy global order |
| Heartbeats (M) | Membership, replacing workers, leader recovery | A slow or partitioned node looks dead while it is still running |
| Leases and fencing tokens (H) | Leaders or workers writing shared state | Lease expiry does not stop a paused old owner; the resource must reject old tokens |
| Bounded buffers, backpressure (M) | Every queue, pool and streaming stage | Backpressure moves delay upstream; an unbounded queue turns overload into memory exhaustion or stale work |
| Semaphores, token buckets (M) | Protecting dependencies, tenant quotas | Concurrency and rate are different limits; exact global limits need coordination |

An idempotency key should carry the caller's intent. Hashing the payload is not enough, because two identical requests can both be intended.

### Agreement and distribution

| Primitive | Use it for | Watch out for |
|---|---|---|
| Consensus (Raft, Paxos) (H) | Coordination metadata, leader terms, strongly consistent services | Needs a quorum to make progress; adds write latency; does not make side effects transactional |
| Quorum reads and writes (H) | Tunable replicated storage | Quorum overlap alone is not linearizability; failover, read repair and membership matter |
| Replication (M–H) | Availability, disaster recovery, locality, read scale | Async copies lag and can lose acknowledged writes on failover; sync copies add waiting |
| Partitioning (H) | Capacity beyond one node, data locality | Hot keys, cross-partition operations, rebalancing; consistent hashing reduces remapping, not hot keys |
| Two-phase commit (H) | Short atomic transactions across compatible participants | Blocks after coordinator failure and holds locks; gives atomic commit, not isolation |
| Gossip, anti-entropy (M–H) | Membership, background convergence | Temporarily inconsistent; cannot elect a unique leader |
| CRDTs (H) | Collaborative or offline data, counters, sets | Constrained semantics; convergence does not enforce invariants such as "no overselling" |

Consensus and atomic commit solve different problems: agreeing on replicated state versus committing every participant of a transaction. Neither replaces the other.

## Infrastructure building blocks

*In depth: [Chapter 4](tutorials/infrastructure-building-blocks/).*

### Serving and resilience

| Building block | Use it for | Watch out for |
|---|---|---|
| Discovery and load balancing (M) | Many instances, changing membership | Stale membership, uneven load, health checks that trigger cascades |
| Stateless serving, autoscaling (M) | Horizontally scalable handlers and workers | State and downstream capacity still cap scale; cold starts and multiplied connection pools |
| API gateway (M) | A coherent public API, auth integration, request limits | A shared bottleneck and failure domain; keep business logic out of it |
| Retry with backoff and jitter (M) | Transient failures on safe operations | Amplifies overload and repeats effects; retry at one layer, within the deadline |
| Circuit breaker (M) | Repeated dependency failures that waste resources | Tuning and false trips; does not limit concurrency or repair the dependency |
| Bulkheads (M) | Keeping one dependency or tenant from consuming everyone's capacity | Stranded spare capacity; quotas need maintenance |
| Rate limits, load shedding (M) | Protecting an overloaded service, tenant fairness | Rejections need product behavior; queues and retries must not bypass the limit |
| Graceful degradation (M) | Optional features such as recommendations | Never fake success for a required operation |
| Hedged requests (H) | Tail latency when spare capacity exists | Extra load; not for unsafe mutations or an already overloaded dependency |

**Routing** picks a destination; it never authorizes the caller. Hostname routing gives clear ownership at the cost of more DNS, certificates and cross-origin setup. Path routing gives one origin, but shared routing config means coordination and a larger failure domain. Header routing selects versions or experiments without changing the URL, but it is harder to debug, cache keys must include the header, and an untrusted header must never grant access.

### Messaging and execution

| Building block | Use it for | Watch out for |
|---|---|---|
| Work queue, competing consumers (M) | Background tasks, absorbing bursts | Redelivery, poison jobs, lease expiry; more workers do not help a saturated downstream |
| Pub/sub (M) | Several independent reactions to one fact | Subscriber lag, duplicates, schema evolution |
| Retained partitioned log (H) | Replay, independent readers, ordered streams | Retention, partition sizing, rebalances; order holds only within a partition |
| Change data capture (M–H) | Feeding search, analytics, caches or an outbox relay | Bootstrap races, log retention, schema coupling; row changes do not express business intent |
| Transactional outbox (M–H) | A local commit must eventually trigger a message | Duplicate sends, relay backlog, ordering, cleanup; does not commit the consumer's state |
| Inbox, idempotent consumer (M–H) | Consumers of messages that may repeat | Dedup retention; an external API still needs its own idempotency |
| Dead-letter queue (M) | Isolating poison messages for repair and replay | A DLQ is unresolved work; skipping a message can break ordering or stall a workflow |
| Scheduler, worker pool (M) | Delayed actions, batch jobs, expirations | Duplicate scheduling, missed deadlines, ownership transfer |
| Durable workflow engine (H) | Long-running coordination, timers, cancellation, human waits | Workflow versioning and history; activities can still run more than once |
| Reconciliation controller (H) | Converging observed state to desired state | Conflicting controllers, oscillation, unsafe repeated actions |

A queue, a pub/sub topic and a retained log are different consumption models: each job goes to one worker; each subscription gets every message; each consumer tracks its own position in the log. One product can offer several.

### Data and performance

| Building block | Use it for | Watch out for |
|---|---|---|
| Indexes, cursor pagination (L–M) | The first fix for slow selective queries and large listings | Write and storage cost; cursors need a stable sort order |
| Cache-aside, read-through (M) | Repeated reads with a stated freshness tolerance | Staleness, stampedes, cold-cache spikes, invalidation races |
| Write-through, write-behind (M–H) | Workloads that justify a cache in the write path | Write-behind can lose or reorder acknowledged writes without a durable buffer |
| Read replicas (M) | High read load with tolerable lag | Read-your-writes breaks; the primary's write bottleneck stays |
| Sharding (H) | A measured write or storage bottleneck | Cross-shard transactions and joins, hot tenants, resharding |
| Materialized views, search indexes (M–H) | Aggregates, search, expensive joins | Update amplification, lag, backfills, rebuilds; not an authoritative record |
| Object storage, claim check (M) | Large payloads, passed by reference | Access control, cleanup, keeping object and message lifetimes in step |
| CDN, edge caching (M) | Public or safely cacheable content | Invalidation, cache-key mistakes, private data leaking |
| Batching, connection pooling (L–M) | Overhead-dominated small operations | Batching adds waiting; pools can hide a queue or swamp the database as services scale out |

Replication copies the same data; sharding splits different data. They solve different scaling problems.

### Shared operations

- **Service mesh and sidecars** standardize transport, identity and telemetry, at the cost of proxy latency and harder diagnosis. A mesh cannot infer business idempotency.
- **Identity and authorization** belong at every trust boundary. A gateway-only check misses internal access paths.
- **Metrics, logs and tracing** must propagate context across queues as well as RPCs. A trace is not a durable audit record.
- **Backup, restore and failover:** replication copies corruption and deletions too, a backup is not proven until you restore it, and failover must fence the old writer.

## Architectural patterns

*In depth: [Chapter 5](tutorials/architectural-patterns/).*

### Application structure

| Pattern | Use it for | Watch out for |
|---|---|---|
| CRUD transactional application (L–M) | The default: profiles, catalogs, admin, most operational systems | History needs an explicit mechanism; careless read-modify-write loses updates |
| Layered design, domain model (L–M) | Procedures for simple rules; a richer model for interacting invariants | Excess layers obscure simple work; hidden data access creates expensive queries |
| Modular monolith (L–M) | Domain boundaries still evolving | Shared releases; weak boundaries are hard to extract later |
| Bounded-context services, private data (H) | Teams, scaling or release cycles justify independent deploys | Remote joins, cross-service invariants, contract evolution; one service per table is excessive coupling |
| Shared database across services (M at first) | A deliberate transition | Schema and runtime coupling undermine independent releases |
| API composition, backends for frontends (M–H) | Fresh data from a few services; very different client needs | Latency and failures accumulate; orchestration gets duplicated |
| Hexagonal architecture (M) | Important domain logic with several integrations and isolated tests | Extra interfaces; network, schema and transaction constraints remain |

CRUD describes data operations; REST describes an interface. A domain command such as `CancelOrder` works fine on ordinary tables inside one transaction.

### Events, queries and workflows

| Pattern | Use it for | Watch out for |
|---|---|---|
| Event-driven integration (M–H) | Independent downstream reactions | Schema dependencies, lag, ordering, harder end-to-end debugging |
| CQRS (M–H) | Write rules and read shapes that differ enough to need separate models | More models; separate stores add propagation, freshness rules and rebuilds |
| Event sourcing (H–VH) | Domains where reconstructing history is a core requirement | Event evolution, replay, projections, sensitive data, correcting past mistakes |
| Saga orchestration (H) | Multi-service processes with branches, timeouts or manual steps | Coordinator state and versioning, intermediate states, failed compensations |
| Saga choreography (H–VH) | A small, stable set of participants | A hidden global process, cycles, unclear timeout ownership |
| Reservation / Try-Confirm-Cancel (H) | Scarce inventory or capacity | Expiry, stranded reservations, confirm/cancel races; not global ACID |
| Scatter-gather (M–H) | Federated search, quotes, partitioned queries | Tail latency, fan-out load, partial results |
| Pipes and filters (M–H) | Ingestion, media and data processing | Bottleneck stages, checkpointing, duplicate effects, stage versions |
| Single-writer entity, actors (M–H) | Games, sessions, aggregates where local order matters | Hot entities cap throughput; ownership transfer and durability need design |

Scatter-gather needs an explicit **completion rule**: all responses, a deadline, a required subset, or "good enough". Events come in two shapes. A notification ("order 42 changed") forces a follow-up query. Event-carried state ("order 42 shipped to …") lets consumers act alone, at the cost of larger payloads and stronger schema obligations.

### Evolution, isolation and geography

| Pattern | Use it for | Watch out for |
|---|---|---|
| Anti-corruption layer (M) | Keeping a legacy or external model out of your domain | Semantic mapping, testing, possible latency; may stay forever |
| Strangler fig (H) | Replacing a system too risky to cut over at once | Running both, data migration, clear write ownership at each stage |
| Control / data plane separation (H) | Management changes far less often than serving | Config propagation, stale state; data-plane requests must not call the control plane |
| Cells, deployment stamps (H) | Containing failures, overload and rollouts as you grow | Spare capacity, tenant moves, routing; a shared critical dependency defeats isolation |
| Multi-region (H–VH) | Latency, disaster recovery, data residency | WAN latency, failover ambiguity, conflicts, cost; active-active serving is not multi-writer data |

## CRUD, CQRS, event sourcing and outbox are separate decisions

These four are often blurred together. Each makes one decision:

| Pattern | The decision it makes | What it does **not** require or guarantee |
|---|---|---|
| **CRUD** | Store and mutate current-state records | Does not prohibit auditing, domain commands, events or rich business rules |
| **CQRS** | Use separate models for commands and queries | Does not require separate databases, event sourcing, messaging or eventual consistency |
| **Event sourcing** | Govern state changes through an authoritative event history | Does not require replaying all history on every read; stored projections and snapshots are normal |
| **Transactional outbox** | Commit the intent to publish atomically with a local state change | Does not put the consumer's changes in that transaction or guarantee exactly-once effects |

CQRS can start as two models sharing one database. Event-sourced services usually store current state as snapshots (to rebuild an entity quickly) and projections (to answer queries).

A common misreading: *"CRUD update → outbox → archived event log, therefore event sourcing."* **That sequence does not make the originating service event-sourced.** It is a CRUD service with a reliable downstream history. A service is event-sourced only when the event history is the authority that governs its domain changes.

Two valid ways to publish changes, which different services in one application can mix:

- **CRUD authority:** the command handler commits the business rows and an outbox row in one transaction; a relay publishes the outbox rows.
- **Event authority:** the command handler validates against the aggregate's state and appends domain events with a version check; a durable subscription publishes them. That can replace a separate outbox, unless publishing is a second, unreliable write.

Both feed the same transport, query projections and consumers. A workflow engine's execution history is not automatically the domain's event store.

**Name records by their job**, not by the word "event". One database can hold all of these:

| Record | Why it exists | Correctness rule |
|---|---|---|
| Entity row | Authoritative current state in a CRUD design | Updates keep the entity's invariants under concurrency |
| Domain event stream | Governs state transitions in an event-sourced domain | Append at a known version; rebuild deterministically |
| Audit log | Who did what, when | Captures the required evidence; need not rebuild state |
| Outbox record | A publication owed by a committed transaction | A commit can never silently drop its publication |
| Inbox record | Stops repeated consumer effects | Dedup and the effects commit together |
| Idempotency record | One client operation and its outcome across retries | Same key returns a compatible outcome; mismatched reuse is rejected |
| Query projection | A view materialized for reads | Defined progress and rebuild rules; readers accept its freshness |
| Workflow state | Which business steps are done, pending or failed | Restart resumes safely without assuming remote calls didn't happen |

## Failure cases that decide the design

### Outbox and inbox, step by step

An order change must cause an update in another service's database. Walk every crash point:

| Failure point | Safe behavior | What makes it safe |
|---|---|---|
| Source transaction aborts | Neither the order change nor its publication happens | State and outbox row in one local transaction |
| Source commits, service crashes before publishing | The outbox row is still there to deliver later | Durable outbox and a recovering relay |
| Broker accepts, relay crashes before marking progress | The relay publishes again with the same event ID | At-least-once publishing plus downstream dedup |
| Consumer crashes before committing | A later delivery retries the work | Broker redelivery or log replay |
| Consumer commits, crashes before acking | The redelivery sees the effect already happened | Inbox ID and effects in one transaction |
| An external API succeeds but the response is lost | Outcome unknown: retry with the same key or reconcile | The external API's idempotency or status contract |
| A permanent error blocks progress | Surface the stuck work and repair or compensate | DLQ, workflow state, alerts, a human |

The outbox closes the local dual-write gap; it is not a promise of delivery through permanent outages or deleted records. **Exactly-once effects exist only inside one atomic boundary.** A broker's guarantee does not cover your consumer's database, a payment processor or an email.

### A saga is not a distributed rollback

Each earlier step has already committed. Compensation is a new business action: a refund leaves a trail, may cost a fee, and can itself fail. Sagas also give no isolation, so other requests see intermediate states; model them explicitly with pending states or reservations.

| Requirement | Suitable approach |
|---|---|
| Several records in one owner change together | A local transaction with suitable concurrency control |
| A strict invariant keeps spanning proposed services | Redraw the boundary, or use a distributed transactional store |
| A short atomic operation spans compatible participants | A distributed transaction, accepting its latency and availability cost |
| A business process spans services or external systems over time | A durable saga or workflow with idempotent steps |
| A resource can be held provisionally | Reservation / Try-Confirm-Cancel |

An orchestrator is logically central but can be replicated and recover from durable state. Choreography removes the coordinator, not the coupling.

## Numbers that constrain the design

- **A queue does not create capacity.** By Little's Law, in-flight work is `N = λ × W`. At 10,000 operations/s and 0.2 s each, 2,000 are in flight; if latency grows to 2 s at the same throughput, 20,000 are. Admission control and bulkheads bound the damage.
- **Backlogs grow at the gap.** When arrivals exceed completions, the backlog grows at roughly `λ − μ` per second until something drops or rejects work. Monitor the age of the oldest message and completion throughput, not just queue length.
- **Fan-out multiplies tail latency.** If each of `n` branches is on time with probability `p`, all are on time with probability `pⁿ`. At `p = 0.99` and `n = 100`, only about 37% of requests finish on time. Bound fan-out and define partial results.
- **Retries multiply.** Four nested layers that each try 3 times can send `3⁴ = 81` attempts to the deepest dependency for one request. Retry at one layer and use retry budgets.

## When to use what

Start with the smallest design that meets the need and escalate only when a concrete requirement earns the cost:

| Situation | Start with | Complexity | Escalate when |
|---|---|---|---|
| Ordinary business records | CRUD, transactions, constraints, indexes | Low | The domain or queries no longer fit one model |
| Concurrent updates break an invariant | Conditional updates, locks, or serializable transactions | Medium | The invariant spans independently owned stores |
| Retried API requests repeat effects | Stable idempotency keys and stored outcomes | Medium | Effects reach beyond the local transaction |
| A commit must trigger downstream work | Transactional outbox plus idempotent consumers | Medium–high | Consumers need ordering or workflow recovery |
| Several services react to one fact | Durable pub/sub with explicit subscriptions | Medium | Replay or high partitioned throughput justify a log |
| Bursts exceed processing capacity | A bounded queue and controlled workers | Medium | Arrivals stay above capacity: scale, prioritize or shed |
| One query is expensive | Query tuning, indexes, a targeted materialized view | Low–medium | Many reads need a separate model or capacity |
| Read shapes and write rules diverge | CQRS inside the existing service and database | Medium–high | Separate stores bring a measured benefit |
| Auditing is required | A reliable audit trail | Medium | Replay and reconstruction are core: event sourcing (high–very high) |
| A business process spans services over time | A durable workflow or saga | High | — |
| Work outlasts an HTTP deadline | A durable job, operation ID and status endpoint | Medium | Branching, timers or cancellation justify a workflow engine |
| A strict invariant spans proposed services | Reconsider the boundaries | High | A distributed transaction is truly needed |
| One database's capacity is exhausted | Tune and scale up first | High | Sharding's benefit beats its cross-shard cost |
| Failures must hit only some tenants | Bulkheads, quotas, load shedding | Medium–high | Stronger isolation justifies cells |
| A legacy system must be replaced | Strangler routing with explicit write ownership | High | Semantic gaps justify an anti-corruption layer |
| A second region is needed | Recovery, latency and write-ownership targets first | High | Concurrent regional writes need conflict resolution |

For asynchronous APIs, `202 Accepted` means the work was durably accepted, not finished. Provide a status endpoint, terminal outcomes, and duplicate protection on submission.

## A sensible default

Start with **a modular CRUD application or a few substantial services, explicit transaction boundaries, deliberate concurrency control, bounded resources, deadlines, and observable recovery** (metrics, alerts, tested backups). Then add patterns as needs appear:

- A queue for genuinely asynchronous work.
- An outbox when that work must reliably follow a database commit.
- A cache or derived read view for an observed access problem.
- A workflow engine once durable coordination and recovery recur.
- Separate services where independent ownership, releases, capacity or failure isolation outweigh remote calls and cross-service consistency.

One application can use CRUD for most records, event sourcing for one domain, and sagas for a few cross-service processes.

**Example: an order with an external payment.** First ask whether order and inventory can share one transaction; if so, use it. No local transaction can include the payment provider, so persist a pending payment, call the provider with a stable operation ID, and reconcile uncertain outcomes. Add orchestration when the flow needs recoverable reservations, timeouts and compensation. None of this requires event sourcing.

In production, every pattern needs an operating plan:

- **Migrations:** expand, migrate, then contract, so old and new versions coexist. Rolling back code does not undo database changes or external effects.
- **Ownership of stuck work:** for every asynchronous path, name who owns stalled work, what alerts, and how it is repaired.
- **What to track:** propagation lag, oldest pending work, dedup hits, failed compensations and rebuild progress, next to user-facing latency and errors.
- **Recovery drills:** set RPO (acceptable data loss) and RTO (acceptable downtime) targets and test restores; a backup's existence proves nothing.

## Using this in the interview

1. **State the owner and the guarantee before the pattern:** "The order service owns order state; a customer must never be charged twice."
2. **Name the smallest pattern and its limit:** "An outbox for `OrderPlaced`; consumers dedupe on the event ID because the relay can resend."
3. **Use the deep-dive shape** from [chapter 1](tutorials/interview-format/#5-deep-dives): problem → options → trade-off → pick → what would change your mind.
4. **Avoid the classic mistakes:** event sourcing for an ordinary CRUD domain, "exactly-once" because the broker says so, sagas described as rollback, a queue to "add capacity", one microservice per table.

**Further reading:** the [AWS cloud design patterns catalog](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/introduction.html), Martin Fowler on [CQRS](https://martinfowler.com/bliki/CQRS.html) and [Monolith First](https://martinfowler.com/bliki/MonolithFirst.html), [transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html), Kleppmann on [fencing tokens](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html), [The Tail at Scale](https://research.google/pubs/the-tail-at-scale/), and the Google SRE chapter on [handling overload](https://sre.google/sre-book/handling-overload/).
