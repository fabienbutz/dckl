/**
 * Content scaffolded by `dckl init` as a first-run tutorial sprint. Three
 * tiny tasks that each exercise one core mechanic:
 *   TSK-01 — check   (click a checkbox, or run `dckl check`)
 *   TSK-02 — claim   (amber pulse + auto-status-bump)
 *   TSK-03 — correction (appends to the changelog)
 *
 * The whole sprint is meant to be deleted once the user has walked
 * through it. That instruction is in the sprint body.
 */

export function renderStarterSprint(prefix: string, today: string, weekLater: string): string {
  return `---
schema: 1
id: sprint-00-welcome
name: Welcome — try dckl on itself
goal: Three tiny tasks that teach the core mechanics. Delete this sprint when you're done.
status: active
start: ${today}
end: ${weekLater}
based_on: null
task_ids:
  - ${prefix}-01
  - ${prefix}-02
  - ${prefix}-03
---

## Welcome to dckl

\`dckl init\` scaffolded this sprint as your five-minute tour. Each task
below demonstrates one core mechanic. Work through them in order — they
build on each other.

### The three mechanics

1. **Check** — mark an acceptance criterion addressed. Click a checkbox
   in the drawer, or run \`pnpm dckl check <task-id> <check-id>\`.
2. **Claim** — signal that a task is being actively worked on. The UI
   shows an **amber pulse** on the status icon. \`pnpm dckl task claim\`
   also auto-bumps the task status from \`todo\` to \`in_progress\`.
3. **Correction** — log an issue discovered mid-work without leaving the
   CLI. The entry lands in \`.dckl/CHANGELOG.md\` and in the task's
   \`corrections\` field.

### When you're done

    rm -rf .dckl/sprints/sprint-00-welcome

Or just set the sprint's \`status\` to \`done\` and move on — the folder
stays for reference.
`;
}

export function renderStarterTask01(prefix: string): string {
  return `---
schema: 1
id: ${prefix}-01
sprint_id: sprint-00-welcome
title: "Check off a reminder and a test"
type: chore
status: todo
security_checks:
  - { id: gdpr-storage, checked: false }
test_criteria:
  - { id: ui-click, label: "Click this checkbox in the drawer to flip it", checked: false }
  - { id: cli-check, label: "Or: run \`pnpm dckl check ${prefix}-01 cli-check\` in a terminal", checked: false }
corrections: []
---

## ${prefix}-01 — Check off a reminder and a test

Two ways to mark something addressed:

1. **In the UI:** click the checkbox in the drawer. The checkmark pops
   in with a spring animation and the change writes to disk immediately.
2. **In the CLI:** run \`pnpm dckl check ${prefix}-01 <check-id>\`. The
   check ID is the \`id\` field of the entry in \`security_checks\` or
   \`test_criteria\`. The UI picks up the change live via SSE.

Both paths end in the same place: \`.dckl/sprints/sprint-00-welcome/tasks/${prefix}-01.md\`
gets a new \`checked: true\`. Watch the file in git diff if you want to see
the diff-friendliness dckl is built around.

### What to try

- Flip the \`ui-click\` checkbox above by clicking it.
- Open a terminal and run \`pnpm dckl check ${prefix}-01 cli-check\`.
- See both entries marked checked, and both events in the Changelog view.
`;
}

export function renderStarterTask02(prefix: string): string {
  return `---
schema: 1
id: ${prefix}-02
sprint_id: sprint-00-welcome
title: "Claim a task and watch the amber pulse"
type: chore
status: todo
security_checks: []
test_criteria:
  - { id: claim, label: "Run \`pnpm dckl task claim ${prefix}-02\` — status bumps to in_progress, amber pulses on the icon", checked: false }
  - { id: release, label: "Run \`pnpm dckl task release ${prefix}-02\` — amber stops, status stays in_progress", checked: false }
corrections: []
---

## ${prefix}-02 — Claim a task and watch the amber pulse

**Claim** is dckl's signal for "work is happening here right now". It
writes a \`claim:\` block to the task file with an agent name and a
heartbeat timestamp. The UI renders this as an amber-coloured status
icon that **pulses** — the tool's single semantic colour, used nowhere
else.

Side effect: claiming a \`todo\` task auto-bumps the status to
\`in_progress\`. This is so the amber indicator (which only shows on
\`in_progress\` + fresh claim) actually fires without you thinking about it.

### What to try

1. In a terminal: \`pnpm dckl task claim ${prefix}-02\`.
2. Look at this task in the board — the status icon should be a
   **filled amber half-moon, pulsing**.
3. Still in the terminal: \`pnpm dckl task release ${prefix}-02\`. Pulse
   stops, half-moon goes off-white.
4. Claude Code integration: when the Claude Code session hook is
   installed (it is, via \`dckl init\`), \`heartbeat\` auto-fires on every
   Write/Edit/Bash — so the amber stays alive while the AI is working.
`;
}

export function renderStarterTask03(prefix: string): string {
  return `---
schema: 1
id: ${prefix}-03
sprint_id: sprint-00-welcome
title: "Log a correction and watch the changelog fill"
type: chore
status: todo
security_checks: []
test_criteria:
  - { id: correction, label: "Run \`pnpm dckl correction add ${prefix}-03 \\\"Hello from the changelog\\\"\`", checked: false }
  - { id: changelog, label: "Click 'Changelog' in the sidebar — your entry is at the top", checked: false }
corrections: []
---

## ${prefix}-03 — Log a correction and watch the changelog fill

A **correction** is an issue you discover while working on a task. Rather
than fix it silently (and lose the trace) or switch to a new task (and
lose context), you log it on the current task. The entry lands in:

- The task's \`corrections:\` array (visible in the drawer's Corrections
  section).
- \`.dckl/CHANGELOG.md\` (visible in the Changelog view).

Corrections are what turn task-hopping into task-completing: they're the
breadcrumbs that let future-you pick up the frayed ends.

### What to try

1. In a terminal:
   \`pnpm dckl correction add ${prefix}-03 "Hello from the changelog"\`.
2. Click **Changelog** in the sidebar. Your entry shows at the top of
   today's section.
3. Come back to this task — the Corrections section in the drawer now has
   one open item.
`;
}
