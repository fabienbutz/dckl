---
schema: 1
id: DCK-02
sprint_id: sprint-02-dogfood
title: Stack-View in UI — CLAUDE.md / skills / rules reader
type: feature
status: done
security_checks:
  - id: input-validation
    checked: true
  - id: rate-limiting
    checked: false
  - id: secrets-not-committed
    checked: true
test_criteria:
  - id: api-allowlist
    label: >-
      API: GET /api/stack/file rejects paths outside the allowlist (path
      traversal)
    checked: true
  - id: ui-tree
    label: >-
      UI: tree shows CLAUDE.md (project) + skills + rules + commands, grouped by
      category
    checked: true
  - id: ui-render
    label: >-
      UI: markdown renders with code blocks and respects frontmatter as a
      metadata header
    checked: true
corrections:
  - id: c1
    text: >-
      Rate-limiting on /api/stack/file not implemented — same scope decision as
      DCK-09 c3 (local-only non-goal).
    open: true
    target_sprint: null
context_files:
  - packages/server/src/routes/stack.ts
  - packages/server/src/storage/stack-scanner.ts
  - packages/server/src/index.ts
  - packages/ui/src/lib/api.ts
  - packages/ui/src/lib/queries.ts
  - packages/ui/src/components/StackView.tsx
  - packages/ui/src/components/MarkdownReader.tsx
  - packages/ui/src/App.tsx
  - packages/ui/src/components/Sidebar.tsx
depends_on: []
pre_flight:
  - >-
    Confirm react-markdown is small enough to fit the bundle budget (< 60 KB
    gzipped)
  - Decide on allowlist strategy for the /api/stack/file endpoint
updated: '2026-04-23T12:57:56.231Z'
---

## DCK-02: Stack-View in UI — CLAUDE.md / skills / rules reader

Replace the `Stack` sidebar placeholder with a real two-pane view: file
tree on the left, rendered markdown on the right. Scope at MVP: project
CLAUDE.md, `.claude/skills/**/SKILL.md`, `.claude/rules/**/*.md`,
`.claude/commands/**/*.md`. Everything read-only.

### Why

Without this, the sidebar lies: three items claim "soon", user clicks,
nothing happens. The markdown reader is also how Claude-Code-users
discover what skills and rules the project ships with — crucial context
that otherwise lives unread.

### Out of scope

- Editing files (read-only for MVP).
- Claude-memory reader — separate task (DCK-04) because it needs
  different path resolution and has privacy implications.
- Docs folder indexing — separate task (DCK-03).
- Syntax highlighting for fenced code blocks (bundle cost; add later).
