---
schema: 1
id: sprint-03-polish
name: Dogfood polish
goal: Close the pain points surfaced while running Sprint-02 through dckl itself, before any external user tries the tool
status: active
start: 2026-04-23
end: 2026-05-07
based_on: sprint-02-dogfood
task_ids:
  - DCK-11
  - DCK-12
  - DCK-13
  - DCK-14
  - DCK-15
  - DCK-16
  - DCK-17
  - DCK-18
  - DCK-19
  - DCK-20
  - DCK-21
  - DCK-22
  - DCK-23
  - DCK-24
  - DCK-25
  - DCK-26
  - DCK-27
---

## Sprint 03 — Dogfood polish

Sprint-02 proved dckl can track its own development. Sprint-03 closes
the friction points that sprint surfaced — missing CLI commands, stale
state detection, sidebar UX — before any external user tries the tool.

Every task in this sprint fixes something that genuinely annoyed the
maintainer while working through Sprint-02.

### Exit criteria

- `dckl task close <id>` and `dckl correction resolve <id> <cid>`
  replace every manual API PATCH or file edit used in Sprint-02.
- `dckl sprint close <id>` can retire a sprint end-to-end.
- Doctor catches stale `.active-task` pointers and missing `updated:`
  fields in `VISION.md`.
- Sidebar task rows show a summary line below the title.
- SKILL.md + CLAUDE.md describe the current CLI surface — no leftover
  references to Sprint-02 workarounds.

### Out of scope

- Rate-limiting on localhost endpoints (non-goal — stays local-only).
- Git integration (changelog from commit messages) — own sprint.
- Keyboard shortcuts and UI polish beyond the sidebar row layout.
- Distribution / `npm publish` story — depends on polish landing first.
