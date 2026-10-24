---
title: Usage metering and billing
tags: [streaming data, exactly-once]
difficulty: hard
order: 40
---

## Statement

Design the pipeline that records token usage for every API request and turns it into customer invoices and a near-real-time usage dashboard.

## Interviewer answers

- ~50K requests/s peak, each emitting a usage event (org, project, model, tokens, timestamp).
- The dashboard may lag up to 5 minutes; monthly invoices must be exact.
- No event may be lost or counted twice.
- Prices change over time and differ by model and by contract.
- Some regions deliver events hours late.

## Where interviewers probe

- Exactly-once aggregation: idempotency keys and dedupe
- Event time vs processing time; late data
- Raw event retention for audits
- Reconciliation against inference logs
- Recomputing invoices after a pricing bug
