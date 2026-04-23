---
schema: 1
id: TSK-01
sprint_id: sprint-01-demo
title: Passkey registration at signup
type: feature
status: in_progress
security_checks:
  - id: gdpr-storage
    checked: true
  - id: passkey-support
    checked: true
  - id: rate-limiting
    checked: true
  - id: input-validation
    checked: false
test_criteria:
  - id: t1
    label: 'Unit: registration flow happy path'
    checked: true
  - id: t2
    label: 'Integration: end-to-end with real authenticator'
    checked: false
  - id: t3
    label: 'Manual: Firefox on Linux (WebAuthn quirks)'
    checked: false
corrections:
  - id: c1
    text: WebAuthn fails on Firefox Linux with a Yubikey 5
    open: true
    target_sprint: null
  - id: c2
    text: Safari on iOS 17 needs polyfill
    open: true
    target_sprint: null
claim:
  by: test-agent
  at: '2026-04-23T10:49:16.782Z'
  heartbeat: '2026-04-23T10:49:16.782Z'
updated: '2026-04-23T11:20:31.278Z'
---

## TSK-01: Passkey registration at signup

Users can register a passkey during signup. Falls back to TOTP-based 2FA when
no authenticator is available. WebAuthn Level 2 is the target.

**Implementation notes**
- Register endpoint lives at `app/auth/passkey/register.ts`.
- Store public key + user handle; never the credential ID client-side.
- See ADR-003 for the rationale behind the storage shape.
