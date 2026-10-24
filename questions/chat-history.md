---
title: Conversation history for a chat assistant
tags: [storage, streaming]
difficulty: medium
order: 10
---

## Statement

Design the backend that stores and serves conversation history for a ChatGPT-like assistant. Users create conversations, send messages, and receive model responses that stream token by token. They can reopen any past conversation on any device, rename or delete it, and search their history.

## Interviewer answers

- ~300M weekly active users, ~100M daily; ~10 conversations per user per day, ~10 messages each.
- Prompts average ~500B; responses ~2–4KB, some over 100KB.
- Conversation list loads in < 200ms p99; reopening a conversation in < 500ms p99.
- Kept until the user deletes it; deletion must be complete within 30 days.
- A message sent on phone should show on laptop within a few seconds.
- Model inference is out of scope: treat it as a service that streams tokens.

## Where interviewers probe

- Partition key: user_id vs conversation_id
- Hot/cold tiering for old conversations
- Persisting a response while it streams; client disconnects mid-stream
- Search indexing pipeline
- Hard deletion across replicas, caches, search index and backups
