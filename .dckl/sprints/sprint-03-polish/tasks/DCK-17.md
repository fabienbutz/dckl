---
schema: 1
id: DCK-17
sprint_id: sprint-03-polish
title: Task-Body im Drawer anzeigen und Markdown rendern
type: feature
status: done
security_checks:
  - id: input-validation
    checked: true
test_criteria:
  - id: body-rendered
    label: >-
      Der `TaskDrawer` rendert `task.body` als Markdown (GFM aktiv, konsistent
      mit `MarkdownReader`) unterhalb des Titels.
    checked: true
  - id: inline-code-in-labels
    label: >-
      Inline-Code in Check-Labels (`security_checks` und `test_criteria`)
      erscheint als Code-Span — keine Roh-Backticks im UI-Text.
    checked: true
  - id: code-fences-rendered
    label: >-
      Code-Fences im Body werden als Block-Code dargestellt (monospace, eigener
      Hintergrund). Kein Syntax-Highlighting (out of scope).
    checked: true
  - id: styling-consistent
    label: >-
      Drawer-Styling bleibt Linear-monochrom konsistent — gleiche Typografie-
      und Spacing-Klassen wie `MarkdownReader`.
    checked: true
  - id: empty-body-graceful
    label: >-
      Tasks mit leerem `body` erzeugen kein Layout-Artefakt (kein leerer Block,
      kein unerwartetes Padding).
    checked: true
corrections:
  - id: c1
    text: >-
      Drawer-Architektur: 420px Flex-Panel → 780px Overlay (absolute right-0,
      z-20), damit SprintBoard dahinter die volle Breite behält.
    open: false
    target_sprint: null
  - id: c2
    text: >-
      Globale MD_COMPONENTS-Typografie angehoben (p 14→15px, line-height
      22→26px, h2→18px, pre 13→14px) — User wollte größere Font + mehr
      Zeilenhöhe. Betrifft auch MarkdownReader, bewusst konsistent.
    open: false
    target_sprint: sprint-04-future
  - id: c3
    text: >-
      Inline-Code-Styling nach 3 User-Iterationen: text-text-secondary,
      bg-white/[0.14], border border-border, px-[6px] py-[1px]. Vorher zu
      dunkel/unsichtbar auf dem Canvas.
    open: true
    target_sprint: null
  - id: c4
    text: >-
      Sidebar-TaskRow: Titel wird nun ebenfalls via MarkdownInline
      (compact-Variante, kein Border) gerendert — war ursprünglich als
      Out-of-scope markiert, User hat umdisponiert.
    open: true
    target_sprint: null
  - id: c5
    text: >-
      Drawer-Header: Amber-Border bei Live-Claim entfernt; Pulse-Dot + claim.by
      jetzt rechts neben Task-ID (vorher links vom ID).
    open: true
    target_sprint: null
  - id: c6
    text: >-
      Drawer horizontales Padding erhöht: px-8 → px-12 (zusammen mit width bump
      auf 780px).
    open: true
    target_sprint: null
context_files:
  - packages/ui/src/components/TaskDrawer.tsx
  - packages/ui/src/components/Checkbox.tsx
  - packages/ui/src/components/MarkdownReader.tsx
depends_on: []
pre_flight:
  - >-
    `MarkdownReader.tsx` lesen — die `MD_COMPONENTS`-Konstante in ein shared
    Modul extrahieren, nicht duplizieren.
  - >-
    Schema prüfen (`packages/server/src/schema.ts` oder äquivalent): Ist `body:
    string` auf `Task` bereits verfügbar, oder muss das Interface erweitert
    werden?
updated: '2026-04-23T14:36:33.810Z'
---

## Worum es geht

Der `TaskDrawer` zeigt den Task-Body aktuell **gar nicht** an — nur
Titel, Reminders, Test-Criteria und Corrections. Der schön formulierte
Inhalt der `.md`-Datei bleibt in der UI unsichtbar. Zusätzlich werden
Check-Labels als Plain-String gerendert, sodass Backticks wie in
`` `dckl task close` `` als Roh-Zeichen erscheinen.

Dieser Task rendert den Body als Markdown (via bereits installiertem
`react-markdown` + `remark-gfm`) und wandelt Inline-Code in Labels in
echte `<code>`-Spans um.

## Warum jetzt

Ohne Body-Rendering ist jede Mühe, Task-Beschreibungen verständlich
zu formulieren, wertlos — der Content existiert nur in der Datei und
über `dckl export`, aber nicht in der UI. Das unterläuft genau den
Zweck des Dogfood-Experiments: "auf einen Blick verstehen, was gerade
abgearbeitet wird."

Die fünf anderen Sprint-03-Tasks sollen in Deutsch umgeschrieben
werden, aber das hat keinen Sinn, solange niemand den neuen Body
tatsächlich sieht.

## Woran man merkt, dass es fertig ist

- Der `TaskDrawer` zeigt `task.body` unterhalb des Titels, gerendert
  via `ReactMarkdown` + `remark-gfm`.
- Die Styling-Komponenten (`MD_COMPONENTS`) sind in ein shared Modul
  extrahiert und werden von `MarkdownReader` **und** `TaskDrawer`
  genutzt — keine Duplizierung.
- Check-Labels mit Inline-Code-Backticks erscheinen als Code-Span.
- Code-Fences im Body werden als Block-Code gerendert (monospace,
  eigener Hintergrund).
- Leere Bodies erzeugen kein Layout-Artefakt.

## Scope-Erweiterungen während der Umsetzung

Durch User-Feedback mid-work kam dazu (siehe Corrections c1–c6):

- Drawer-Breite und -Padding: 420 → 780px, `px-8` → `px-12`.
- Drawer-Architektur: Overlay (`absolute right-0`) statt Flex-Panel.
- Globale `MD_COMPONENTS`-Typografie angehoben (betrifft auch
  `MarkdownReader`, bewusst konsistent).
- Sidebar-TaskRow rendert Titel jetzt ebenfalls via `MarkdownInline`
  (compact-Variante, kein Border).
- Drawer-Header: Amber-Border entfernt, Pulse-Dot + `claim.by` rechts
  neben Task-ID statt links.

## Out of scope

- Syntax-Highlighting für Code-Fences (eigene Task, niedrige Priorität).
- Editor / In-place-Bearbeitung des Bodys. Body bleibt read-only.
- Markdown-Rendering in der Sidebar-Summary-Line — das ist DCK-11.
