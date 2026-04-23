---
schema: 1
id: DCK-05
sprint_id: sprint-02-dogfood
title: Changelog viewer in UI
type: feature
status: done
security_checks:
  - id: input-validation
    checked: true
test_criteria:
  - id: live-refresh
    label: >-
      UI: new events appear in the viewer within 5s of a PATCH (poll interval or
      SSE)
    checked: true
  - id: day-grouping
    label: 'UI: entries grouped by day, newest-first'
    checked: true
  - id: sidebar-active
    label: 'Sidebar: Changelog item becomes clickable (remove placeholder state)'
    checked: true
corrections:
  - id: c1
    text: >-
      context_files missed packages/ui/src/App.tsx — required to add an
      activeView state for switching between board and changelog views.
      Expanding scope per SKILL edge-case rule.
    open: true
    target_sprint: null
  - id: c2
    text: >-
      use-live-updates.ts needs to invalidate the changelog query on
      task.updated events, but that file is outside context_files. Same
      expansion reason.
    open: true
    target_sprint: null
context_files:
  - packages/server/src/routes/changelog.ts
  - packages/server/src/index.ts
  - packages/ui/src/components/ChangelogView.tsx
  - packages/ui/src/components/Sidebar.tsx
  - packages/ui/src/lib/api.ts
  - packages/ui/src/lib/queries.ts
depends_on: []
pre_flight:
  - >-
    Confirm the existing appendChangelog writer covers the event types we want
    to display
updated: '2026-04-23T12:13:17.437Z'
---

## DCK-05: Changelog viewer in UI

The changelog is already being written to `.dckl/CHANGELOG.md` on every
PATCH. This task exposes it in the UI as a dedicated view: click the
`Changelog` sidebar item, see a reverse-chronological list of events,
grouped by day.

### Why

Right now users only see the changelog via `cat` or `git diff`. A UI view
makes the project's heartbeat visible — and closes the feedback loop on
"did my click actually persist?".

### Out of scope

- Editing or deleting changelog entries.
- Per-task changelog filtering (nice-to-have for DCK-10+).
- Export to a human-readable release-notes format.
