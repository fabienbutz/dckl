# Project

## dckl — discipline layer over GitHub Issues

dckl is the project we're building, *and* the system we use to manage
this repo. There is no `.dckl/` folder, no local state — issues,
milestones, and labels in GitHub are the source of truth.

The full agent specification lives at `.claude/skills/dckl/SKILL.md`.
That skill is authoritative for all dckl workflow — read it before any
`dckl_*` tool call. This file is the primer.

## Vision

**North star.** Project management for solo devs working with AI
agents: no calendar, no sidecar — just GitHub Issues + a discipline
layer that gives the agent a temporal-sterile view of the work.

**Audience.** Solo devs and very small teams using Claude Code.
Other AI hosts (Cursor, Cline, …) are TBD post-v0.1.

**Non-goals.**
- Stakeholder PM (Linear / Jira / Asana stay in their lane).
- Calendar features — no due dates, no time-boxed sprints, no
  burndowns. By design.
- CI/CD, PR review, code analysis.

**Current phase.** v0.1 pre-release. The active sprint and operational
tasks live in GitHub Milestones + Issues — not in this file. See the
README for the positioning manifest.

## Decisions

- **Source of truth:** GitHub Issues + Milestones + Labels. No `.dckl/`
  folder. No `TODOS.md`. No local state.
- **Roadmap = milestone list.** A separate `ROADMAP.md` would only
  drift; per-milestone Description carries goal + out-of-scope + DoD.
- **Temporal-sterile by design.** The MCP tool surface strips all date
  fields before they reach the agent. The agent never sees "when".
- **Distribution:** npm via `npx -y @dckl/cli init`.
- **License:** MIT.
- **Telemetry:** none, ever.
- **Platforms:** macOS + Linux first; Windows best-effort, no CI.
- **AI host:** Claude Code only in v0.1.
