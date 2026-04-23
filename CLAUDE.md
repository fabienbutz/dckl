# Project

<!-- dckl:start (auto-managed, do not edit between markers) -->
## dckl — Task Tracker (managed by `dckl init`)

Sprint, chunk, and project-vision state lives under `.dckl/`. Full
protocols, quality bars, commit standards, and anti-patterns live in
`.claude/skills/dckl/SKILL.md`. Read that skill before acting on any
dckl-tracked work; it is authoritative when it disagrees with this block.

### Commands you invoke directly

| Situation | Command |
|---|---|
| Start working on a task | `pnpm dckl task claim <ID>` |
| Pause / switch task (status stays) | `pnpm dckl task release <ID>` |
| Mark a task done + release claim | `pnpm dckl task close <ID>` (add `--force` if reminders still open) |
| Toggle a reminder or test check | `pnpm dckl check <ID> <check-id>` |
| Log an issue found mid-work | `pnpm dckl correction add <ID> "<text>"` |
| Close a resolved correction | `pnpm dckl correction resolve <ID> <cid>` (add `--target-sprint` to forward) |
| Archive a sprint with SUMMARY.md | `pnpm dckl sprint close <SPRINT-ID>` (add `--force` / `--dry-run`) |
| Audit layout + auto-clear orphans | `pnpm dckl doctor [--fix]` |
| Read the whole task context (pipe to Claude) | `pnpm dckl export <ID>` |
| Project-wide state (gaps, in-flight, recent) | `pnpm dckl status` |
| Start the UI server | `pnpm dckl` (default command is `serve`) |
| Stop the running server | `pnpm dckl stop` |

`pnpm dckl heartbeat` exists but fires automatically via the
`PostToolUse` hook in `.claude/settings.json`. **Do not invoke it
manually.**

### Invariants

- Mark `status: done` only when the user explicitly approves.
- Before any Write/Edit on a file you don't recognize, check whether it
  belongs to a tracked task:
  `grep -lF "<file>" .dckl/sprints/*/tasks/*.md`.
- Do not modify `.dckl/config.yaml`, `templates/`, or `VISION.md`
  without asking.
- `.dckl/.port` and `.dckl/.active-task` are runtime artefacts,
  already gitignored — never commit them.
<!-- dckl:end -->
