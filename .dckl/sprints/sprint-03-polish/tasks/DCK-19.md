---
schema: 1
id: DCK-19
sprint_id: sprint-03-polish
title: Sprint-03-Task-Bodies auf neues Deutsch-Template migrieren
type: chore
status: todo
security_checks: []
test_criteria:
  - id: five-tasks-migrated
    label: >-
      DCK-11, DCK-13, DCK-14, DCK-15 und DCK-16 haben alle den neuen
      Body-Aufbau: "Worum es geht / Warum jetzt / Woran man merkt, dass
      es fertig ist / Out of scope" — auf Deutsch, mit englischen
      Fachbegriffen im Original.
    checked: false
  - id: titles-human
    label: >-
      Task-Titel sind in menschlichem Deutsch formuliert. Command-
      Referenzen wie `dckl task close` dürfen als Backtick-Code im
      Titel stehen, wenn sie die Aussage tragen.
    checked: false
  - id: criteria-german
    label: >-
      `test_criteria`-Labels sind in Deutsch mit Fachbegriffen in
      Originalform (ETag, PATCH, status=done etc.), konsistent zu
      DCK-12 und DCK-17.
    checked: false
  - id: ui-renders-clean
    label: >-
      In der UI rendert jeder migrierte Task-Body korrekt über
      `MarkdownBody`; Inline-Code erscheint als Code-Span, keine
      Roh-Backticks mehr sichtbar.
    checked: false
  - id: no-scope-drift
    label: >-
      Keine Task wurde inhaltlich verschoben — reine Übersetzung und
      Restrukturierung. Scope-relevante Änderungen werden als
      Correction dokumentiert, nicht stillschweigend eingearbeitet.
    checked: false
corrections: []
context_files:
  - .dckl/sprints/sprint-03-polish/tasks/DCK-11.md
  - .dckl/sprints/sprint-03-polish/tasks/DCK-13.md
  - .dckl/sprints/sprint-03-polish/tasks/DCK-14.md
  - .dckl/sprints/sprint-03-polish/tasks/DCK-15.md
  - .dckl/sprints/sprint-03-polish/tasks/DCK-16.md
depends_on:
  - DCK-18
pre_flight:
  - >-
    DCK-18 muss abgeschlossen sein. Nach dem Rename zeigen die Pfade
    auf `.dckl/sprints/...` — alle Command-Referenzen im Body haben
    dann bereits `dckl` statt `dckl`. Diese Task migriert nur die
    verbleibende Struktur und Sprache.
  - >-
    DCK-12 und DCK-17 als Referenz lesen — das ist das Template, das
    alle fünf restlichen Tasks übernehmen.
---

## Worum es geht

Die fünf verbleibenden offenen Sprint-03-Tasks (DCK-11, 13, 14, 15,
16) auf das neue Deutsch-Template umschreiben, das mit DCK-12 und
DCK-17 etabliert wurde: Titel menschlich, Body in vier Blöcken
(Worum es geht / Warum jetzt / Woran man merkt, dass es fertig ist
/ Out of scope), `test_criteria`-Labels auf Deutsch mit englischen
Fachbegriffen im Original.

## Warum jetzt

Fünf der sieben aktuellen Sprint-03-Tasks sind noch im KI-lastigen
Englisch-Original. Die UI-Aufwertung aus DCK-17 wirkt dort nur halb
— perfekt gerenderte Backticks auf unverständlichem Text sind kein
Fortschritt.

Die Reihenfolge ist bewusst: **erst DCK-18 (Rename)**, **dann DCK-19
(Content-Migration)**. Sonst editierst du jede Datei zweimal, einmal
für den Rename und einmal für die Umformulierung.

## Woran man merkt, dass es fertig ist

Siehe Test-Kriterien in der Frontmatter — jedes Kriterium prüft einen
konkreten Punkt am migrierten Ergebnis.

## Out of scope

- **Sprint-01 und Sprint-02** historische Task-Bodies. Historische
  Wahrheit bleibt unverändert. Wenn die doch migriert werden sollen,
  ist das ein eigener Task (DCK-20), der dann bewusst entscheidet,
  wie viel History rewrite man akzeptiert.
- **Scope-Drift** in einzelnen Tasks. Reine Übersetzung und
  Restrukturierung. Falls bei einer Task Klarheit über den Scope
  fehlt, Correction loggen, nicht umdefinieren.
- **Änderungen an IDs oder Frontmatter-Struktur.** Nur `title`, Body
  und `test_criteria[].label` werden angefasst.
