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

## Worum es geht

Die SprintBoard-Sidebar zeigt aktuell nur den Titel pro Zeile. Auf
einen Blick kann man `DCK-12` ("task close") und `DCK-15` ("sprint
close") nicht ohne Klick unterscheiden. Diese Task fügt eine zweite
Zeile pro Row mit einer kurzen Zusammenfassung hinzu.

## Warum jetzt

Maintainer-Feedback: *„Die Sidebar ist unübersichtlich, ich bräuchte
eine Description von jedem Task."* Während Sprint-02 musste für jeden
Task-Wechsel der Drawer geöffnet werden, nur um den Kontext
zurückzubekommen.

## Ansatz

Auto-Extraktion — kein neues Frontmatter-Feld, keine Migration:

1. Server parst den Body, überspringt das führende `##`-Heading
   (Titel), geht ggf. über weitere `###`-Sub-Headings hinweg und
   greift den ersten Prose-Block.
2. Strippt Inline-Markdown (Backticks, Bold, Links) und normalisiert
   Whitespace.
3. Truncated auf 160 Zeichen mit Ellipsis.
4. Veröffentlicht als `summary: string | null` auf dem Task-Payload
   (derived, nicht persistiert).

UI rendert den Summary in einer zweiten Zeile unter dem Titel mit
`text-label text-text-tertiary` + `truncate`.

## Out of scope

- Rich-Text-Rendering in der Sidebar (Bold, Links im Summary).
- Editierbares Summary-Feld.
- Mehrzeiliger Summary-Text.
