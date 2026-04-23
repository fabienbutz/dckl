---
schema: 1
id: TSK-03
sprint_id: sprint-01-demo
title: Remove legacy session cookie
type: refactor
status: done
security_checks:
  - id: gdpr-storage
    checked: true
  - id: secrets-not-committed
    checked: true
test_criteria:
  - id: t1
    label: 'Unit: old cookie path returns 410 Gone'
    checked: true
  - id: t2
    label: 'Manual: existing sessions still validate until expiry'
    checked: true
corrections: []
updated: '2026-04-23T10:36:59.162Z'
---

## TSK-03: Remove legacy session cookie

The `sid=…` cookie was deprecated when we moved to JWT-in-HttpOnly. Keep the
read path for 30 days to let in-flight sessions expire gracefully, then delete.
