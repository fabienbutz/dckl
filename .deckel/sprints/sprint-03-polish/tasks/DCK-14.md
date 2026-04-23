---
schema: 1
id: DCK-14
sprint_id: sprint-03-polish
title: Doctor — detect stale .active-task and missing VISION.md updated field
type: feature
status: todo
security_checks:
  - id: input-validation
    checked: false
test_criteria:
  - id: stale-active-task
    label: >-
      Doctor flags `.active-task` pointing to a non-existent or archived
      task (e.g. archived sprint) and offers `--fix` to clear the pointer
    checked: false
  - id: vision-updated-missing
    label: >-
      Doctor flags `.deckel/VISION.md` if the YAML frontmatter has no
      `updated:` field (staleness heuristic silently fails otherwise)
    checked: false
  - id: vision-stale-warning
    label: >-
      Doctor warns when VISION.md `updated:` is older than 90 days
    checked: false
  - id: exit-code
    label: >-
      Exit code 0 when all checks pass, 1 when any warning fires. Keeps CI
      hookability even though CI is a non-goal for now.
    checked: false
corrections: []
context_files:
  - packages/cli/src/commands/doctor.ts
  - packages/cli/tests/doctor.test.ts
depends_on: []
pre_flight:
  - >-
    Existing doctor already validates basic scaffolding. Add two new checks
    without breaking the existing output format — maintainer greps it.
  - >-
    Direct Sprint-02 corrections: DCK-06 c1 (stale .active-task from
    archived sprint-01) and DCK-06 c3 (missing updated: field).
---

## DCK-14: Doctor — stale pointers + VISION staleness

Two concrete doctor gaps, both surfaced by Sprint-02 corrections:

1. **Stale `.active-task`** — when a sprint is archived, the pointer
   isn't cleared. The CLI then treats a no-longer-existing task as
   active, heartbeat writes fail silently.
2. **VISION.md missing `updated:`** — `deckel status` reads the vision
   and relies on `updated:` for staleness. If the field is absent the
   heuristic silently returns "fresh" and the vision rots.

### Approach

```
deckel doctor
  …
  ✓ .deckel/config.yaml present
  ✗ .active-task points to TSK-01 (sprint-01-demo is archived)
    → run `deckel doctor --fix` to clear
  ✗ VISION.md has no `updated:` field
  ⚠ VISION.md updated 127d ago — consider refreshing
```

`--fix` clears stale `.active-task`. It does **not** touch VISION.md
— that's a manual decision ("is my vision still right?").

### Out of scope

- A `deckel doctor --fix-all` that rewrites VISION.md.
- Detecting drift between task `depends_on` and sprint task_ids.
- Performance / timing checks on the server.
