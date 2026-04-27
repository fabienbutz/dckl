# dckl

**Project management for solo devs working with AI agents. No calendar. No sidecar. Just GitHub Issues + a discipline layer.**

> Calendars are a pre-AI artifact.
> The first PM tool with no calendar. By design.
> Plan in dependencies, not days.

> **Status:** v0.1 in active development — see [TODOS.md](./TODOS.md) for the roadmap.
> The pre-pivot CLI/UI build remains on `main` until v0.1 ships.

## Why

AI made velocity-estimation a casino. A 2-month task can ship in a day; a 1-day task can become a 2-week research detour. Time-based planning — sprints with deadlines, story points, burndowns — assumes pre-AI predictability. It doesn't survive contact with AI-augmented work.

So we threw out time entirely.

dckl is a thin layer over GitHub Issues that gives your AI agent a temporal-sterile view of your work. The agent never sees due dates, milestones-with-deadlines, or "you're behind schedule." It sees what's blocking what, what's still open, and what's next unblocked. You keep your milestones, contracts, and calendar — they live where they always did. **dckl is the lens between you and the agent.**

## What it does

- **Discipline layer over GitHub Issues.** Issues are the source of truth. Labels carry status and priority. Milestones group thematically (without dates). Bodies follow a strict schema your AI can rely on.
- **Temporal-sterile filter.** Every tool response strips dates before it reaches your agent.
- **Atomic claim/release.** Multiple Claude tabs don't step on each other.
- **Context boundaries.** Each Issue declares which files belong to it. Edits outside that boundary require an explicit correction comment.
- **Cross-session continuity.** One MCP call (`dckl_session_resume`) returns your active task with all context — no scrolling through issues.

## What it is not

- A replacement for your stakeholder PM. Linear, Jira, Asana stay in their lane.
- A calendar tool. There are no due dates, no time-boxed sprints, no burndown charts. By design.
- A CI/CD or PR review tool.

## Install (target — v0.1)

```sh
npx -y @scope/dckl-mcp init
```

This:

1. Adds `dckl-mcp` to your project's `.mcp.json` (with confirmation).
2. Copies the dckl skill to `.claude/skills/dckl/SKILL.md`.
3. Installs `.github/ISSUE_TEMPLATE/dckl-task.yml`.
4. Creates the dckl labels in your GitHub repo.

Restart Claude Code, then ask: *"What's the dckl status?"*

## Requirements

- macOS or Linux (Windows: best effort, no CI).
- Node ≥ 20.
- A GitHub repo (public or private).
- One of: `GH_TOKEN` env var, or `gh auth login` already done.
- Claude Code (Cursor / Cline support TBD based on demand).

## Privacy

dckl sends **no telemetry**. Ever.

Your tasks live as GitHub Issues. If your repo is public, your tasks are public — dckl doesn't change that. For sensitive work, use a private repo.

dckl reads your GitHub token from `GH_TOKEN` or `gh auth token`. The token is used in-process only; never persisted, logged, or transmitted anywhere except to GitHub's API.

## How it works

```
GitHub Issues + Milestones + Labels    (source of truth)
            ↓ Octokit
packages/core/    (gh-wrapper + time-strip + body-parser)
            ↓
packages/mcp/     (MCP server, STDIO transport)
            ↓
Claude Code       (via .mcp.json)
```

Zero local state. No `.dckl/` folder.

## FAQ

**Why no due dates?**
Because your AI doesn't know what day it is. And because AI made velocity-estimation a casino. Plan in dependencies; ship when the graph clears.

**But my customer asks "when?"**
Tell them. Use a milestone due date externally if you must — dckl ignores it on purpose. Stakeholder communication isn't dckl's job.

**Does it work with Cursor / Cline / other AI tools?**
Not in v0.1. The skill file is Claude-Code-shaped. Other-tool support depends on demand.

**Why not just CLAUDE.md + TODO.md + gh issues?**
That's a great setup. dckl adds: temporal-sterile filtering, atomic state, context-file boundaries, structured Issue bodies, and cross-session continuity in one MCP call. Use plain Markdown if those don't matter to you.

**What if my Issue body breaks the schema?**
`dckl doctor` surfaces it. Tools warn rather than crash.

**Will this ever support Linear / Jira?**
No. Source-of-truth lock-in is part of the design.

## License

MIT — see [LICENSE](./LICENSE).

## Contributing

Solo-dev OSS-Tool. Issues and PRs welcome, but expect slow review cycles. The opinionated positioning ("no calendar, by design") is non-negotiable — please don't open PRs adding deadline support.
