---
schema: 1
id: DCK-15
sprint_id: sprint-03-polish
title: dckl sprint close <id> — archive + summary + pointer rotation
type: feature
status: done
security_checks:
  - id: input-validation
    checked: true
test_criteria:
  - id: archive-move
    label: >-
      `dckl sprint close sprint-02-dogfood` moves the folder to
      `.dckl/sprints/.archive/sprint-02-dogfood/` atomically
    checked: true
  - id: summary-written
    label: >-
      Writes `SUMMARY.md` inside the archived sprint: task count, done/open
      corrections, duration, and a changelog excerpt for the sprint window
    checked: true
  - id: refuses-open-tasks
    label: >-
      Refuses to close a sprint with non-done tasks unless `--force` — prevents
      accidental archival of in-flight work
    checked: true
  - id: status-transitions
    label: >-
      Sets sprint index.md `status: done`, clears `.active-task` if it
      referenced a task in this sprint, and removes the sprint from the default
      "active" lookup
    checked: true
corrections: []
context_files:
  - packages/cli/src/commands/sprint.ts
  - packages/cli/src/cli.ts
  - packages/server/src/storage/store.ts
depends_on:
  - DCK-12
pre_flight:
  - >-
    Sprint-02 was closed manually today — 10 PATCHes to set status=done,
    .active-task stayed stale, no summary written. Codify the flow.
  - >-
    Archive directory already exists — `.dckl/sprints/.archive/` was used for
    sprint-01-demo. Keep that layout.
updated: '2026-04-23T14:43:34.058Z'
---

## Worum es geht

Ein End-to-End-Befehl, der einen Sprint sauber abschließt:

1. Validieren: alle Tasks `status: done` — sonst Abbruch, außer
   `--force`.
2. Summary berechnen: Task-Counts, Corrections, Window, Changelog-
   Ausschnitt.
3. `SUMMARY.md` in den Sprint-Ordner schreiben.
4. `status: done` im Sprint-`index.md` setzen.
5. Ordner nach `.dckl/sprints/.archive/<id>/` verschieben (atomarer
   `renameSync`).
6. `.active-task` leeren, wenn es auf diesen Sprint zeigte.
7. Zeile in `.dckl/CHANGELOG.md` anhängen.

`--dry-run` zeigt den Plan, ohne zu schreiben.

## Warum jetzt

Sprint-02 wurde von Hand geschlossen — ca. 10 PATCHes, `.active-task`
blieb stale, keine Summary geschrieben. Ein Close ist ein echtes
Ereignis (Reflektion, Carryover von Corrections, Changelog-Header).
Wenn es 10 Befehle kostet, wird es einfach nicht gemacht — und
`.archive/` wird bedeutungslos.

## CLI-Signatur

```
dckl sprint close sprint-99-foo
dckl sprint close sprint-99-foo --force     # trotz offener Tasks
dckl sprint close sprint-99-foo --dry-run   # nur Plan drucken
```

## Out of scope

- `sprint open` (neuen Sprint anlegen). Eigener Befehl bei Bedarf.
- Auto-Carryover offener Tasks in den nächsten Sprint. Menschliche
  Entscheidung.
- UI-Bestätigungsdialog. CLI-only für jetzt.
