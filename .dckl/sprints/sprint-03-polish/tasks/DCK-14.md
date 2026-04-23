---
schema: 1
id: DCK-14
sprint_id: sprint-03-polish
title: Doctor — detect stale .active-task and missing VISION.md updated field
type: feature
status: done
security_checks:
  - id: input-validation
    checked: true
test_criteria:
  - id: stale-active-task
    label: >-
      Doctor flags `.active-task` pointing to a non-existent or archived task
      (e.g. archived sprint) and offers `--fix` to clear the pointer
    checked: true
  - id: vision-updated-missing
    label: >-
      Doctor flags `.dckl/VISION.md` if the YAML frontmatter has no `updated:`
      field (staleness heuristic silently fails otherwise)
    checked: true
  - id: vision-stale-warning
    label: 'Doctor warns when VISION.md `updated:` is older than 90 days'
    checked: true
  - id: exit-code
    label: >-
      Exit code 0 when all checks pass, 1 when any warning fires. Keeps CI
      hookability even though CI is a non-goal for now.
    checked: true
corrections: []
context_files:
  - packages/cli/src/commands/doctor.ts
  - packages/cli/tests/doctor.test.ts
depends_on: []
pre_flight:
  - >-
    Existing doctor already validates basic scaffolding. Add two new checks
    without breaking the existing output format — maintainer greps it.
  - >-
    Direct Sprint-02 corrections: DCK-06 c1 (stale .active-task from archived
    sprint-01) and DCK-06 c3 (missing updated: field).
updated: '2026-04-23T14:39:55.188Z'
---

## Worum es geht

Zwei konkrete Doctor-Lücken, beide aus Sprint-02-Corrections
entstanden:

1. **Stale `.active-task`** — wenn ein Sprint archiviert wird oder
   ein manuell geschriebener Pointer auf eine nicht mehr existierende
   Task zeigt, bleibt die Datei liegen. Die CLI hält sie für aktiv,
   Heartbeats laufen ins Leere.
2. **`VISION.md` ohne `updated:`** — `dckl status` und der Doctor
   benutzen `updated:` für die Stale-Heuristik. Fehlt das Feld, sagt
   die Heuristik still "ist frisch", die Vision rottet unbemerkt.

Zusätzlich: `dckl doctor --fix` löscht sicher-korrigierbare Fälle
(heute: orphan/malformed `.active-task`). `VISION.md` wird bewusst
**nicht** automatisch angepasst — das ist eine menschliche
Entscheidung.

## Warum jetzt

Genau diese zwei Fälle sind in Sprint-02 aufgetreten (DCK-06 c1:
stale Pointer nach Archivierung; DCK-06 c3: fehlendes `updated:`).
Ohne Doctor-Auslöser merkt niemand etwas, bis sich das Tool seltsam
verhält.

## Beispiel-Output

```
dckl doctor
  ✓ config — config.yaml valid
  ⚠ active-task-orphan — `.active-task` points at sprint-03/DCK-999
    but no such task file exists. Run `dckl doctor --fix` to clear.
  ⚠ vision-updated-missing — VISION.md has no `updated:` field.
  ⚠ vision-stale — VISION.md is 127 days old — consider a review.
```

## Out of scope

- `--fix-all`, das auch `VISION.md` anfasst. Zu invasiv — Vision ist
  menschliche Entscheidung.
- Drift-Check zwischen Task-`depends_on` und Sprint-`task_ids`.
- Performance- und Timing-Checks am Server.
