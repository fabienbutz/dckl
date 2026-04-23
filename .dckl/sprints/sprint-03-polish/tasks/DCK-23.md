---
schema: 1
id: DCK-23
sprint_id: sprint-03-polish
title: 'Sprint-Briefing: `index.md`-Body im SprintBoard prominent rendern'
type: feature
status: done
security_checks: []
test_criteria:
  - id: body-rendered
    label: >-
      SprintBoard zeigt oberhalb der Task-Liste eine Briefing-Karte, die den
      `index.md`-Body des aktiven Sprints via `MarkdownBody` rendert.
    checked: true
  - id: collapsible
    label: >-
      Briefing-Karte ist collapsible (Default: expanded). Zustand wird via
      `localStorage` persistiert pro Sprint-ID.
    checked: true
  - id: metadata-line
    label: >-
      Zusätzlich sichtbar in der Briefing-Karte: `name`, `goal`, Window (`start
      → end`), Status-Badge. Kompakt in einer Zeile oberhalb des Bodies.
    checked: true
  - id: empty-graceful
    label: >-
      Sprints mit leerem `index.md`-Body zeigen nur die Metadaten- Zeile — keine
      leere Briefing-Karte, keine `MarkdownBody`- Layout-Artefakte.
    checked: true
corrections: []
context_files:
  - packages/ui/src/components/SprintBoard.tsx
  - packages/ui/src/components/SprintBriefing.tsx
  - packages/ui/src/lib/queries.ts
  - packages/server/src/schema/sprint.ts
depends_on:
  - DCK-17
pre_flight:
  - >-
    Signal aus externem Einsatz (rubenbauer): Sprint-Kontext geht verloren, wenn
    das einzige Sichtbare der einzeilige `goal` ist. Der `index.md`-Body kann
    die ausführliche Beschreibung tragen, wird aber derzeit nirgends gerendert.
  - >-
    `Sprint` aus `@dckl/server/schema` hat bereits `body: string`. Der Server
    returned ihn, das Frontend ignoriert ihn bisher — nur Anzeige-Logik fehlt.
updated: '2026-04-23T18:31:36.604Z'
---

## Worum es geht

Der `SprintBoard`-Header zeigt heute `name`, `id` und `status`. Mehr
nicht. Der Body der `index.md` jedes Sprints (den der User bewusst
als Briefing schreibt) wird nirgendwo angezeigt — er lebt nur in der
Datei auf der Disk.

Diese Task rendert den Sprint-Body als **Briefing-Karte** oberhalb der
Task-Liste: klappbar, mit `MarkdownBody` (also Code-Spans, Listen,
Headings), plus einer kompakten Metadaten-Zeile darüber.

## Warum jetzt

Direkt aus dem ersten externen Einsatz: der Nutzer hat einen
kompletten Sprint aus dem alten `.claude/briefings/`-Workflow nach
dckl migriert, aber das Briefing ist in der UI nicht sichtbar. Er
muss die `index.md` im Editor aufmachen, um den Kontext zu lesen.
Das unterläuft den Zweck von „UI als Single Source of Truth".

## Woran man merkt, dass es fertig ist

Siehe Test-Kriterien in der Frontmatter.

## Out of scope

- Bearbeitbares Briefing in der UI (read-only für jetzt).
- Briefing als separate `BRIEFING.md`-Datei. Der `index.md`-Body
  reicht — kein neuer File-Type.
- Multi-Sprint-Briefing-Übersicht. Aktueller Sprint only.
