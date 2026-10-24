---
title: Code execution sandbox
tags: [isolation, stateful]
difficulty: hard
order: 90
---

## Statement

Design the backend that runs user-requested Python code for a chat assistant. Each conversation gets a sandbox that keeps files and variables between turns, can install packages, and returns stdout, files and charts.

## Interviewer answers

- ~5M sessions/day, ~1M concurrent at peak; most idle between turns.
- Code is untrusted; no network egress by default.
- Execution starts within 1s for a warm session, < 5s cold.
- Sessions expire after 1 hour idle; CPU and memory limits per execution.

## Where interviewers probe

- Containers vs gVisor vs microVMs
- Warm pools; snapshot and restore
- Routing turns to the session's host; host failure
- Resource limits and abuse
- File storage and cleanup
