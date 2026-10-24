---
title: File search for assistants
tags: [retrieval, multi-tenant]
difficulty: hard
order: 70
---

## Statement

Design a service that lets users upload documents (PDFs, docs, code) to an assistant and answers questions grounded in them by retrieving relevant passages.

## Interviewer answers

- ~10M uploads/day, 2MB on average, up to 512MB; scoped to a user or workspace.
- Files are searchable within ~1 minute of upload.
- Retrieval adds < 300ms p95 to a chat turn.
- Strict tenant isolation.
- Deleted files stop appearing in results immediately.

## Where interviewers probe

- Ingestion: parse, chunk, embed, with retries
- Embedding cost and GPU batching
- Vector index per tenant vs shared with filters
- Hybrid keyword + vector retrieval
- Deletion and index consistency
