# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Pivot to gh-pure MCP + Skill** — `dckl` is being rewritten as a thin
  layer over GitHub Issues, replacing the local CLI/UI/server stack.
  Source of truth moves from `.dckl/` Markdown files to GitHub Issues +
  Milestones + Labels. Agent layer is temporal-sterile (date fields are
  filtered out before reaching tools). See `README.md` for the new
  positioning and `TODOS.md` for the v0.1 roadmap.
- Distribution target: npm package, installed via
  `npx -y @scope/dckl-mcp init`.

### Added

- `TODOS.md` with the v0.1 roadmap and locked-in decisions.
- New `README.md` manifest: *"Project management for solo devs working
  with AI agents. No calendar. No sidecar."*

### Deprecated

- `packages/server/` (HTTP + SSE) — to be removed before v0.1.0.
- `packages/ui/` (Vue/React frontend) — to be removed before v0.1.0.
- `.dckl/` local sprint/task state — to be removed before v0.1.0; no
  migration path is planned (`dckl migrate` is out of scope for v0.1).

## [0.0.x] — pre-pivot

### Added

- Monorepo scaffold (pnpm workspaces, Biome, TypeScript base config).
