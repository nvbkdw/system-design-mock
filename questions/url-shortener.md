---
title: TinyURL shortener service
tags: [storage, caching, id generation]
difficulty: easy
# The classic warm-up, listed first.
order: 5
---

## Statement

Design a URL shortening service like TinyURL. A user submits a long URL and gets back a short alias, such as https://tinyurl.com/y7keocwj. Anyone who opens the short link is redirected to the original URL.

The service should be fast for visitors following links, never hand out the same alias for two different URLs, and keep links working for years.

## Interviewer answers

- ~100M new short URLs per day; reads (redirects) are about 10× writes.
- Short codes should be as short as possible, using only 0-9, a-z and A-Z.
- Links are kept for 10 years and cannot be edited once created. Deletion and custom aliases are nice to have.
- Redirect latency matters most: aim for < 50ms p99 from the service, with high availability.
- Shortening the same long URL twice may return the same alias or a new one; your choice, but explain it.
- Out of scope for the core design: user accounts, paid plans, link previews.

## Where interviewers probe

- Capacity math: writes/s, reads/s, records and storage over 10 years
- How many characters the short code needs (62ⁿ vs total links)
- Hash + collision handling vs base62 of a unique ID generator
- Generating unique IDs across many servers without coordination on every write
- 301 vs 302 redirects: browser caching vs click analytics
- Caching hot links and what happens on a cache miss storm
- Abuse: spam or malicious URLs, enumeration of sequential codes
