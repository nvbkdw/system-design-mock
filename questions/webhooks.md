---
title: Webhook delivery
tags: [queues, retries]
difficulty: medium
order: 50
---

## Statement

Design a system that delivers webhook events (for example “batch job completed” or “fine-tune finished”) to customer-provided HTTPS endpoints.

## Interviewer answers

- ~10K events/s peak to ~1M customer endpoints.
- At-least-once delivery; customers dedupe by event id.
- Endpoints are often slow, down or erroring; retry for up to 3 days.
- Per-endpoint ordering is nice to have, not required.
- Customers must verify the sender and see delivery history.

## Where interviewers probe

- Isolating slow endpoints (no head-of-line blocking)
- Retry scheduling with backoff
- Per-endpoint concurrency limits and circuit breaking
- HMAC signing and secret rotation
- SSRF protection for customer URLs
