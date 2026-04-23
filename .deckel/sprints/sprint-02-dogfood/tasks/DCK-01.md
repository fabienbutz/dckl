---
schema: 1
id: DCK-01
sprint_id: sprint-02-dogfood
title: 'Journeys — schema, parser, CLI'
type: feature
status: done
security_checks:
  - id: input-validation
    checked: true
  - id: secrets-not-committed
    checked: true
test_criteria:
  - id: unit-roundtrip
    label: 'Unit: journey parse → stringify → parse is stable'
    checked: true
  - id: api-crud
    label: 'API: POST/GET/PATCH /api/journeys work with CSRF + ETag'
    checked: true
  - id: cli-create
    label: 'CLI: deckel journey new <slug> scaffolds .deckel/journeys/<slug>.md'
    checked: true
corrections:
  - id: c1
    text: >-
      Sidebar still shows fake journey placeholders ('Signup flow', 'Password
      reset') despite real journey API existing. Sidebar does NOT render actual
      journeys from /api/journeys. Fixing in this same session as a patch —
      scope expansion to UI files (sidebar, app, queries, api, new JourneyView
      component) per SKILL edge-case rule. Also adding count-badge on Stack
      sidebar item for visual parity.
    open: true
    target_sprint: null
context_files:
  - packages/server/src/schema/journey.ts
  - packages/server/src/schema/index.ts
  - packages/server/src/storage/journey-io.ts
  - packages/server/src/storage/store.ts
  - packages/server/src/routes/journeys.ts
  - packages/server/src/index.ts
  - packages/cli/src/commands/journey.ts
  - packages/cli/src/cli.ts
depends_on: []
pre_flight:
  - Re-read the Journeys section in .claude/skills/deckel/SKILL.md
  - Confirm the repo has zero existing .deckel/journeys/ files before coding
updated: '2026-04-23T12:57:56.202Z'
---

## DCK-01: Journeys — schema, parser, CLI

Introduce the Journey concept as a first-class Deckel entity. A Journey is
an ordered list of routes a user traverses to reach a goal (e.g. signup:
`/` → `/signup` → `/verify-email` → `/onboarding` → `/dashboard`). Each
step has a status (done / todo / broken) and may reference tasks.

### Why

The Journey concept was cut from every earlier sprint as "Sprint 3.5" and
ended up being the one placeholder that never dies. Dogfooding is the
right time to close it: the SKILL.md references Journeys, the sidebar has
a placeholder for them, users will ask. Either we ship it or we tear out
all the references.

### Out of scope

- UI for journey editing or visualisation (tracked separately in DCK-02
  section if needed — MVP here is read-only JSON endpoint).
- Auto-detecting broken steps via HTTP pings against the routes.
- Link-rot detection.
