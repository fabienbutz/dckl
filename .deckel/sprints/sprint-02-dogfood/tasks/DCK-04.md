---
schema: 1
id: DCK-04
sprint_id: sprint-02-dogfood
title: 'Claude Code memory reader — read-only, privacy-aware'
type: feature
status: done
security_checks:
  - id: input-validation
    checked: true
  - id: secrets-not-committed
    checked: true
test_criteria:
  - id: path-derivation
    label: >-
      Server: derives ~/.claude/projects/<escaped-cwd>/memory/ correctly from
      cwd
    checked: true
  - id: never-persists
    label: 'Privacy: memory content is never cached to .deckel/ or committed to git'
    checked: true
  - id: ui-collapsed-default
    label: >-
      UI: Memory section is collapsed by default, labelled 'user-private (local
      only)'
    checked: true
  - id: nomemory-flag
    label: >-
      Server: --no-memory CLI flag disables the scanner entirely (for
      screenshare/demo contexts)
    checked: true
corrections:
  - id: c1
    text: >-
      Scope expanded to packages/cli/src/commands/serve.ts +
      packages/cli/src/cli.ts for threading --no-memory flag through from CLI to
      createApp options (per SKILL edge-case rule; context_files only listed
      server + UI files).
    open: true
    target_sprint: null
context_files:
  - packages/server/src/storage/memory-reader.ts
  - packages/server/src/routes/stack.ts
  - packages/ui/src/components/StackView.tsx
depends_on:
  - DCK-02
pre_flight:
  - >-
    Read the auto-memory section in ~/.claude/CLAUDE.md to understand the file
    layout
  - >-
    Decide on the screenshare-safe default: section collapsed, badge
    'user-private'
updated: '2026-04-23T12:57:56.274Z'
---

## DCK-04: Claude Code memory reader — read-only, privacy-aware

Index `~/.claude/projects/<escaped-cwd>/memory/*.md` and surface it in
the Stack-View as a **Memory** section. Parse frontmatter (name,
description, type) and render a category grouping (user / feedback /
project / reference).

### Why

Claude accumulates facts about the user and project across sessions that
are invisible in the repo. Without surfacing them, the user has no way
to know what Claude "believes" — leading to contradictory instructions
and stale assumptions. Visibility is the fix.

### Why this is dangerous

Memory is user-private. A screenshare with the wrong pane open leaks
feedback like "user disliked X last week". Every design decision here
must default to **hide, don't reveal**.

### Out of scope

- Editing memory (memory is Claude's; Deckel is a mirror).
- Cross-project memory browsing.
- Syncing memory to another machine.
