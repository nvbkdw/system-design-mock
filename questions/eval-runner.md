---
title: Model evaluation runner
tags: [orchestration, fairness]
difficulty: medium
order: 80
---

## Statement

Design a system researchers use to run evaluation suites against model checkpoints. A run executes thousands of eval tasks, each calling a model many times, and produces scores comparable across checkpoints.

## Interviewer answers

- ~500 runs/day; 1K–50K tasks per run; tasks take seconds to hours.
- Runs share a limited inference pool with other research work.
- Same checkpoint + suite version must give comparable scores.
- Researchers want live progress, cancel, and rerun of failed tasks.

## Where interviewers probe

- Task scheduling and fairness between teams
- Retries and flaky tasks
- Caching model outputs
- Raw outputs vs aggregate metrics storage
- Versioning datasets and graders
