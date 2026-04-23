---
schema: 1
id: DCK-16
sprint_id: sprint-03-polish
title: SKILL.md + CLAUDE.md reality refresh — reflect Sprint-02 learnings
type: chore
status: done
security_checks: []
test_criteria:
  - id: no-stale-workarounds
    label: >-
      SKILL.md contains no references to manual PATCH / curl workflows (replaced
      with `task close`, `correction resolve`, `sprint close`)
    checked: true
  - id: command-table-accurate
    label: >-
      The command table in CLAUDE.md matches the current CLI surface 1:1 (run
      `dckl --help` and diff)
    checked: true
  - id: anti-patterns-updated
    label: >-
      New anti-patterns learned in Sprint-02 are documented in SKILL.md:
      stale-Edit state, heartbeat not-manual, close != release
    checked: true
  - id: no-planned-markers
    label: >-
      No `[planned]` markers or "coming in sprint X" notes — docs describe
      reality, not intent
    checked: true
corrections: []
context_files:
  - .claude/skills/dckl/SKILL.md
  - CLAUDE.md
depends_on:
  - DCK-12
  - DCK-13
  - DCK-15
pre_flight:
  - >-
    Do this task LAST in the sprint, after DCK-12/13/15 have landed — the doc
    refresh needs to reflect what actually exists, not what's planned.
  - >-
    Sprint-02 did this pass once already (S2.8-7 Reality-Pass). Repeat the same
    discipline: diff `dckl --help` against SKILL.md line by line.
updated: '2026-04-23T14:51:24.161Z'
---

## Worum es geht

Nach Sprint-03 gibt es drei neue CLI-Befehle (`task close`,
`correction resolve`, `sprint close`) plus `doctor --fix`. Die
Agent-facing Docs (`SKILL.md`, `CLAUDE.md`) müssen das sauber
widerspiegeln — sonst entdeckt der nächste Agent den manuellen
PATCH-Workaround von Sprint-02 neu, und der Zyklus startet wieder.

## Warum jetzt

Sprint-02 benötigte bereits einen Reality-Pass (S2.8-7), weil die
Docs während einer einzigen Sprint-Runde drifteten. Jeder Sprint,
der CLI-Oberfläche hinzufügt, braucht dieselbe Disziplin —
ansonsten wächst die Diskrepanz zwischen Tool und Doku bei jeder
Iteration.

## Ansatz

1. `dckl --help` gegen die Command-Tabellen in `SKILL.md` und
   `CLAUDE.md` diffen; beide aktualisieren.
2. Alle Referenzen auf manuelle API-PATCHes, direkte File-Edits oder
   `pkill`-Workarounds entfernen — Sprint-03 schließt diese Pfade.
3. Neue Sektion "Learned anti-patterns (Sprint-02 & Sprint-03)" in
   `SKILL.md`:
   - Heartbeat ist automatisch — nie manuell aufrufen.
   - `task release` ≠ `task close`.
   - Corrections brauchen explizites `resolve`, kein silent drop.
   - `sprint close` schreibt SUMMARY und bewegt den Ordner.
   - Stale-Edit: nach CLI-Call immer re-Read vor dem nächsten Edit.
4. Alle `[planned]` / "coming soon" Marker weg — Docs beschreiben
   Realität, nicht Intent.

### Out of scope

- Restructuring SKILL.md into sections — keep the current shape.
- Writing user-facing (non-agent) docs. That lives under `docs/`.
- README rewrites.
