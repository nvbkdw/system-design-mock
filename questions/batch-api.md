---
title: Batch inference API
tags: [scheduling, gpu]
difficulty: hard
order: 60
---

## Statement

Design a batch API where customers upload a file of up to 50,000 model requests and the system completes them within 24 hours at half price, using spare GPU capacity.

## Interviewer answers

- ~100K batches/day; 5K requests per batch on average; files up to 200MB.
- Results download as a file; partial progress is visible.
- Online traffic has priority: batch work must give back GPUs within seconds.
- Each request runs exactly once from the customer's view (billing).

## Where interviewers probe

- Job and task state machine
- Scheduling into idle capacity; preemption
- Worker leases and heartbeats
- Idempotent execution and result writes
- Deadline-aware prioritization
