---
schema: 1
id: DCK-06
sprint_id: sprint-02-dogfood
title: deckel doctor — validate .deckel/ consistency
type: feature
status: done
security_checks:
  - id: input-validation
    checked: true
test_criteria:
  - id: detects-missing
    label: 'Detects: missing .deckel/, missing config.yaml, malformed task frontmatter'
    checked: true
  - id: detects-orphan
    label: 'Detects: task files not referenced in any sprint''s task_ids'
    checked: true
  - id: detects-stale-claim
    label: 'Detects: claims older than 24h (suspicious; user should release)'
    checked: true
  - id: detects-hook
    label: 'Detects: .claude/settings.json hook is not installed'
    checked: true
  - id: exit-codes
    label: 'Exits 0 if all-green, 1 if warnings, 2 if errors'
    checked: true
corrections:
  - id: c1
    text: >-
      Stale .active-task pointed at archived task TSK-01 (sprint-01-demo was
      archived but pointer wasn't cleared). Doctor should detect this.
    open: true
    target_sprint: null
  - id: c2
    text: >-
      Multiple stray servers accumulate during dogfood testing — no 'deckel
      stop' command, manual pkill needed. A graceful shutdown command would
      reduce the 'restart dance'.
    open: true
    target_sprint: null
  - id: c3
    text: >-
      Doctor does not yet check for 'VISION.md has no updated: field' — which
      would break the stale-detection heuristic silently. Add to next iteration.
    open: true
    target_sprint: null
context_files:
  - packages/cli/src/commands/doctor.ts
  - packages/cli/src/cli.ts
depends_on: []
updated: '2026-04-23T12:13:33.321Z'
---

## DCK-06: deckel doctor — validate .deckel/ consistency

A `deckel doctor` command that scans the `.deckel/` tree and reports
inconsistencies. Read-only. Exit codes distinguish clean / warnings /
errors so it can be chained into shell scripts.

### Why

Over time `.deckel/` drifts: orphaned task files (no sprint references
them), corrupted frontmatter from a bad manual edit, stale claims from a
crashed server, missing hooks from a partially-applied `deckel init`.
Users need a single command to audit the state before it becomes a
debugging rabbit-hole.

### Out of scope

- Auto-fixing problems (reporting only for MVP; `--fix` flag is
  post-MVP).
- Performance benchmarking of the `.deckel/` tree.
- Cross-repo checks.
