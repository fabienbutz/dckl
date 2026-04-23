---
schema: 1
id: DCK-08
sprint_id: sprint-02-dogfood
title: 'deckel init writes a real starter sprint, not an empty shell'
type: feature
status: done
security_checks:
  - id: secrets-not-committed
    checked: true
test_criteria:
  - id: creates-sprint
    label: >-
      `deckel init --yes` in an empty project creates a starter sprint with 3
      demo tasks
    checked: true
  - id: tasks-teachable
    label: >-
      The three starter tasks demonstrate: claim, check, correction — each one
      exercises one mechanic
    checked: true
  - id: first-run-no-empty
    label: >-
      `pnpm deckel` right after init shows a populated board, not the 'No
      sprints' empty state
    checked: true
corrections:
  - id: c1
    text: >-
      Deviating from context_files: keeping starter-sprint and starter-task as
      inline TS constants (packages/cli/src/starter-templates.ts) rather than
      .md files in a templates/ dir. Rationale: no tsup asset-copy pipeline
      needed, consistent with how init.ts already inlines
      DEFAULT_SECURITY_TEMPLATE.
    open: true
    target_sprint: null
context_files:
  - packages/cli/src/commands/init.ts
  - packages/cli/templates/starter-sprint.md
  - packages/cli/templates/starter-task.md
depends_on: []
pre_flight:
  - >-
    Decide whether the starter sprint is opt-in (--demo flag) or default
    (--no-demo to skip)
updated: '2026-04-23T12:21:36.158Z'
---

## DCK-08: deckel init writes a real starter sprint, not an empty shell

After `deckel init`, the UI is empty. Users don't know what a good task
looks like, what `claim` does, or why the amber pulse matters. Fix:
scaffold a 3-task starter sprint (`sprint-00-welcome`) that the user can
work through to learn the tool, then delete.

### Why

The first-run experience is currently a white screen that says "No
sprints yet — see Sprint 3 for creation UI". Users leave. The starter
sprint is both the onboarding tutorial AND the proof-of-concept: it
shows that Deckel's opinions are worth a first read.

### Out of scope

- Interactive tour overlays in the UI.
- Video / animated demo.
- Project-type-specific starters (web-app vs. CLI vs. library) — single
  generic starter for MVP.
