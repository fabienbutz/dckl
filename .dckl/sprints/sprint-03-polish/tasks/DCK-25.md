---
schema: 1
id: DCK-25
sprint_id: sprint-03-polish
title: Sprint-Briefing als eigene Seite mit eigener URL
type: feature
status: done
security_checks: []
test_criteria:
  - id: own-url
    label: >-
      `#/sprints/:sprintId/briefing` öffnet die Briefing-Seite. Die URL ist
      shareable (Slack-Link → direktes Briefing im Browser).
    checked: true
  - id: tab-switcher
    label: >-
      SprintBoard-Header bekommt einen Tab-Switcher zwischen "Tasks" (default)
      und "Briefing". Aktiver Tab spiegelt die URL.
    checked: true
  - id: briefing-replaces-card
    label: >-
      Die inline `SprintBriefing`-Karte aus DCK-23 ist auf der Tasks-Ansicht
      **entfernt**. Sprint-Header zeigt nur noch Name, Status, Window — Details
      in der Briefing-Seite.
    checked: true
  - id: empty-graceful
    label: >-
      Sprints mit leerem `index.md`-Body zeigen auf der Briefing-Seite einen
      Hinweis ("Kein Briefing gepflegt — schreibe in
      `.dckl/sprints/:id/index.md`"), keine leere Seite.
    checked: true
corrections: []
context_files:
  - packages/ui/src/components/SprintBriefingView.tsx
  - packages/ui/src/components/SprintBoard.tsx
  - packages/ui/src/components/SprintBriefing.tsx
  - packages/ui/src/App.tsx
depends_on:
  - DCK-24
pre_flight:
  - >-
    Direktes User-Feedback: „Das mit dem Briefing gefällt mir so nicht. Das
    braucht eine extra Seite!". Inline-Karte wird durch eigene URL + Tab-Switch
    ersetzt.
  - >-
    DCK-23's `SprintBriefing`-Komponente wird recycelt — nur der Container
    (Karte vs. full page) ändert sich.
updated: '2026-04-23T18:46:42.585Z'
---

## Worum es geht

Das Sprint-Briefing bekommt eine eigene Seite mit eigener URL
(`#/sprints/:id/briefing`). Sprint-Board bekommt einen Tab-Switcher
zwischen **Tasks** (Default) und **Briefing**. Die inline klappbare
Briefing-Karte aus DCK-23 wird entfernt — sie dominiert die
Task-Liste und ist bei aktiver Arbeit eher störend.

## Warum jetzt

Direkt aus externem Einsatz: *„Das mit dem Briefing gefällt mir so
nicht. Das braucht eine extra Seite!"*. Die klappbare Karte war zu
wenig präsent für wichtige Sprint-Kontext-Info, gleichzeitig zu
dominant in der Task-Liste.

## Woran man merkt, dass es fertig ist

Siehe Test-Kriterien in der Frontmatter.

## Out of scope

- Edit-Mode für das Briefing. Read-only bleibt — der User pflegt den
  Content in `.dckl/sprints/:id/index.md`.
- Briefing als separate `.md`-Datei außerhalb von `index.md`. Der
  Body des Sprint-`index.md` bleibt die Quelle.
- Historisches Briefing-Versioning. Git ist die History.
