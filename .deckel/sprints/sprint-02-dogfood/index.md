---
schema: 1
id: sprint-02-dogfood
name: Dogfood Deckel on itself
goal: Build the features Deckel needs to track its own development, and prove the tool survives real daily use before any distribution push
status: done
start: 2026-04-23
end: 2026-05-14
based_on: null
task_ids:
  - DCK-01
  - DCK-02
  - DCK-03
  - DCK-04
  - DCK-05
  - DCK-06
  - DCK-07
  - DCK-08
  - DCK-09
  - DCK-10
---

## Sprint 02 — Dogfood

Deckel now has enough surface (board, drawer, sidebar, claim/release,
check, correction, export, status, vision) that it can track its own
continued development. This sprint is that experiment — every task
below is work that Deckel itself genuinely needs, not invented demo
data. If we can ship these eight tasks *using Deckel*, the tool has
earned the right to be shown to other solo devs.

### Exit criteria

- Every task in this sprint has been claimed, worked, checked off,
  released, and marked done using Deckel commands only.
- `deckel status` reports the sprint as `review` with zero open
  reminders across the active set.
- A minimum of five real corrections appear in the tasks, logged via
  `deckel correction add` during implementation.
- The changelog (`.deckel/CHANGELOG.md`) tells a coherent story of the
  sprint without any manual edits.

### Out of scope for this sprint

- Distribution (npm publish, release automation) — lands in Sprint 03.
- Cloud sync / team collab — explicit project non-goal.
- Mobile / responsive UI work.
