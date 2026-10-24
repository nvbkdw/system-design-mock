---
title: LLM inference gateway
tags: [gpu, routing, streaming]
difficulty: hard
order: 20
---

## Statement

Design the API gateway in front of a fleet of GPU model servers. It accepts developer requests for several models, authenticates them, applies limits, routes each request to a suitable model replica, and streams the response back.

## Interviewer answers

- ~5M developer orgs; peak 50K requests/s across all models.
- Average request: 1.5K input tokens, 500 output tokens; streams last 5–60s.
- Tens of thousands of GPUs in 4 regions; capacity per model is fixed in the short term.
- Paid tiers: time to first token < 1s p95. Free tier is best-effort.
- API availability target 99.9%.

## Where interviewers probe

- Concurrent streams via Little's Law
- Routing: least-loaded vs prefix/KV-cache affinity
- Admission control and priority queues when GPUs are saturated
- Client disconnects; cancelling work on the GPU
- Region failover; retries that duplicate expensive work
