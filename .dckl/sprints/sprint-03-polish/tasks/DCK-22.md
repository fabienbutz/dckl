---
schema: 1
id: DCK-22
sprint_id: sprint-03-polish
title: "Frontend-Sitemap: Routes eines Projekts auflisten"
type: feature
status: todo
security_checks:
  - id: input-validation
    checked: false
test_criteria:
  - id: nextjs-auto-detect
    label: >-
      Wenn `next.config.{js,ts,mjs}` existiert, scannt dckl automatisch
      `app/**/page.{tsx,ts,jsx,js}` und `pages/**/*.{tsx,ts,jsx,js}`
      und leitet Routen aus Dateipfaden ab (Route-Groups `(auth)`
      gestrippt, `[slug]` beibehalten).
    checked: false
  - id: config-override
    label: >-
      `.dckl/config.yaml` erlaubt explizite Konfiguration:
      `pages.roots: [app, pages]`, `pages.glob: "**/page.{tsx,ts}"`.
      Override hat Vorrang vor Auto-Detection.
    checked: false
  - id: cli-output
    label: >-
      `dckl pages` druckt den Route-Tree als Markdown. Mit `--json`
      als maschinenlesbares Array `{ route, file }`.
    checked: false
  - id: ui-view
    label: >-
      UI-Nav bekommt einen "Pages"-Eintrag (links unter "Journeys"),
      der den Route-Tree hierarchisch rendert. Klick auf eine Route
      öffnet die File im Stack-View.
    checked: false
  - id: no-framework-noop
    label: >-
      In Projekten ohne erkennbares Frontend-Framework und ohne
      `pages.*`-Config: `dckl pages` gibt einen klaren Hinweis aus
      (kein Crash, kein leerer Output).
    checked: false
corrections: []
context_files:
  - packages/cli/src/commands/pages.ts
  - packages/cli/src/cli.ts
  - packages/server/src/routes/pages.ts
  - packages/server/src/storage/route-scanner.ts
  - packages/ui/src/components/PagesView.tsx
  - packages/ui/src/components/Sidebar.tsx
depends_on:
  - DCK-18
pre_flight:
  - >-
    Signal aus externem Einsatz (rubenbauer): Next.js-Projekt, Nutzer
    will „alle Frontend-Seiten auf einen Blick". Konkretes Use-Case,
    nicht Feature-Spekulation.
  - >-
    Scanner-Abstraktion so halten, dass spätere Adapter (SvelteKit,
    Astro) einfach hinzugefügt werden können — aber nicht jetzt
    bauen. Next.js reicht für den ersten Schnitt.
---

## Worum es geht

dckl listet die Frontend-Pages eines Projekts auf — in der UI als
Baum (neuer Nav-Eintrag „Pages") und per CLI via `dckl pages`.
Default-Scanner für Next.js (`app/**/page.*`, `pages/**/*`). Andere
Frameworks via Config-Override.

Der eigentliche Gewinn: auf einen Blick sehen, welche Routen das
Projekt hat, ohne `find` / `tree` auf der Shell zu starten. Später
(eigener Task) Korrelation mit `context_files` → „welche Tasks
betreffen `/dashboard`?".

## Warum jetzt

Direkt aus dem ersten externen Einsatz: der Nutzer hat dckl in einem
Next.js-Repo installiert und nach 10 Minuten gefragt, ob dckl eine
Sitemap zeigen kann. Das ist realer Schmerz, nicht Feature-Spekulation.

## Woran man merkt, dass es fertig ist

Siehe Test-Kriterien in der Frontmatter.

## Out of scope

- Adapter für SvelteKit, Astro, Remix. Next.js-first, Adapter-Plugin-
  Points später wenn Bedarf da ist.
- Sitemap-XML-Generator für SEO. Anderes Tool.
- File → Task-Korrelation. Eigener Task, nachdem Pages als reine
  Liste getestet und angenommen ist.
- Auto-Refresh bei File-System-Changes. Scan on demand reicht.
