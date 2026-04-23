---
schema: 1
id: DCK-07
sprint_id: sprint-02-dogfood
title: Vite dev proxy — make `pnpm dev` work end-to-end
type: chore
status: done
security_checks:
  - id: input-validation
    checked: true
  - id: rate-limiting
    checked: false
test_criteria:
  - id: hot-reload
    label: >-
      Workflow: `pnpm dckl` on one terminal + `pnpm dev` on another = UI with
      hot-reload that hits the real API
    checked: true
  - id: token-fallback
    label: 'api.ts: if no meta token, falls back to GET /api/token once and caches'
    checked: true
  - id: docs-updated
    label: docs/getting-started.md explains the two-terminal dev workflow
    checked: true
corrections:
  - id: c1
    text: >-
      context_files missed docs/getting-started.md despite docs-updated test
      criterion. Expanding scope per SKILL edge-case rule (log-before-edit) to
      include it.
    open: true
    target_sprint: null
  - id: c2
    text: >-
      Rate-limiting not added to SSE or proxy path either — same scope as
      DCK-09's c3. Deliberately unchecked; fits local-only non-goal.
    open: true
    target_sprint: null
context_files:
  - packages/ui/vite.config.ts
  - packages/ui/src/lib/api.ts
  - packages/cli/src/commands/serve.ts
  - package.json
depends_on: []
pre_flight:
  - >-
    Confirm Vite's server.proxy config handles /api/* correctly against a
    non-5173 backend
updated: '2026-04-23T12:13:18.821Z'
---

## DCK-07: Vite dev proxy — make `pnpm dev` work end-to-end

Right now `pnpm dev` starts Vite on :5173 with no API backend, so the UI
looks broken ("No sprints"). Fix: Vite proxies `/api/*` to the running
`pnpm dckl` server (on 4321 or whichever port it settled on), and the
API client fetches the CSRF token from `/api/token` when no HTML meta
tag is present (dev mode).

### Why

This was S2-6 on the original roadmap and kept getting deferred. Until
it's fixed, every UI iteration requires a full CLI build round. That's
the friction that kills velocity on future UI work.

### Out of scope

- Auto-starting the backend from `pnpm dev` (two-terminal is fine;
  single-command comes later).
- Hot-reload for the server itself (TypeScript watch is enough).
- Production-mode serving changes.
