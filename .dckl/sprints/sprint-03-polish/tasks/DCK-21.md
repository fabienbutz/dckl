---
schema: 1
id: DCK-21
sprint_id: sprint-03-polish
title: Commits pro Task sichtbar machen (`dckl sync-commits` + Drawer-Section)
type: feature
status: done
security_checks: []
test_criteria:
  - id: parses-git-log
    label: >-
      `dckl sync-commits` liest `git log` seit Sprint-Start und extrahiert `Refs
      DCK-NN` / `Closes DCK-NN` aus Commit-Messages.
    checked: true
  - id: groups-by-task
    label: >-
      Zeigt pro Task eine Liste der referenzierenden Commits (Hash + Summary),
      sortiert nach Datum. Tasks ohne Commits sind separat als "no commit yet"
      aufgeführt.
    checked: true
  - id: read-only
    label: >-
      Flippt **keine** Checkboxen und setzt **keinen** Status. Nur Sichtbarkeit
      — die Zuordnung Commit→Akzeptanzkriterium bleibt menschliches Urteil.
    checked: true
  - id: json-output
    label: >-
      Mit `--json` gibt der Befehl maschinenlesbares JSON aus, das von UI oder
      externen Tools konsumiert werden kann.
    checked: true
  - id: drawer-section
    label: >-
      Der `TaskDrawer` zeigt unter einer "Commits"-Sektion alle referenzierenden
      Commits der aktuellen Task (Hash verkürzt, Subject, relative Zeit).
      Sektion ist leer-graceful (zeigt "no commits yet" wenn keine Referenzen).
    checked: true
  - id: api-endpoint
    label: >-
      Server-Endpoint `GET /api/sprints/:sprintId/commits` liefert eine Map `{
      taskId: [{sha, subject, date}] }`. Client holt sich das einmal pro Sprint,
      cacht via React Query.
    checked: true
corrections: []
context_files:
  - packages/cli/src/commands/sync-commits.ts
  - packages/cli/src/cli.ts
  - packages/server/src/routes/commits.ts
  - packages/ui/src/components/TaskDrawer.tsx
  - packages/ui/src/lib/queries.ts
depends_on:
  - DCK-18
pre_flight:
  - >-
    Vorher prüfen, ob die Konvention `Refs DCK-NN` tatsächlich eingehalten wird.
    Wenn nicht, lohnt der Befehl nichts.
updated: '2026-04-23T18:30:18.025Z'
---

## Worum es geht

Read-only-Brücke zwischen Git-Historie und Deckel-Tasks: Der Befehl
liest `git log`, findet Commit-Messages mit `Refs DCK-NN` oder
`Closes DCK-NN`, und zeigt pro Task, welche Commits auf sie zeigen.

## Warum jetzt

Die Konvention aus `SKILL.md` schreibt vor, Tasks in Commit-Bodies zu
referenzieren. Aktuell bewirkt das **nichts** im Tool — es ist reine
Disziplin für PR-Review. Ein Sync-Befehl macht die Verbindung
sichtbar, ohne die Brittleness von Auto-Checkbox-Flipping.

## Woran man merkt, dass es fertig ist

Siehe Test-Kriterien.

## Out of scope

- **Automatisches Flippen** von `test_criteria.checked` basierend auf
  Commit-Inhalt. Bewusst nicht — zu fehleranfällig, semantisch nicht
  belastbar. Das muss menschlicher Call bleiben.
- **Push-Integration** (GitHub-Actions-Trigger, Webhooks). Lokaler
  Git-Log-Read reicht.
- **Cross-Sprint-Korrelation.** Ein Commit referenziert nur seine
  Task, nicht mehrere Sprints.
