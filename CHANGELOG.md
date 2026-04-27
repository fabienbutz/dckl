# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Pivot to gh-pure MCP + Skill** — `dckl` rewritten as a thin layer
  over GitHub Issues. Source of truth moved from `.dckl/` Markdown
  files to GitHub Issues + Milestones + Labels. Agent layer is
  temporal-sterile (date fields are filtered out before reaching
  tools). See `README.md` for positioning, `TODOS.md` for the
  remaining v0.1 roadmap.
- Distribution target: npm packages, installed via
  `npx -y @dckl/mcp init`.

### Added

- `TODOS.md` with the v0.1 roadmap.
- `README.md` manifest: *"Project management for solo devs working
  with AI agents. No calendar. No sidecar."*
- `@dckl/core` package: Octokit wrapper, defensive body parser,
  time-strip filter, optimistic concurrency, ETag cache, 17
  high-level operations.
- `@dckl/mcp` package: STDIO MCP server with 17 tools and 2
  auto-loaded resources.
- `@dckl/cli` (rewritten): three commands (`init`, `status`,
  `doctor`) wrapping `@dckl/core`.
- `.github/ISSUE_TEMPLATE/dckl-task.md` — Markdown template with the
  body schema.
- `.github/workflows/ci.yml` — lint, typecheck, test, build on PR/push.
- `.github/workflows/publish.yml` — `pnpm publish -r` on `v*` tags.

### Removed

- `packages/server/` (HTTP + SSE) — replaced by the MCP layer.
- `packages/ui/` (Vue/React frontend) — replaced by the agent surface.
- `.dckl/` local sprint/task state — GitHub Issues take its place. No
  migration path is provided (`dckl migrate` is parked indefinitely).

## [0.0.x] — pre-pivot

### Added

- Monorepo scaffold (pnpm workspaces, Biome, TypeScript base config).
