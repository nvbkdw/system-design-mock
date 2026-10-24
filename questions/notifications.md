---
title: Notification service
tags: [fan-out, queues]
difficulty: medium
order: 100
---

## Statement

Design a service that sends push, email and in-app notifications when events happen, such as a reply to a shared conversation, a completed task, or a billing alert.

## Interviewer answers

- ~200M users; ~50M notifications/day, with 10× spikes during launches.
- Users set preferences per channel and quiet hours.
- Critical notifications (billing, security) must not be dropped; others can be.
- Providers (APNs, FCM, email) have their own rate limits and outages.

## Where interviewers probe

- Fan-out and priority queues
- Dedupe and collapsing
- Preference lookups at scale
- Provider rate limits and failover
- Delivery tracking
