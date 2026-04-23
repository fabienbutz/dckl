---
schema: 1
id: DCK-12
sprint_id: sprint-03-polish
title: Task per CLI-Befehl abschließen (`dckl task close`)
type: feature
status: todo
security_checks:
  - id: input-validation
    checked: false
test_criteria:
  - id: status-done
    label: >-
      `dckl task close <id>` setzt `status=done` atomar (ETag-geschützt,
      gleicher Schreib-Pfad wie `PATCH /api/sprints/.../tasks/:id`)
    checked: false
  - id: release-claim
    label: >-
      Schließen gibt den aktiven Claim frei (`.active-task` wird geleert,
      wenn die Task dort referenziert war) — keine Zombie-Pointer
    checked: false
  - id: idempotent
    label: >-
      Schließen einer bereits geschlossenen Task ist ein No-op (Hinweis,
      Exit 0) — kein `updated:`-Bump, kein CHANGELOG-Eintrag
    checked: false
  - id: rejects-open-reminders
    label: >-
      Verweigert das Schließen, solange `security_checks` offene Einträge
      haben — außer mit `--force`. Entspricht der SKILL-Regel "don't close
      with open reminders"
    checked: false
corrections: []
context_files:
  - packages/cli/src/commands/task.ts
  - packages/cli/src/cli.ts
  - packages/server/src/storage/store.ts
depends_on: []
pre_flight:
  - >-
    SKILL.md-Abschnitt "Finishing a task" lesen — die close-Semantik muss
    zu dem passen, was die Skill bereits an Agents kommuniziert.
  - >-
    Entscheiden, ob `close` zusätzlich in `CHANGELOG.md` schreibt —
    Sprint-02 appendet bereits bei Status-Wechseln, Doppel-Einträge
    verifizieren.
---

## Worum es geht

Ein neuer CLI-Befehl `dckl task close <id>`, mit dem eine Task
explizit als erledigt markiert wird — genauso einfach wie `task claim`
oder `task release`. Der Befehl setzt `status=done`, gibt einen
eventuell bestehenden Claim frei und schreibt einen CHANGELOG-Eintrag.

## Warum jetzt

Im Sprint-02 war der einzige Weg, eine Task abzuschließen, ein
manueller `curl -X PATCH` gegen die API — umständlich genug, dass es
im ganzen Sprint kein einziges Mal sauber gemacht wurde. `task release`
gibt nur den Claim frei, setzt den Status aber nicht. Folge: Jede Task
bleibt formal "in_progress", auch wenn sie längst fertig ist, und die
Sidebar-Übersicht verliert jede Aussagekraft. Solange dieser Befehl
fehlt, ist dckl nicht dogfood-tauglich.

## Woran man merkt, dass es fertig ist

- `dckl task close DCK-12` setzt `status=done` atomar, ETag-geschützt,
  über denselben Schreib-Pfad wie der `PATCH`-Endpoint.
- Der aktive Claim wird mit geschlossen: `.active-task` wird geleert,
  wenn es auf diese Task zeigte — keine Zombie-Pointer.
- Erneutes Schließen einer bereits geschlossenen Task ist ein No-op:
  Hinweis ausgeben, Exit 0, `updated:` nicht bumpen, nichts ins
  CHANGELOG schreiben.
- Der Befehl verweigert den Abschluss, solange `security_checks` noch
  offene Einträge haben — außer mit `--force`.

## CLI-Signatur

```
dckl task close DCK-12            # erledigt markieren + Claim freigeben
dckl task close DCK-12 --force    # auch bei offenen Reminders schließen
```

## Out of scope

- `task reopen` (Richtung zurück). Bei Bedarf später.
- Mehrfach-Close (`task close DCK-11 DCK-12`). Eine Task pro Aufruf.
- Zusätzliche Status-Werte jenseits von `todo | in_progress | done`
  (kein `review`, `blocked`).
