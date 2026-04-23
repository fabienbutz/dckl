---
schema: 1
id: DCK-13
sprint_id: sprint-03-polish
title: deckel correction resolve <id> <cid> — close corrections
type: feature
status: todo
security_checks:
  - id: input-validation
    checked: false
test_criteria:
  - id: marks-resolved
    label: >-
      `deckel correction resolve DCK-06 c1` sets `open: false` on that
      correction, updates `updated:`, and preserves all other fields
    checked: false
  - id: unknown-cid-errors
    label: >-
      Unknown correction id exits non-zero with a clear message, no file
      mutation
    checked: false
  - id: target-sprint
    label: >-
      Supports `--target-sprint <id>` to move the correction forward to a
      future sprint (sets `target_sprint:` and `open: false`)
    checked: false
  - id: status-visible
    label: >-
      `deckel status` counts only `open: true` corrections — resolved ones
      are hidden from the "Gap" section
    checked: false
corrections: []
context_files:
  - packages/cli/src/commands/correction.ts
  - packages/cli/src/cli.ts
  - packages/cli/src/commands/status.ts
depends_on: []
pre_flight:
  - >-
    End of Sprint-02 left 15 open corrections; most are either already
    handled or non-goal — they need an explicit close path, not silent rot.
  - >-
    `correction add` writes via the API's task PATCH. Mirror that pathway
    for `resolve` so ETag guards still apply.
---

## DCK-13: `deckel correction resolve <id> <cid>`

Corrections are the breadcrumbs agents leave during implementation —
"scope expanded", "context_files missed X". They accumulate. Sprint-02
ended with 15 open corrections, most actually resolved, but there is
no way to mark them so. `deckel status` keeps flagging them forever.

### Why

- `correction add` exists but has no inverse.
- Manual YAML edit is error-prone (indentation, wrong key).
- Future sprints can't inherit corrections cleanly without a
  `--target-sprint` handoff.

### Semantics

```
deckel correction resolve DCK-06 c1
deckel correction resolve DCK-06 c3 --target-sprint sprint-03-polish
deckel correction list DCK-06              # stretch: show open corrections
```

- `resolve` sets `open: false` and bumps `updated:`.
- `--target-sprint` additionally sets `target_sprint:` — the
  correction is still closed on the source task, but forwarded.
- Unknown task or correction id → exit 1 with a clear message.

### Out of scope

- `correction edit` (change text after adding).
- Cross-task correction rollup view in the UI.
- Auto-resolve when a linked file is committed.
