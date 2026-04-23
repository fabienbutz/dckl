---
schema: 1
id: DCK-13
sprint_id: sprint-03-polish
title: Correction als erledigt markieren (`dckl correction resolve`)
type: feature
status: done
security_checks:
  - id: input-validation
    checked: true
test_criteria:
  - id: marks-resolved
    label: >-
      `dckl correction resolve DCK-06 c1` setzt `open: false` auf die
      Correction, aktualisiert `updated:` und lässt alle anderen Felder
      unverändert.
    checked: true
  - id: unknown-cid-errors
    label: >-
      Unbekannte Correction-ID führt zu Exit ≠ 0 mit klarer Fehlermeldung —
      keine File-Mutation.
    checked: true
  - id: target-sprint
    label: >-
      `--target-sprint <id>` setzt zusätzlich `target_sprint:` auf den neuen
      Sprint — die Correction ist im Quell-Task geschlossen, aber
      weitergereicht.
    checked: true
  - id: status-visible
    label: >-
      `dckl status` zählt nur `open: true` Corrections — resolved sind aus der
      "Gap"-Sektion ausgeblendet.
    checked: true
corrections: []
context_files:
  - packages/cli/src/commands/correction.ts
  - packages/cli/src/cli.ts
  - packages/cli/src/commands/status.ts
depends_on: []
pre_flight:
  - >-
    End of Sprint-02 left 15 open corrections; most are either already handled
    or non-goal — they need an explicit close path, not silent rot.
  - >-
    `correction add` writes via the API's task PATCH. Mirror that pathway for
    `resolve` so ETag guards still apply.
updated: '2026-04-23T14:36:45.652Z'
---

## Worum es geht

Ein CLI-Befehl, der eine einzelne Correction auf einer Task als
erledigt markiert — das Gegenstück zu `correction add`. Setzt
`open: false` auf der bezeichneten Correction, aktualisiert `updated:`
und bewahrt alle anderen Felder.

Optional: `--target-sprint <id>` reicht die Correction an einen
späteren Sprint weiter. Die Correction bleibt im Quell-Task
geschlossen, trägt aber den Ziel-Sprint in `target_sprint:`.

## Warum jetzt

Corrections sind die Brotkrumen, die Agents während der Implementation
hinterlassen ("Scope expanded", "context_files missed X"). Sie sammeln
sich an. Sprint-02 endete mit 15 offenen Corrections — fast alle
tatsächlich erledigt, aber ohne Schließpfad. Manuelle YAML-Edits sind
fehleranfällig (Einrückung, falscher Key). `dckl status` zeigt offene
Corrections endlos an, solange es keinen sauberen `resolve`-Weg gibt.

## Woran man merkt, dass es fertig ist

Siehe Test-Kriterien in der Frontmatter.

## CLI-Signatur

```
dckl correction resolve DCK-06 c1
dckl correction resolve DCK-06 c3 --target-sprint sprint-04-foo
```

## Out of scope

- `correction edit` — Text einer bestehenden Correction nachträglich
  ändern. Eigenes Kommando, niedrige Priorität.
- Cross-Task-Rollup in der UI. Eigener Task, erst wenn der Use-Case
  validiert ist.
- Auto-Resolve bei Commit auf eine in der Correction genannte Datei.
  Zu fehleranfällig — menschlicher Call bleibt Pflicht.
