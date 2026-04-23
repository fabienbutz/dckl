---
schema: 1
id: TSK-02
sprint_id: sprint-01-demo
title: Rate-limit middleware for auth endpoints
type: chore
status: todo
security_checks:
  - id: rate-limiting
    checked: false
  - id: input-validation
    checked: false
  - id: secrets-not-committed
    checked: true
test_criteria:
  - id: t1
    label: 'Unit: token bucket algorithm'
    checked: false
  - id: t2
    label: 'Load: 1k req/s against /auth/*'
    checked: false
corrections: []
updated: '2026-04-23T10:36:44.209Z'
---

## TSK-02: Rate-limit middleware for auth endpoints

Global rate limiting in front of `/auth/*` endpoints to prevent credential
stuffing. Token bucket, 10 req/min per IP on `POST`, unlimited on `GET`.
