---
schema: 1
id: DCK-27
sprint_id: sprint-03-polish
title: "Backlog: Park-Ort für Tasks ohne Sprint"
type: feature
status: todo
security_checks: []
test_criteria:
  - id: schema-optional
    label: >-
      `TaskMeta.sprint_id` ist optional. Tasks in `.dckl/backlog/` parsen ohne
      `sprint_id`-Feld; Tasks in `.dckl/sprints/<id>/tasks/` haben es weiterhin.
    checked: false
  - id: cli-add
    label: >-
      `dckl backlog add "<title>" [--type feature]` schreibt eine Datei nach
      `.dckl/backlog/<next-id>.md` mit minimalem Frontmatter (id, title, type,
      created). Generiert die ID projektweit-fortlaufend.
    checked: false
  - id: cli-move
    label: >-
      `dckl task move <id> <sprint-id>` verschiebt einen Backlog-Task in den
      Ziel-Sprint: File-Move, `sprint_id`-Feld setzen, `task_ids` im Sprint-
      Index ergänzen. Atomar; bei Fehler kein halber Zustand.
    checked: false
  - id: api-list
    label: >-
      `GET /api/backlog` liefert `{ items: Task[] }` mit allen Backlog-Items,
      sortiert nach `created` desc.
    checked: false
  - id: ui-view
    label: >-
      Sidebar bekommt einen `Backlog`-Eintrag mit Counter. Klick öffnet
      `BacklogView` als Tabelle: Title, Type, Created, Corrections.
    checked: false
  - id: empty-graceful
    label: >-
      Repos ohne `.dckl/backlog/` rendern den Backlog-Button mit Counter `0`.
      Klick zeigt Empty-State mit Hinweis auf `dckl backlog add`.
    checked: false
corrections: []
context_files:
  - packages/server/src/schema/task.ts
  - packages/server/src/storage/store.ts
  - packages/server/src/routes/backlog.ts
  - packages/server/src/index.ts
  - packages/cli/src/commands/backlog.ts
  - packages/cli/src/commands/task.ts
  - packages/cli/src/cli.ts
  - packages/ui/src/components/BacklogView.tsx
  - packages/ui/src/components/Sidebar.tsx
  - packages/ui/src/lib/queries.ts
  - packages/ui/src/lib/use-route.ts
  - packages/ui/src/App.tsx
depends_on:
  - DCK-24
pre_flight:
  - >-
    User-Signal aus chalk-platform-Einsatz: 13-Task-Sprint geschrieben, aber
    weitere Ideen brauchen einen Park-Ort, der nicht zum Sprint-Theme passt.
    Backlog ist die Antwort.
  - >-
    sprint_id-optional-Refactor — alle bestehenden Tasks haben sprint_id, also
    rückwärtskompatibel. Aber im Code gibt es Stellen, die das Feld unbedingt
    erwarten (changelog events, store.patchTask). Audit vor dem Schema-Change.
---

## Worum es geht

Ein **Backlog** als Park-Ort für Task-Ideen, die zu keinem laufenden Sprint
passen. Tasks leben dann unter `.dckl/backlog/<id>.md` (parallel zu
`.dckl/sprints/`), haben kein `sprint_id` und kein `status`-Druck.

Wenn eine Idee reif ist: `dckl task move <id> <sprint>` befördert sie in
einen Sprint — File-Move, Sprint-Index-Update, `sprint_id` gesetzt.

## Warum jetzt

Direktes Signal aus chalk-platform: User hat einen kohärenten 13-Task-Sprint
geschrieben (`sprint-02-course-module-splits`). Während des Schreibens fallen
weitere Ideen an, die nicht zum Theme passen — heute haben sie nirgends Platz.
Folge: Ideen verlieren sich in Markdown-Kratzbüchern oder Slack-Drafts.

Backlog ist die Antwort: minimales Konzept, recycelt bestehende Task-Mechanik,
nur ein neuer Container.

## Scope

- **Schema:** `TaskMeta.sprint_id` wird optional (rückwärtskompatibel; alle
  bestehenden Tasks haben das Feld).
- **Storage:** `Store.listBacklog()`, `Store.getBacklogTask(id)`,
  `Store.nextTaskIdAcrossAll()` (ID-Vergabe projektweit).
- **API:** `GET /api/backlog` für die Liste.
- **CLI:** `dckl backlog add "<title>" [--type X]` und
  `dckl task move <id> <sprint-id>`.
- **UI:** Sidebar-Eintrag „Backlog" mit Counter, neue `BacklogView`-Tabelle,
  Hash-Route `#/backlog`.

## Out of scope

- Drawer/Edit-Flow für Backlog-Items in der UI. v0 ist read-only Table —
  Editieren via CLI / direkt im File.
- Drag-and-Drop „Backlog → Sprint" in der UI. Nur CLI-Command für jetzt.
- Priorität / Ordering im Backlog jenseits Created-Date. Drag-Sort kommt
  wenn echter Bedarf da ist.
- Backlog-Items als Drag-Quelle für Sprint-Boards. Erst Foundation, dann UX.
