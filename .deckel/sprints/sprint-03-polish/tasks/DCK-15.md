---
schema: 1
id: DCK-15
sprint_id: sprint-03-polish
title: deckel sprint close <id> — archive + summary + pointer rotation
type: feature
status: todo
security_checks:
  - id: input-validation
    checked: false
test_criteria:
  - id: archive-move
    label: >-
      `deckel sprint close sprint-02-dogfood` moves the folder to
      `.deckel/sprints/.archive/sprint-02-dogfood/` atomically
    checked: false
  - id: summary-written
    label: >-
      Writes `SUMMARY.md` inside the archived sprint: task count, done/open
      corrections, duration, and a changelog excerpt for the sprint window
    checked: false
  - id: refuses-open-tasks
    label: >-
      Refuses to close a sprint with non-done tasks unless `--force` —
      prevents accidental archival of in-flight work
    checked: false
  - id: status-transitions
    label: >-
      Sets sprint index.md `status: done`, clears `.active-task` if it
      referenced a task in this sprint, and removes the sprint from the
      default "active" lookup
    checked: false
corrections: []
context_files:
  - packages/cli/src/commands/sprint.ts
  - packages/cli/src/cli.ts
  - packages/server/src/storage/store.ts
depends_on:
  - DCK-12
pre_flight:
  - >-
    Sprint-02 was closed manually today — 10 PATCHes to set status=done,
    .active-task stayed stale, no summary written. Codify the flow.
  - >-
    Archive directory already exists — `.deckel/sprints/.archive/` was used
    for sprint-01-demo. Keep that layout.
---

## DCK-15: `deckel sprint close <id>`

Closing a sprint by hand took ~10 commands today. Formalize it.

### Why

A sprint close is a real event — it's when the work should be
reflected on, when corrections get triaged forward, when the
CHANGELOG gets a summary header. If it takes 10 commands, it does not
happen; if it happens inconsistently, `.archive/` becomes useless.

### Semantics

```
deckel sprint close sprint-02-dogfood
deckel sprint close sprint-02-dogfood --force    # allow non-done tasks
deckel sprint close sprint-02-dogfood --dry-run  # print the plan, no writes
```

Does, in order:
1. Validate: all tasks done (unless `--force`).
2. Compute summary: task count, open/resolved corrections, date range,
   related changelog lines.
3. Write `SUMMARY.md` into the sprint folder.
4. Set sprint `status: done`.
5. Move folder → `.archive/`.
6. Clear `.active-task` if it pointed into this sprint.
7. Append a header entry to `.deckel/CHANGELOG.md`.

### Out of scope

- `sprint open` (create a new sprint). Separate command if ever needed.
- Auto-carryover of incomplete tasks to the next sprint.
- UI confirmation dialogue — CLI-only for now.
