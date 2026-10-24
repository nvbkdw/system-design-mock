---
title: Token-based rate limits
tags: [rate limiting, consistency]
difficulty: medium
order: 30
---

## Statement

Design rate limiting and quotas for a public LLM API. Each organization has limits on requests per minute and tokens per minute for each model, plus a monthly spend cap. Limits apply across all API servers in all regions.

## Interviewer answers

- ~1M requests/s peak checked against limits; ~5M orgs, most tiny, a few very large.
- The limit check may add at most ~2ms p99.
- Output token count is unknown until the response finishes.
- A few percent of temporary overshoot is fine; large overshoot of spend caps is not.
- Limit changes (upgrades) take effect within a minute.

## Where interviewers probe

- Token bucket vs sliding window
- Reserve estimated tokens, reconcile after completion
- Sharding counters and hot orgs
- Local vs global counting across regions
- Fail open vs fail closed when the counter store is down
