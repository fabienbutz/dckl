# Project

<!-- deckel:start (auto-managed, do not edit between markers) -->
## Deckel — Task Tracker (managed by `deckel init`)

Sprint, chunk, and project-vision state lives under `.deckel/`. Full
protocols, quality bars, commit standards, and anti-patterns live in
`.claude/skills/deckel/SKILL.md`. Read that skill before acting on any
Deckel-tracked work; it is authoritative when it disagrees with this block.

### Commands you invoke directly

| Situation | Command |
|---|---|
| Start working on a task | `pnpm deckel task claim <ID>` |
| Finish / pause / switch task | `pnpm deckel task release <ID>` |
| Toggle a reminder or test check | `pnpm deckel check <ID> <check-id>` |
| Log an issue found mid-work | `pnpm deckel correction add <ID> "<text>"` |
| Read the whole task context (pipe to Claude) | `pnpm deckel export <ID>` |
| Project-wide state (gaps, in-flight, recent) | `pnpm deckel status` |
| Start the UI server | `pnpm deckel` (default command is `serve`) |

`pnpm deckel heartbeat` exists but fires automatically via the
`PostToolUse` hook in `.claude/settings.json`. **Do not invoke it
manually.**

### Invariants

- Mark `status: done` only when the user explicitly approves.
- Before any Write/Edit on a file you don't recognize, check whether it
  belongs to a tracked task:
  `grep -lF "<file>" .deckel/sprints/*/tasks/*.md`.
- Do not modify `.deckel/config.yaml`, `templates/`, or `VISION.md`
  without asking.
- `.deckel/.port` and `.deckel/.active-task` are runtime artefacts,
  already gitignored — never commit them.
<!-- deckel:end -->
