---
schema: 1
id: DCK-18
sprint_id: sprint-03-polish
title: 'Umbenennung `deckel` → `dckl` (Files, Packages, CLI, Skill)'
type: chore
status: done
security_checks:
  - id: secrets-not-committed
    checked: true
test_criteria:
  - id: cli-starts
    label: >-
      `pnpm dckl` startet den UI-Server, liest alle bestehenden Sprints korrekt,
      UI lädt ohne Fehler.
    checked: true
  - id: all-subcommands
    label: >-
      Alle Subcommands funktionieren unter neuem Namen: `dckl task
      claim/release/close`, `dckl check`, `dckl correction add/resolve`, `dckl
      status`, `dckl export`, `dckl journey`, `dckl doctor`, `dckl vision`,
      `dckl heartbeat`.
    checked: true
  - id: hook-fires
    label: >-
      PostToolUse-Hook in `.claude/settings.json` ruft `pnpm dckl heartbeat`
      auf; aktive Claims werden korrekt heartbeatet.
    checked: true
  - id: data-intact
    label: >-
      `.dckl/` enthält alle Sprints (01, 02, 03), alle Task-IDs bleiben
      unverändert (`DCK-NN`), `VISION.md`, `CHANGELOG.md` und Config sind 1:1
      übernommen.
    checked: true
  - id: task-bodies-updated
    label: >-
      Alle Task-Bodies aller bestehenden Sprints referenzieren `pnpm dckl ...`
      statt `pnpm deckel ...` (string-replace, kein Content-Rewrite —
      inhaltliche Migration ist DCK-19).
    checked: true
  - id: zero-residual-code
    label: >-
      `grep -ri "deckel" --exclude-dir={node_modules,.git,dist}
      --exclude=CHANGELOG.md .` liefert in lebenden Dateien keinen Treffer mehr
      (abgesehen von DCK-18 selbst, der den alten Namen bewusst referenziert).
      Git-Historie darf "deckel" enthalten.
    checked: true
  - id: skill-moved
    label: >-
      `.claude/skills/deckel/` wurde nach `.claude/skills/dckl/` verschoben; die
      Skill-Trigger und alle `pnpm deckel`-Referenzen in SKILL.md sind auf `pnpm
      dckl` aktualisiert.
    checked: true
  - id: ui-smoke-test
    label: >-
      UI-Smoke-Test: Sidebar lädt, TaskDrawer öffnet, Claims werden gesetzt und
      freigegeben, Checks lassen sich flippen, SSE reagiert auf File-Änderungen.
    checked: false
corrections: []
context_files:
  - package.json
  - packages/cli/package.json
  - packages/server/package.json
  - packages/ui/package.json
  - CLAUDE.md
  - .claude/skills/dckl/SKILL.md
  - .claude/settings.json
  - README.md
depends_on:
  - DCK-17
pre_flight:
  - >-
    Git-Status sauber vor Start (keine uncommitted Changes außer den
    DCK-17-Änderungen, die separat committet werden). Sonst vermischen sich
    Rename-Diffs mit Content-Diffs und der Review wird unleserlich.
  - >-
    DCK-17 muss released sein; idealerweise ist der DCK-17-Commit schon gesetzt.
    Zwei semantische Änderungen nie im selben Commit mischen.
  - >-
    Baseline-Grep als Start-Zahl festhalten: `grep -rF "deckel"
    --exclude-dir=node_modules --exclude-dir=.git --exclude=CHANGELOG.md . | wc
    -l`. Am Ende soll der Wert auf Git-Historie + CHANGELOG runter sein.
  - >-
    Der `clnt`-MCP-Namespace im User-Setup ist ein eigenständiges Projekt und
    bleibt unberührt. Dieser Rename ist kein Merge.
updated: '2026-04-23T14:53:01.160Z'
---

## Worum es geht

Alle Vorkommen des alten Projektnamens `deckel` im Code, in den
Configs, in der Skill und in der Doku durch `dckl` ersetzen. Konkret
umfasste das:

- **Verzeichnisse:** `.deckel/` → `.dckl/`, `.claude/skills/deckel/`
  → `.claude/skills/dckl/`.
- **Monorepo-Packages:** `@deckel/cli`, `@deckel/server`,
  `@deckel/ui` → `@dckl/*`, plus alle Workspace-Referenzen.
- **Binary / CLI-Command:** `deckel` → `dckl` im `bin`-Feld von
  `packages/cli/package.json` und als root-Script.
- **Doku und Skill:** Jede `pnpm deckel ...`-Referenz in `SKILL.md`,
  `CLAUDE.md` (inkl. managed block), `README.md` und in jedem
  bestehenden Task-Body (string-replace, kein Content-Rewrite).
- **Hooks:** PostToolUse-Einträge in `.claude/settings.json`.
- **Hardcodierte Strings im Code:** Error-Messages wie
  `"run `pnpm dckl init`"`, UI-Handler-Fallbacks, hardcoded Pfade
  mit `.dckl/`.

Das Task-ID-Präfix `DCK-` bleibt — es ist bereits das Konsonanten-
Akronym von `dckl`, kein Rename nötig.

## Warum jetzt

Der Name „Deckel" soll weg, das Konzept bleibt. Du willst `dckl`
als nächstes in einem externen Projekt ausprobieren. Jede externe
Nutzung unter dem alten Namen zementiert den alten Namen weiter —
also vor dem ersten externen Einsatz sauber renamen.

## Migration-Strategie

1. **DCK-17 committen** (separater Commit, klar abgegrenzt).
2. **Filesystem-Renames** via `git mv`, damit Git jede Datei als
   Rename erkennt und die Historie pro File erhalten bleibt.
3. **Package-Manifeste** in allen vier `package.json` anpassen (root
   + drei Packages), Workspace-Refs mitziehen.
4. **Skill-Move:** Ordner umbenennen, `name`-Feld in der Skill-
   Beschreibung, Trigger-Liste, alle Command-Referenzen.
5. **String-Replace** in Code und Markdown (außer `CHANGELOG.md` —
   dort zählt historische Wahrheit).
6. **Task-Bodies aller Sprints:** `pnpm deckel` → `pnpm dckl`.
   Inhaltliche Umformulierung ist nicht Teil dieser Task (siehe
   DCK-19).
7. **Hooks** in `.claude/settings.json` aktualisieren.
8. **Build + Smoke-Test:** `pnpm -r typecheck`, `pnpm -r build`,
   Server neu starten, UI testen, Claim-Flow testen.
9. **Baseline-Grep bestätigen:** keine Treffer mehr in lebenden
   Dateien.

## Woran man merkt, dass es fertig ist

Siehe Test-Kriterien in der Frontmatter — jedes Kriterium ist eine
harte, prüfbare Aussage.

## Out of scope

- **Inhaltliche Umformulierung** von Task-Bodies aus Sprint-01/02 auf
  das neue Deutsch-Template (Worum/Warum/Woran). Das ist **DCK-19**.
- **Rewrite der Git-Historie.** Alte Commits referenzieren „deckel"
  und sollen das bleiben — historische Wahrheit.
- **Merge mit dem externen `clnt`-Projekt** im MCP-Namespace. Das ist
  ein separates Projekt und bleibt unberührt.
- **Rename des Task-ID-Präfixes** `DCK-`. Das Präfix ist bereits
  korrekt für `dckl`.
