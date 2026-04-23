---
schema: 1
id: DCK-26
sprint_id: sprint-03-polish
title: Sprint-Live-Signal aus Task-Aktivität ableiten
type: feature
status: in_progress
security_checks: []
test_criteria:
  - id: live-from-in-progress
    label: >-
      Ein Sprint, der mindestens eine Task mit `status: in_progress` enthält,
      erscheint in der Sidebar amber — unabhängig von `status:
      planning/review/done` im Frontmatter.
    checked: false
  - id: live-from-fresh-claim
    label: >-
      Ein Sprint mit mindestens einem Task, dessen `claim.heartbeat` jünger als
      `CLAIM_TTL_MS` (5 min) ist, gilt als live.
    checked: false
  - id: endpoint-payload
    label: >-
      `GET /api/sprints` liefert pro Sprint ein derived Feld `live: boolean`,
      zusätzlich zur deklarierten `status`. Frontmatter bleibt unverändert —
      kein Write.
    checked: false
  - id: ui-precedence
    label: >-
      Sidebar zeigt Amber-Dot wenn `live === true` ODER `status === "active"`.
      Kein Konflikt, keine Doppel-Anzeige.
    checked: false
  - id: no-performance-regression
    label: >-
      Die Sprint-Liste-Endpoint-Latenz steigt in einem typischen Projekt (≤ 10
      Sprints × ≤ 25 Tasks) nicht spürbar. Worst-case: 250 Task-
      Frontmatter-Reads, sollte deutlich unter 100ms bleiben.
    checked: false
corrections: []
context_files:
  - packages/server/src/routes/sprints.ts
  - packages/server/src/storage/store.ts
  - packages/server/src/schema/sprint.ts
  - packages/ui/src/components/Sidebar.tsx
  - packages/ui/src/lib/api.ts
depends_on:
  - DCK-18
pre_flight:
  - >-
    User-Signal: „im letzten sprint wird auch gearbeitet, weshalb ist der nicht
    als aktiv markiert?" — heißt: Status-Feld im Frontmatter driftet von der
    Realität. Statt zum manuellen Pflegen zu zwingen, leite `live` aus
    Task-Aktivität ab.
  - >-
    Derived-Field-Pattern: nirgends persistieren, bei jedem Listen- Aufruf neu
    berechnen. Die Wahrheit liegt in den Task-Files, nicht in einer
    Doppel-Schreibung.
claim:
  by: claude-code
  at: '2026-04-23T19:01:44.415Z'
  heartbeat: '2026-04-23T19:03:08.856Z'
---

## Worum es geht

Die Sidebar zeigt Sprints als aktiv (amber-Dot) nur wenn das
`status`-Feld im Frontmatter `active` ist. Das verlangt vom User,
manuell nachzuziehen — und driftet, wenn er Tasks bearbeitet ohne
den Sprint-Status hochzustufen.

Diese Task leitet einen `live`-Flag pro Sprint automatisch aus
Task-Aktivität ab: Ein Sprint ist live, wenn **irgendeine** seiner
Tasks entweder `status: in_progress` hat oder einen frischen Claim
(Heartbeat < 5 min). Die deklarierte `status` im Frontmatter bleibt
unangetastet — derived-only.

## Warum jetzt

Direktes User-Feedback aus dem rubenbauer-Einsatz: `sprint-02` steht
auf `status: planning`, obwohl gerade daran gearbeitet wird. Statt
den User zur Status-Disziplin zu nötigen, soll das Tool erkennen,
wo Tätigkeit ist.

## Woran man merkt, dass es fertig ist

Siehe Test-Kriterien in der Frontmatter.

## Out of scope

- `status`-Feld automatisch beim Claim auf `active` setzen.
  Zu invasiv — wäre ein implizites Data-Write ohne User-Kontrolle.
- Verschiedene Live-Levels (aktiv-mit-heartbeat vs. nur-in_progress).
  Binary reicht — Sidebar-Dot ist one-bit-anzeige.
- „Live-Indikator" auf Journey- oder Task-Ebene. Sprint-scope.
