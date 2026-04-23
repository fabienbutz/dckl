---
schema: 1
id: DCK-09
sprint_id: sprint-02-dogfood
title: Live UI updates — SSE instead of 5s polling
type: feature
status: done
security_checks:
  - id: rate-limiting
    checked: false
  - id: input-validation
    checked: true
test_criteria:
  - id: sse-stream
    label: >-
      Server: GET /api/events streams events as SSE (Content-Type
      text/event-stream)
    checked: true
  - id: sse-emit
    label: >-
      Server: after patchTask/claimTask/releaseTask, an event is emitted on the
      bus
    checked: true
  - id: ui-invalidates
    label: >-
      UI: on incoming event, affected queries invalidate and refetch within 500
      ms
    checked: true
  - id: ui-cleanup
    label: >-
      UI: EventSource is closed on unmount; no leaked connections after
      navigation
    checked: true
corrections:
  - id: c1
    text: >-
      Claim does not auto-transition todo→in_progress, so amber pulse never
      triggers on just-claimed tasks. Amber = in_progress+fresh-claim by design,
      but claim leaves status untouched. Need to auto-bump in Store.claimTask.
    open: true
    target_sprint: null
  - id: c2
    text: >-
      UI race bug: clicking two checks in quick succession can revert the first
      because onToggleReminder derives nextChecks from closure meta, not from
      the freshest cache state. Rapid clicks → second patch uses stale
      meta.security_checks array, effectively overwriting the first toggle.
    open: true
    target_sprint: null
  - id: c3
    text: >-
      Rate-limiting on /api/events not implemented — currently unlimited
      subscriptions. Acceptable for localhost-only (our non-goal to stay local),
      but left deliberately unchecked on this task.
    open: true
    target_sprint: null
context_files:
  - packages/server/src/events/bus.ts
  - packages/server/src/routes/events.ts
  - packages/server/src/index.ts
  - packages/server/src/storage/store.ts
  - packages/ui/src/lib/use-live-updates.ts
  - packages/ui/src/main.tsx
  - packages/ui/src/lib/queries.ts
depends_on: []
pre_flight:
  - >-
    Confirm CSRF middleware only guards write methods — SSE GET must pass
    through without a token header
  - >-
    Decide event granularity: single 'state.changed' vs. per-resource events
    (task/sprint/config)
updated: '2026-04-23T11:53:02.735Z'
---

## DCK-09: Live UI updates — SSE instead of 5s polling

Replace the 5-second polling on `useSprint`, `useTask`, and the parallel
`useQueries` in `App.tsx` with a live SSE stream. Server emits events on
every state change (claim / heartbeat / release / patch); UI reacts by
invalidating the affected TanStack Query keys.

### Why

The whole promise of the amber-pulse indicator falls apart if the UI is
up to 5 seconds behind the actual state. This was flagged in the original
engineering review ("SSE statt Polling") and deferred. Dogfood made it
obvious: I ran `dckl check DCK-06 <id>` six times during
implementation, and nothing changed in the UI until I manually refreshed.

### Out of scope

- WebSocket full-duplex (read-only stream is enough).
- Reconnect-with-backoff beyond the EventSource default.
- Event replay / catch-up after a missed connection — UI does an initial
  refetch on reconnect, that's sufficient.
- Server-side event retention (stream is ephemeral).
