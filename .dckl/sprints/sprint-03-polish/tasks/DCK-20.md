---
schema: 1
id: DCK-20
sprint_id: sprint-03-polish
title: "`dckl import`: bestehende Docs scannen und Task-Kandidaten vorschlagen"
type: feature
status: todo
security_checks:
  - id: input-validation
    checked: false
test_criteria:
  - id: scans-markdown
    label: >-
      `dckl import` scannt `README.md`, `docs/**/*.md`, `TODO*.md` und
      `CHANGELOG.md` (letzteres nur lesend als Kontext) und listet
      Header + Checkbox-Items als Task-Kandidaten auf.
    checked: false
  - id: writes-drafts
    label: >-
      Schreibt Task-Drafts als YAML-Frontmatter-Skelette nach
      `.dckl/.imports/<scan-id>/`, nicht direkt in `sprints/`. User
      reviewt und kopiert manuell, was er behalten will.
    checked: false
  - id: interactive
    label: >-
      Optional `--interactive`: CLI fragt pro Kandidat nach (behalten
      / skip / umformulieren), schreibt nur Approved in den Draft-
      Ordner.
    checked: false
  - id: no-auto-write
    label: >-
      Keine automatischen Writes nach `.dckl/sprints/` ohne explizite
      User-Aktion (copy oder `dckl import --apply <scan-id>`).
    checked: false
corrections: []
context_files:
  - packages/cli/src/commands/import.ts
  - packages/cli/src/cli.ts
depends_on:
  - DCK-18
pre_flight:
  - >-
    Vorher in einem externen Projekt validieren, ob der manuelle
    Onboarding-Flow (VISION + Sprint + Tasks via Claude) überhaupt zu
    kurz kommt. Wenn nicht, verfällt dieser Task.
---

## Worum es geht

Ein CLI-Kommando, das in einem bestehenden Repo nach Markdown-Dateien
(README, docs, TODO) scannt und daraus Task-Kandidaten extrahiert —
aber nur Drafts produziert, nicht automatisch in `sprints/` schreibt.

## Warum jetzt

Wenn `dckl` in einem bestehenden Projekt eingesetzt wird, steht der
User heute vor einer weißen Seite. Das ist philosophisch richtig (kein
auto-generierter Rauschmüll), aber pragmatisch unangenehm bei großen
Repos mit bestehender Doku. `import` ist der Kompromiss: maschineller
Scan, menschliche Auswahl.

## Woran man merkt, dass es fertig ist

Siehe Test-Kriterien.

## Out of scope

- Direktes Schreiben in `.dckl/sprints/`. Das bleibt menschliche
  Entscheidung.
- LLM-Integration (Claude-Call aus CLI heraus). Wenn LLM gewünscht,
  nutzt der User Claude Code mit dem dckl-Skill — dafür ist der
  Skill da.
- Auto-Checkbox-Mapping auf extrahierte Items. Kandidaten sind roh.
