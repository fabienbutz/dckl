---
schema: 1
id: DCK-03
sprint_id: sprint-02-dogfood
title: Docs indexer — surface docs/**/*.md in the Stack-View
type: feature
status: done
security_checks:
  - id: input-validation
    checked: true
test_criteria:
  - id: scan-respects-ignore
    label: 'Scanner: respects .dcklignore + built-in ignores'
    checked: true
  - id: ui-docs-section
    label: 'UI: Docs section appears in Stack-View, sorted by mtime DESC'
    checked: true
  - id: link-related-docs
    label: 'Task frontmatter related_docs: [path] renders a clickable link to the doc'
    checked: true
corrections:
  - id: c1
    text: >-
      link-related-docs needs click-to-open handoff from TaskDrawer to
      StackView. Expanding scope to packages/ui/src/components/TaskDrawer.tsx
      and packages/ui/src/App.tsx for controlled StackView path state (per SKILL
      edge-case rule).
    open: true
    target_sprint: null
context_files:
  - packages/server/src/storage/stack-scanner.ts
  - packages/server/src/routes/stack.ts
  - packages/ui/src/components/StackView.tsx
depends_on:
  - DCK-02
updated: '2026-04-23T12:57:56.254Z'
---

## DCK-03: Docs indexer — surface docs/**/*.md in the Stack-View

Extend the Stack scanner (from DCK-02) to index `docs/**/*.md` and show
them as their own section. Include mtime-sorted listing with first H1 as
a preview. Link tasks' `related_docs` field to actual doc files so Claude
(and the user) can jump to the context without leaving the UI.

### Why

Claude produces docs during development (ADRs, API notes, migration
writeups). Without indexing they drift into orphanhood. Linking tasks
to docs closes the traceability loop.

### Out of scope

- Doc writing / editing from the UI.
- Doc freshness warnings (nice-to-have for later).
- Auto-extracting "what feature does this doc describe".
