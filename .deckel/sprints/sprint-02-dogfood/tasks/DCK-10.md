---
schema: 1
id: DCK-10
sprint_id: sprint-02-dogfood
title: deckel stop — graceful shutdown of the local server
type: chore
status: done
security_checks:
  - id: input-validation
    checked: true
test_criteria:
  - id: stop-graceful
    label: 'Sends SIGTERM to the PID in .port, waits for exit, .port is removed'
    checked: true
  - id: stop-no-server
    label: 'With no .port file, reports ''nothing to stop'' and exits 0'
    checked: true
  - id: stop-stale
    label: 'With a .port pointing at a dead PID, removes the file without signaling'
    checked: true
  - id: stop-force
    label: '--force escalates to SIGKILL after 2s if SIGTERM did not land'
    checked: true
corrections: []
context_files:
  - packages/cli/src/commands/stop.ts
  - packages/cli/src/cli.ts
depends_on: []
pre_flight:
  - >-
    Verify the existing serve.ts shutdown handler removes .port on SIGTERM (it
    does — see serve.ts shutdown())
updated: '2026-04-23T12:13:20.438Z'
---

## DCK-10: deckel stop — graceful shutdown

A `pnpm deckel stop` command that reads `.deckel/.port`, signals the
running server to exit, and cleans up the stale port file.

### Why

Every dogfood session in this sprint has accumulated stray servers —
see DCK-09 correction `c2`. `pkill -f "packages/cli/dist/cli.js serve"`
works but:

- Requires knowing the exact command path to kill.
- Does not clean up `.port`, so the next `pnpm deckel` walks past the
  intended port and settles on an auto-incremented one, which then
  confuses every CLI command that reads `.port`.
- Is not discoverable — users reach for it after minutes of confusion.

`deckel stop` closes the loop: it's the canonical shutdown command,
uses the `.port` lock as the source of truth for which PID to signal,
and guarantees the next `pnpm deckel` starts on the canonical port.

### Out of scope

- A pm2-style process manager.
- Cross-machine or remote shutdown.
- Auto-idle-shutdown.
- A single-command dev flow (`pnpm dev:all` that boots deckel + vite).
