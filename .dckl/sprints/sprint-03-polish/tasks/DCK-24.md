---
schema: 1
id: DCK-24
sprint_id: sprint-03-polish
title: 'URL-Routing: dckl wird von SPA-State zu bookmark-baren Routen'
type: feature
status: done
security_checks: []
test_criteria:
  - id: sprint-url
    label: >-
      Klick auf einen Sprint in der Sidebar ändert die URL zu
      `#/sprints/:sprintId`. Direkter Aufruf dieser URL zeigt den Sprint ohne
      weitere Klicks.
    checked: true
  - id: task-url
    label: >-
      Klick auf eine Task-Row ändert die URL zu
      `#/sprints/:sprintId/tasks/:taskId` und öffnet den Drawer. Direct-URL
      öffnet den Drawer bei Pageload.
    checked: true
  - id: view-urls
    label: >-
      `#/changelog`, `#/stack`, `#/stack/:path`, `#/pages`, `#/journeys/:id`
      führen direkt zur jeweiligen View.
    checked: true
  - id: browser-back
    label: >-
      Browser-Back navigiert durch die besuchten Routen. Forward funktioniert
      analog. Kein Full-Page-Reload.
    checked: true
  - id: fallback
    label: >-
      Unbekannte Hash-Routen fallen auf den aktiven Sprint zurück. Keine weiße
      Seite, kein Crash.
    checked: true
corrections: []
context_files:
  - packages/ui/src/lib/use-route.ts
  - packages/ui/src/App.tsx
  - packages/ui/src/components/Sidebar.tsx
  - packages/ui/src/components/TaskDrawer.tsx
  - packages/ui/src/components/SprintBoard.tsx
  - packages/ui/src/components/StackView.tsx
depends_on:
  - DCK-18
pre_flight:
  - >-
    Kein React-Router als Dependency — dckl ist ein lokales Tool, hash-basiertes
    Routing in ~40 Zeilen reicht. Bundle bleibt klein.
  - >-
    Existing state hooks (`activeSprintId`, `selectedTaskId`, `activeView`,
    `activeStackPath`, `activeJourneyId`) werden durch den Route-Reader ersetzt.
    Setter werden zu URL-Navigations.
updated: '2026-04-23T18:45:01.485Z'
---

## Worum es geht

dckl ist heute eine Single-Page-App ohne URL-Routing. Der komplette
Zustand (welcher Sprint, welche Task, welche View) lebt nur in
React-Local-State. Konsequenz: keine shareable Links, kein
Browser-Back, kein Bookmark auf eine bestimmte Task.

Diese Task fügt **hash-basiertes Routing** hinzu — eigene Mini-Lib,
keine externe Router-Dependency. Jeder relevante Zustand bekommt eine
URL.

## Warum jetzt

Direkt aus externem Einsatz (rubenbauer): *„es ist eine singlepage
ohne Möglichkeit auf bestimmte tasks oder sprints zu verlinken!"*.
Das blockiert jedes team-orientierte Review (Slack-Link auf eine
Task) und macht das Tool im Browser unbrauchbar sobald man mehrere
Tasks parallel öffnen will.

## URL-Schema

| URL | View |
|---|---|
| `#/` | Aktiver Sprint (Default) |
| `#/sprints/:sprintId` | Sprint-Board |
| `#/sprints/:sprintId/tasks/:taskId` | Sprint-Board + Drawer offen |
| `#/sprints/:sprintId/briefing` | Sprint-Briefing-Seite (DCK-25) |
| `#/journeys/:journeyId` | Journey-View |
| `#/pages` | Pages-View |
| `#/stack` | Stack-Root |
| `#/stack/<encoded-path>` | Stack mit offener Datei |
| `#/changelog` | Changelog-View |

## Woran man merkt, dass es fertig ist

Siehe Test-Kriterien in der Frontmatter.

## Out of scope

- Full HTML5 History API (pushState). Hash reicht für lokales Tool
  und funktioniert robust hinter jedem Static-Server.
- Deep-Link-Shortcuts (z. B. `?task=DCK-17`). Ein Schema, eine
  Syntax.
- Server-side routing / SEO. dckl ist lokal, nicht indexiert.
