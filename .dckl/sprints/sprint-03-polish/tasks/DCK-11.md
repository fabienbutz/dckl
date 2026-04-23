---
schema: 1
id: DCK-11
sprint_id: sprint-03-polish
title: Sidebar task rows — summary line + layout polish
type: feature
status: done
security_checks:
  - id: input-validation
    checked: true
test_criteria:
  - id: summary-extracted
    label: >-
      Each task row in the SprintBoard renders the task title plus a one-line
      summary auto-extracted from the task body (first prose line after the `##
      <ID>:` heading)
    checked: true
  - id: truncation
    label: >-
      Summary is truncated to a single line with ellipsis when it exceeds the
      row width — no layout shift on long titles
    checked: true
  - id: empty-fallback
    label: >-
      Tasks with no body text below the heading render the title alone, without
      an empty second line
    checked: true
  - id: density
    label: >-
      Row vertical rhythm still matches the Linear-style density we landed on in
      Sprint-02 (no double padding, no collapse)
    checked: true
corrections: []
context_files:
  - packages/ui/src/components/SprintBoard.tsx
  - packages/server/src/storage/markdown.ts
  - packages/server/src/schema/task.ts
depends_on: []
pre_flight:
  - >-
    Decide extraction cut-off: first non-empty paragraph, or first sentence? The
    task MDs have a `## <ID>: <title>` heading followed by either a single short
    paragraph (DCK-10) or a `### Why` sub-section (DCK-04) — handle both.
  - >-
    Decide where summary is computed: server-side on read (cheap, already
    parsing frontmatter) or client-side from the body text. Server-side keeps
    the UI code smaller.
updated: '2026-04-23T14:48:32.474Z'
---

## DCK-11: Sidebar task rows — summary line + layout polish

The SprintBoard sidebar currently shows one line per task: the title.
At a glance, there's no way to tell `DCK-12` ("task close command")
apart from `DCK-15` ("sprint close command") without clicking each
row. Add a second line per row with a short summary.

### Why

Maintainer reported: "die sidebar ist etwas unübersichtlich. ich
bräuchte eine description von jedem task." Confirmed during
Sprint-02 — every task switch needed a drawer open to recall context.

### Approach

Auto-extract the summary — no new frontmatter field, no migration:

1. Server parses the task body, walks past the `## <ID>: <title>`
   heading, and grabs the first prose paragraph.
2. If the first paragraph is a section heading (`###`), skip to the
   next prose block.
3. Strip markdown, collapse whitespace, truncate to ~120 chars.
4. Expose as `summary: string | null` on the task payload.

The UI renders it with `text-text-tertiary` below the title, single
line, `truncate` class.

### Out of scope

- Rich-text rendering in the sidebar (bold, links, etc.).
- Editable summary field.
- Multi-line descriptions.
