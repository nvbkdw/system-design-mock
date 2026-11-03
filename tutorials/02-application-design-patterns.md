---
title: Application design patterns
summary: A map of distributed application patterns, from low-level primitives to architecture: what each one guarantees, what it costs, and how to choose the smallest design that stays correct.
---

Naming a design pattern themself earns nothing. Interviewers listen for whether you make the right trade-off, what each pattern guarantees, what it does **not** guarantee, what are alternatives, why favor A over B.

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

The levels describe the scope of a decision, not a strict software stack.

**Complexity ratings** in the tables below: **L** adds little machinery; **M** adds a policy or another component; **H** adds cross-component state, failure recovery or real operational work; **VH** makes correctness or recovery an ongoing specialist concern. Ratings assume mature databases and middleware, and they rise sharply when patterns interact.

## Guarantees to define first

Pick the guarantee before the pattern. A guarantee is the system-level promise that protects a business invariant, such as "a seat is sold once" or "a charge happens once." It is the top of a chain: **invariant → guarantee → trade-off under failure → pattern → implementation detail.** Get the guarantee wrong and every decision below it protects the wrong thing.

Each guarantee is narrower than it sounds:

| Guarantee | What it means | What it does not imply |
|---|---|---|
| Atomicity | A transaction's changes commit or abort together | Protection for remote API calls or messages outside that transaction |
| Serializability | Concurrent transactions behave as if run one at a time | Real-time order: a transaction may see state older than one that already committed. Nor that the default isolation level protects every business invariant |
| Linearizability (strong consistency) | Data behaves as if there is one copy: each operation appears to happen at one instant, in real-time order, so every read sees every write acknowledged before it | Atomic multi-record transactions, or a scope wider than the system promises (often one key, not a query across keys) |
| Eventual consistency | Replicas converge once updates stop and propagation makes progress | A staleness bound, read-your-writes, or automatic conflict resolution |
| Durability | Acknowledged data survives the failures the replication contract covers | Survival of every disaster, operator mistake or loss of all replicas |
| Idempotency | Repeating the same logical operation has no extra effect | Effects on other systems, or that a new operation may reuse an old key |
| Ordering | A defined scope (one entity, one partition) keeps a sequence | A global order across partitions, or ordered external effects |

**ACID and CAP both say "consistency" but answer different questions.**

- **ACID: what happens when transactions run concurrently or fail, within one database?** Isolation (the I) sets which interleavings are allowed. Read Committed, a common default, allows anomalies across statements; Serializable behaves as if transactions ran one at a time, but transactions can abort and need retries. ACID's C only means transactions keep the invariants the application defines.
- **CAP and consistency models: what can a reader see when data has several copies?** This is about replication: whether a read reflects the latest write, from linearizable (behaves like one copy) down to eventual.

They interact but don't imply each other. A serializable database can serve stale reads from an async replica, and a linearizable store can't make a two-key transfer atomic. Getting both is strict serializability. In a design, state each one separately: "the transfer needs a serializable transaction; reads after a write need read-your-writes consistency."

Between strong and eventual lies a spectrum of consistency models:

| Model | A reader sees | Typical mechanism |
|---|---|---|
| Linearizable | The latest acknowledged write | Leader or consensus on every read and write |
| Causal | Effects never before their causes | Version vectors, logical clocks |
| Read-your-writes | Their own writes | Read from the leader briefly after writing |
| Monotonic reads | Nothing older than already seen | Sticky replica per session |
| Bounded staleness | Data at most *t* seconds old | Skip replicas lagging past the bound |
| Eventual | Some value; copies converge | Async replication plus a merge rule |

Name the weakest model that keeps the invariant safe: "users see their own comment" needs read-your-writes, not linearizability.

### What a guarantee costs once state is replicated: CAP and PACELC

The table says what each guarantee means. CAP and PACELC say what the **linearizability** and **eventual consistency** rows cost once data has more than one copy. That cost is what turns a guarantee into concrete design choices.

**CAP** uses three precise terms. 
* **Consistency (C)** is linearizability, as defined above. 
* **Availability (A)** means every request to a node that hasn't failed gets a non-error response, even if that node can't reach the others. 
* **Partition tolerance (P)** means the guarantees hold while the network drops or delays messages. 

A distributed system cannot opt out of partitions (dropped links, GC pauses and overloaded switches all look like one), so "CA" is not a real option. The theorem says only this: **during a network partition, a replicated service cannot both answer linearizably and complete every request at every node.** A node cut off from the others either waits or rejects (CP), or it answers from local state and reconciles later (AP).

**PACELC** adds the normal case. If there is a **P**artition, choose **A** or **C**; **E**lse, choose **L**atency or **C**onsistency. Partitions are rare, but you pay for linearizability on every request: a synchronous write adds about 1–5 ms within a region and a full round trip (about 60–150 ms) across regions. This trade-off shapes everyday design more often than CAP does.

This applies to **any copy of state**, not only databases: read replicas, a cache in front of the database, a second region, an offline mobile client, a search index fed by CDC. For each copy, ask: if it can't reach the authority, does it serve possibly stale data, or does it refuse?

**Decide per invariant, not per system.** Treat CAP as a decision about **which operations wait, which reject, and which tolerate divergence**, not as "pick two letters". One product usually needs both, and each choice determines the patterns and implementation details beneath it:

| Invariant | Guarantee | During a partition | What the choice requires in the design |
|---|---|---|---|
| A seat, item or username is claimed once | Linearizable per key | **CP:** the minority side rejects or waits | One authority per key ([consensus](tutorials/low-level-primitives/#consensus-raft-and-paxos) or a single leader), conditional writes, [fencing](tutorials/low-level-primitives/#leases-and-fencing-tokens), a "try again" path in the UX |
| A card is charged once | Linearizable per key, plus idempotency | **CP** for the charge decision | [Operation IDs](tutorials/low-level-primitives/#operation-ids-idempotency-keys-and-deduplication) stored with the effect, reconciliation of unknown outcomes |
| A withdrawal never overdraws | Check against the authority at write time | **CP** for the write; reads may be stale | A constraint or compare-and-swap on the owning store, not a check against a cached balance |
| Cart contents, likes, presence | Eventual consistency with a merge rule | **AP:** accept locally, merge later | [CRDTs](tutorials/low-level-primitives/#crdts) or version vectors, [anti-entropy](tutorials/low-level-primitives/#gossip-and-anti-entropy), a defined conflict rule (and what last-writer-wins loses) |
| Product pages, profiles, feeds | Eventual consistency with a staleness bound | **AP:** serve from local copies | [Read replicas](tutorials/low-level-primitives/#replication) or caches, TTL or invalidation, read-your-writes where users notice |

**In an interview, walk the chain from top to bottom:**

1. **Name the invariant and the cost of breaking it.** "Two users must never hold the same seat" is a different class of requirement from "the like count can be off by a few."
2. **Pick the guarantee and the partition behavior, and say what the user sees.** For example: "If a region can't reach the seat's leader, it shows *try again*; browsing keeps working from local replicas."
3. **State the normal-case (PACELC) cost.** For example: "Seat writes go to the event's home region, which adds about 80 ms for remote users. Reads come from local replicas and can be up to 1 s stale."
4. **Only then name patterns and details.** Leader placement, quorum sizes, cache TTLs, conflict rules and retry behavior should each trace back to a guarantee you've already stated.

**Common mistakes:**

- **Saying "we choose CA."** That is only possible on a single node.
- **Labeling a product "AP" or "CP".** Many stores let you choose consistency per request, so the label describes a configuration, not the product.
- **Treating CAP availability as an uptime SLO.** A CP system that keeps serving from the majority side can still meet 99.99%; only clients cut off with the minority see errors.
- **Saying "eventually consistent" without a merge rule or a staleness bound.** The table above lists both as things eventual consistency does not give you.

## The patterns you'll name most

A quick reference for the patterns that come up most in interviews; each name links to its in-depth section. The catalog after it covers the rest.

| Pattern | Main benefit | Main cost or trade-off |
|---|---|---|
| [Anti-corruption layer](tutorials/architectural-patterns/#anti-corruption-layer) | Keeps an external model from leaking into your domain | Translation logic and contract maintenance |
| [API routing](tutorials/infrastructure-building-blocks/#api-gateway-and-routing) | Gives clients a stable route to services | Shared configuration, policy coordination, routing failures |
| [Circuit breaker](tutorials/infrastructure-building-blocks/#circuit-breaker) | Stops wasting resources on a failing dependency | False trips, threshold tuning, recovery probes |
| [Event sourcing](tutorials/architectural-patterns/#event-sourcing) | Lets you reconstruct domain history | Event evolution, replay, projections, correcting past events |
| [Hexagonal architecture](tutorials/architectural-patterns/#hexagonal-architecture-ports-and-adapters) | Separates business logic from integrations | Extra interfaces and adapters |
| [Pub/sub](tutorials/infrastructure-building-blocks/#publish-subscribe) | Lets independent consumers react to one fact | Subscriber lag, schema evolution, delivery semantics |
| [Retry with backoff](tutorials/infrastructure-building-blocks/#retry-with-backoff-and-jitter) | Recovers from transient failures | Duplicate effects and load amplification |
| Saga ([orchestration](tutorials/architectural-patterns/#saga-orchestration) or [choreography](tutorials/architectural-patterns/#saga-choreography)) | Coordinates committed work across services | Intermediate states, compensation, durable recovery |
| [Scatter-gather](tutorials/architectural-patterns/#scatter-gather) | Parallelizes requests or computation | Slow branches, fan-out load, partial results |
| [Strangler fig](tutorials/architectural-patterns/#strangler-fig-migration) | Replaces a system incrementally | Running both systems and migrating write ownership |
| [Transactional outbox](tutorials/infrastructure-building-blocks/#transactional-outbox) | Closes the database-then-message dual-write gap | Relay operations, duplicate delivery, cleanup and ordering |

Patterns compose without implying each other. A saga might use outbox delivery, idempotent consumers and pub/sub, and none of them requires event sourcing.

## Low-level primitives

*In depth: [Chapter 3](tutorials/low-level-primitives/). Each pattern name below links to its section.*

### State and concurrency

| Primitive | Use it for | Watch out for |
|---|---|---|
| [Atomic operations, compare-and-swap](tutorials/low-level-primitives/#atomic-operations-and-compare-and-swap) (L–M) | Counters, unique claims, state transitions | Protects one key, not an invariant across keys; contention causes retries |
| [Local transactions and constraints](tutorials/low-level-primitives/#local-transactions-and-constraints) (L–M) | The default for business operations in one store | Long transactions hold resources; choose isolation deliberately; remote calls stay outside the commit |
| [Pessimistic locking](tutorials/low-level-primitives/#pessimistic-locking) (M) | Short critical sections with real contention | Deadlocks, hot rows, locks held across slow work |
| [Optimistic concurrency](tutorials/low-level-primitives/#optimistic-concurrency-control) (M) | Rare conflicts, or when waiting is costly | Retry storms under contention; checking one row's version can miss an invariant across rows |
| [Write-ahead](tutorials/low-level-primitives/#write-ahead-log) and [append-only logs](tutorials/low-level-primitives/#append-only-logs-and-lsm-trees) (M) | Durability, replication, ordered records | Flush latency, retention, replay cost; a storage WAL is not a domain-event model |
| [Snapshots and checkpoints](tutorials/low-level-primitives/#snapshots-and-checkpoints) (M) | Faster recovery and replay | Saving state and offset inconsistently loses or repeats work; a local snapshot is not a backup |

A row lock in the database that already owns the data is usually simpler than a separate distributed lock. Make a transaction protect the actual invariant, not just wrap the code.

### Communication and work ownership

| Primitive | Use it for | Watch out for |
|---|---|---|
| [Request/reply](tutorials/low-level-primitives/#request-reply) (L–M) | Immediate validation or results from a known authority | A timeout leaves the outcome unknown; every sync hop spends latency and availability |
| [Deadlines and cancellation](tutorials/low-level-primitives/#deadlines-and-cancellation) (M) | Every remote call and expensive request path | Cancellation is cooperative; timing out does not undo a remote commit |
| [Acknowledgments](tutorials/low-level-primitives/#acknowledgments-and-delivery-semantics) (M) | Reliable messaging, resumable consumers | Ack before durable work risks loss; ack after it allows duplicates after a crash |
| [Operation IDs and deduplication](tutorials/low-level-primitives/#operation-ids-idempotency-keys-and-deduplication) (M) | Retried mutations, payments, jobs, message consumption | The dedup record and the effect must commit together; define key scope, retention and reuse with a different payload |
| [Sequence numbers, logical clocks](tutorials/low-level-primitives/#sequence-numbers-and-logical-clocks) (M) | Detecting stale updates, per-entity ordering | Wall clocks and sortable IDs do not give a trustworthy global order |
| [Heartbeats](tutorials/low-level-primitives/#heartbeats-and-failure-detection) (M) | Membership, replacing workers, leader recovery | A slow or partitioned node looks dead while it is still running |
| [Leases and fencing tokens](tutorials/low-level-primitives/#leases-and-fencing-tokens) (H) | Leaders or workers writing shared state | Lease expiry does not stop a paused old owner; the resource must reject old tokens |
| [Bounded buffers, backpressure](tutorials/low-level-primitives/#bounded-buffers-and-backpressure) (M) | Every queue, pool and streaming stage | Backpressure moves delay upstream; an unbounded queue turns overload into memory exhaustion or stale work |
| [Semaphores](tutorials/low-level-primitives/#semaphores-and-concurrency-limits), [token buckets](tutorials/low-level-primitives/#token-bucket-and-leaky-bucket) (M) | Protecting dependencies, tenant quotas | Concurrency and rate are different limits; exact global limits need coordination |

An idempotency key should carry the caller's intent. Hashing the payload is not enough, because two identical requests can both be intended.

### Agreement and distribution

| Primitive | Use it for | Watch out for |
|---|---|---|
| [Consensus (Raft, Paxos)](tutorials/low-level-primitives/#consensus-raft-and-paxos) (H) | Coordination metadata, leader terms, strongly consistent services | Needs a quorum to make progress; adds write latency; does not make side effects transactional |
| [Quorum reads and writes](tutorials/low-level-primitives/#quorum-reads-and-writes) (H) | Tunable replicated storage | Quorum overlap alone is not linearizability; failover, read repair and membership matter |
| [Replication](tutorials/low-level-primitives/#replication) (M–H) | Availability, disaster recovery, locality, read scale | Async copies lag and can lose acknowledged writes on failover; sync copies add waiting |
| [Partitioning](tutorials/low-level-primitives/#partitioning-and-consistent-hashing) (H) | Capacity beyond one node, data locality | Hot keys, cross-partition operations, rebalancing; consistent hashing reduces remapping, not hot keys |
| [Two-phase commit](tutorials/low-level-primitives/#two-phase-commit) (H) | Short atomic transactions across compatible participants | Blocks after coordinator failure and holds locks; gives atomic commit, not isolation |
| [Gossip, anti-entropy](tutorials/low-level-primitives/#gossip-and-anti-entropy) (M–H) | Membership, background convergence | Temporarily inconsistent; cannot elect a unique leader |
| [CRDTs](tutorials/low-level-primitives/#crdts) (H) | Collaborative or offline data, counters, sets | Constrained semantics; convergence does not enforce invariants such as "no overselling" |

Consensus and atomic commit solve different problems: agreeing on replicated state versus committing every participant of a transaction. Neither replaces the other.

## Infrastructure building blocks

*In depth: [Chapter 4](tutorials/infrastructure-building-blocks/). Each pattern name below links to its section.*

### Serving and resilience

| Building block | Use it for | Watch out for |
|---|---|---|
| [Discovery and load balancing](tutorials/infrastructure-building-blocks/#service-discovery-and-load-balancing) (M) | Many instances, changing membership | Stale membership, uneven load, health checks that trigger cascades |
| [Stateless serving, autoscaling](tutorials/infrastructure-building-blocks/#stateless-serving-and-autoscaling) (M) | Horizontally scalable handlers and workers | State and downstream capacity still cap scale; cold starts and multiplied connection pools |
| [API gateway](tutorials/infrastructure-building-blocks/#api-gateway-and-routing) (M) | A coherent public API, auth integration, request limits | A shared bottleneck and failure domain; keep business logic out of it |
| [Retry with backoff and jitter](tutorials/infrastructure-building-blocks/#retry-with-backoff-and-jitter) (M) | Transient failures on safe operations | Amplifies overload and repeats effects; retry at one layer, within the deadline |
| [Circuit breaker](tutorials/infrastructure-building-blocks/#circuit-breaker) (M) | Repeated dependency failures that waste resources | Tuning and false trips; does not limit concurrency or repair the dependency |
| [Bulkheads](tutorials/infrastructure-building-blocks/#bulkheads) (M) | Keeping one dependency or tenant from consuming everyone's capacity | Stranded spare capacity; quotas need maintenance |
| [Rate limits, load shedding](tutorials/infrastructure-building-blocks/#rate-limits-and-load-shedding) (M) | Protecting an overloaded service, tenant fairness | Rejections need product behavior; queues and retries must not bypass the limit |
| [Graceful degradation](tutorials/infrastructure-building-blocks/#graceful-degradation) (M) | Optional features such as recommendations | Never fake success for a required operation |
| [Hedged requests](tutorials/infrastructure-building-blocks/#hedged-requests) (H) | Tail latency when spare capacity exists | Extra load; not for unsafe mutations or an already overloaded dependency |

**[Routing](tutorials/infrastructure-building-blocks/#api-gateway-and-routing)** picks a destination; it never authorizes the caller. Hostname routing gives clear ownership at the cost of more DNS, certificates and cross-origin setup. Path routing gives one origin, but shared routing config means coordination and a larger failure domain. Header routing selects versions or experiments without changing the URL, but it is harder to debug, cache keys must include the header, and an untrusted header must never grant access.

### Messaging and execution

| Building block | Use it for | Watch out for |
|---|---|---|
| [Work queue, competing consumers](tutorials/infrastructure-building-blocks/#work-queue-and-competing-consumers) (M) | Background tasks, absorbing bursts | Redelivery, poison jobs, lease expiry; more workers do not help a saturated downstream |
| [Pub/sub](tutorials/infrastructure-building-blocks/#publish-subscribe) (M) | Several independent reactions to one fact | Subscriber lag, duplicates, schema evolution |
| [Retained partitioned log](tutorials/infrastructure-building-blocks/#retained-partitioned-log) (H) | Replay, independent readers, ordered streams | Retention, partition sizing, rebalances; order holds only within a partition |
| [Change data capture](tutorials/infrastructure-building-blocks/#change-data-capture) (M–H) | Feeding search, analytics, caches or an outbox relay | Bootstrap races, log retention, schema coupling; row changes do not express business intent |
| [Transactional outbox](tutorials/infrastructure-building-blocks/#transactional-outbox) (M–H) | A local commit must eventually trigger a message | Duplicate sends, relay backlog, ordering, cleanup; does not commit the consumer's state |
| [Inbox, idempotent consumer](tutorials/infrastructure-building-blocks/#inbox-and-idempotent-consumer) (M–H) | Consumers of messages that may repeat | Dedup retention; an external API still needs its own idempotency |
| [Dead-letter queue](tutorials/infrastructure-building-blocks/#dead-letter-queue-and-redrive) (M) | Isolating poison messages for repair and replay | A DLQ is unresolved work; skipping a message can break ordering or stall a workflow |
| [Scheduler, worker pool](tutorials/infrastructure-building-blocks/#job-scheduler-and-worker-pool) (M) | Delayed actions, batch jobs, expirations | Duplicate scheduling, missed deadlines, ownership transfer |
| [Durable workflow engine](tutorials/infrastructure-building-blocks/#durable-workflow-engine) (H) | Long-running coordination, timers, cancellation, human waits | Workflow versioning and history; activities can still run more than once |
| [Reconciliation controller](tutorials/infrastructure-building-blocks/#reconciliation-controller) (H) | Converging observed state to desired state | Conflicting controllers, oscillation, unsafe repeated actions |

A queue, a pub/sub topic and a retained log are different consumption models: each job goes to one worker; each subscription gets every message; each consumer tracks its own position in the log. One product can offer several.

### Data and performance

| Building block | Use it for | Watch out for |
|---|---|---|
| [Indexes, cursor pagination](tutorials/infrastructure-building-blocks/#indexes-and-pagination) (L–M) | The first fix for slow selective queries and large listings | Write and storage cost; cursors need a stable sort order |
| [Cache-aside, read-through](tutorials/infrastructure-building-blocks/#cache-aside-and-read-through) (M) | Repeated reads with a stated freshness tolerance | Staleness, stampedes, cold-cache spikes, invalidation races |
| [Write-through, write-behind](tutorials/infrastructure-building-blocks/#write-through-and-write-behind) (M–H) | Workloads that justify a cache in the write path | Write-behind can lose or reorder acknowledged writes without a durable buffer |
| [Read replicas](tutorials/infrastructure-building-blocks/#read-replicas) (M) | High read load with tolerable lag | Read-your-writes breaks; the primary's write bottleneck stays |
| [Sharding](tutorials/infrastructure-building-blocks/#sharded-database-and-shard-router) (H) | A measured write or storage bottleneck | Cross-shard transactions and joins, hot tenants, resharding |
| [Materialized views, search indexes](tutorials/infrastructure-building-blocks/#materialized-views-and-search-indexes) (M–H) | Aggregates, search, expensive joins | Update amplification, lag, backfills, rebuilds; not an authoritative record |
| [Object storage, claim check](tutorials/infrastructure-building-blocks/#object-storage-and-claim-check) (M) | Large payloads, passed by reference | Access control, cleanup, keeping object and message lifetimes in step |
| [CDN, edge caching](tutorials/infrastructure-building-blocks/#cdn-and-edge-caching) (M) | Public or safely cacheable content | Invalidation, cache-key mistakes, private data leaking |
| [Batching, connection pooling](tutorials/infrastructure-building-blocks/#batching-and-connection-pooling) (L–M) | Overhead-dominated small operations | Batching adds waiting; pools can hide a queue or swamp the database as services scale out |

Replication copies the same data; sharding splits different data. They solve different scaling problems.

### Shared operations

- **[Service mesh and sidecars](tutorials/infrastructure-building-blocks/#sidecar-ambassador-and-service-mesh)** standardize transport, identity and telemetry, at the cost of proxy latency and harder diagnosis. A mesh cannot infer business idempotency.
- **[Identity and authorization](tutorials/infrastructure-building-blocks/#identity-and-authorization)** belong at every trust boundary. A gateway-only check misses internal access paths.
- **[Metrics, logs and tracing](tutorials/infrastructure-building-blocks/#metrics-logs-and-distributed-tracing)** must propagate context across queues as well as RPCs. A trace is not a durable audit record.
- **[Backup, restore and failover](tutorials/infrastructure-building-blocks/#backup-restore-failover-and-repair):** replication copies corruption and deletions too, a backup is not proven until you restore it, and failover must fence the old writer.

## Architectural patterns

*In depth: [Chapter 5](tutorials/architectural-patterns/). Each pattern name below links to its section.*

### Application structure

| Pattern | Use it for | Watch out for |
|---|---|---|
| [CRUD transactional application](tutorials/architectural-patterns/#crud-and-transactional-application) (L–M) | The default: profiles, catalogs, admin, most operational systems | History needs an explicit mechanism; careless read-modify-write loses updates |
| [Layered design, domain model](tutorials/architectural-patterns/#transaction-script-layered-design-and-domain-model) (L–M) | Procedures for simple rules; a richer model for interacting invariants | Excess layers obscure simple work; hidden data access creates expensive queries |
| [Modular monolith](tutorials/architectural-patterns/#modular-monolith) (L–M) | Domain boundaries still evolving | Shared releases; weak boundaries are hard to extract later |
| [Bounded-context services, private data](tutorials/architectural-patterns/#bounded-context-services-and-private-data-ownership) (H) | Teams, scaling or release cycles justify independent deploys | Remote joins, cross-service invariants, contract evolution; one service per table is excessive coupling |
| [Shared database across services](tutorials/architectural-patterns/#shared-database-across-services) (M at first) | A deliberate transition | Schema and runtime coupling undermine independent releases |
| [API composition, backends for frontends](tutorials/architectural-patterns/#synchronous-api-composition-and-backends-for-frontends) (M–H) | Fresh data from a few services; very different client needs | Latency and failures accumulate; orchestration gets duplicated |
| [Hexagonal architecture](tutorials/architectural-patterns/#hexagonal-architecture-ports-and-adapters) (M) | Important domain logic with several integrations and isolated tests | Extra interfaces; network, schema and transaction constraints remain |

CRUD describes data operations; REST describes an interface. A domain command such as `CancelOrder` works fine on ordinary tables inside one transaction.

### Events, queries and workflows

| Pattern | Use it for | Watch out for |
|---|---|---|
| [Event-driven integration](tutorials/architectural-patterns/#event-driven-integration) (M–H) | Independent downstream reactions | Schema dependencies, lag, ordering, harder end-to-end debugging |
| [CQRS](tutorials/architectural-patterns/#cqrs) (M–H) | Write rules and read shapes that differ enough to need separate models | More models; separate stores add propagation, freshness rules and rebuilds |
| [Event sourcing](tutorials/architectural-patterns/#event-sourcing) (H–VH) | Domains where reconstructing history is a core requirement | Event evolution, replay, projections, sensitive data, correcting past mistakes |
| [Saga orchestration](tutorials/architectural-patterns/#saga-orchestration) (H) | Multi-service processes with branches, timeouts or manual steps | Coordinator state and versioning, intermediate states, failed compensations |
| [Saga choreography](tutorials/architectural-patterns/#saga-choreography) (H–VH) | A small, stable set of participants | A hidden global process, cycles, unclear timeout ownership |
| [Reservation / Try-Confirm-Cancel](tutorials/architectural-patterns/#reservation-and-try-confirm-cancel) (H) | Scarce inventory or capacity | Expiry, stranded reservations, confirm/cancel races; not global ACID |
| [Scatter-gather](tutorials/architectural-patterns/#scatter-gather) (M–H) | Federated search, quotes, partitioned queries | Tail latency, fan-out load, partial results |
| [Pipes and filters](tutorials/architectural-patterns/#pipes-and-filters) (M–H) | Ingestion, media and data processing | Bottleneck stages, checkpointing, duplicate effects, stage versions |
| [Single-writer entity, actors](tutorials/architectural-patterns/#single-writer-entity-and-actor-ownership) (M–H) | Games, sessions, aggregates where local order matters | Hot entities cap throughput; ownership transfer and durability need design |

Scatter-gather needs an explicit **completion rule**: all responses, a deadline, a required subset, or "good enough". Events come in two shapes. A notification ("order 42 changed") forces a follow-up query. Event-carried state ("order 42 shipped to …") lets consumers act alone, at the cost of larger payloads and stronger schema obligations.

### Evolution, isolation and geography

| Pattern | Use it for | Watch out for |
|---|---|---|
| [Anti-corruption layer](tutorials/architectural-patterns/#anti-corruption-layer) (M) | Keeping a legacy or external model out of your domain | Semantic mapping, testing, possible latency; may stay forever |
| [Strangler fig](tutorials/architectural-patterns/#strangler-fig-migration) (H) | Replacing a system too risky to cut over at once | Running both, data migration, clear write ownership at each stage |
| [Zero-downtime schema migration](tutorials/architectural-patterns/#zero-downtime-schema-migration-expand-and-contract) (M–H) | Changing a schema under live traffic | Several deploys, backfill time, dual-write code paths, hidden readers of the old shape |
| [Control / data plane separation](tutorials/architectural-patterns/#control-plane-and-data-plane-separation) (H) | Management changes far less often than serving | Config propagation, stale state; data-plane requests must not call the control plane |
| [Cells, deployment stamps](tutorials/architectural-patterns/#cells-and-deployment-stamps) (H) | Containing failures, overload and rollouts as you grow | Spare capacity, tenant moves, routing; a shared critical dependency defeats isolation |
| [Multi-region](tutorials/architectural-patterns/#multi-region-architecture) (H–VH) | Latency, disaster recovery, data residency | WAN latency, failover ambiguity, conflicts, cost; active-active serving is not multi-writer data |

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

- **Migrations:** [expand, migrate, then contract](tutorials/architectural-patterns/#zero-downtime-schema-migration-expand-and-contract), so old and new versions coexist. Rolling back code does not undo database changes or external effects.
- **Ownership of stuck work:** for every asynchronous path, name who owns stalled work, what alerts, and how it is repaired.
- **What to track:** propagation lag, oldest pending work, dedup hits, failed compensations and rebuild progress, next to user-facing latency and errors.
- **Recovery drills:** set RPO (acceptable data loss) and RTO (acceptable downtime) targets and test restores; a backup's existence proves nothing.

## Using this in the interview

1. **State the owner and the guarantee before the pattern:** "The order service owns order state; a customer must never be charged twice."
2. **Name the smallest pattern and its limit:** "An outbox for `OrderPlaced`; consumers dedupe on the event ID because the relay can resend."
3. **Use the deep-dive shape** from [chapter 1](tutorials/interview-format/#5-deep-dives): problem → options → trade-off → pick → what would change your mind.
4. **Avoid the classic mistakes:** event sourcing for an ordinary CRUD domain, "exactly-once" because the broker says so, sagas described as rollback, a queue to "add capacity", one microservice per table.

**Further reading:** the [AWS cloud design patterns catalog](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/introduction.html), Martin Fowler on [CQRS](https://martinfowler.com/bliki/CQRS.html) and [Monolith First](https://martinfowler.com/bliki/MonolithFirst.html), [transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html), Kleppmann on [fencing tokens](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html), [The Tail at Scale](https://research.google/pubs/the-tail-at-scale/), and the Google SRE chapter on [handling overload](https://sre.google/sre-book/handling-overload/).
