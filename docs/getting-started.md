# Getting Started

> Sprint 0 scaffold. Only `serve` and `--version` are wired up — full
> functionality (`init`, sprint board, stack inventory, export) ships in
> later sprints.

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 10

## Local development

```bash
# Install dependencies
pnpm install

# Build everything (UI + server bundled into CLI)
pnpm build

# Start the server on http://localhost:4321
pnpm deckel

# Or specify a port
pnpm deckel --port 5000
```

## Available commands

| Command | What it does |
|---|---|
| `pnpm build` | Builds `@deckel/ui` (Vite) and `@deckel/cli` (tsup). UI assets are copied into `packages/cli/dist/ui/`. |
| `pnpm test` | Runs Vitest across all workspaces. |
| `pnpm typecheck` | Runs `tsc --noEmit` across all workspaces. |
| `pnpm lint` | Runs Biome in check mode. |
| `pnpm format` | Formats the repo with Biome. |
| `pnpm deckel` | Starts the CLI (default command: `serve`). |

## Layout

```
packages/
  cli/      @deckel/cli    — commander-based CLI, bundles server
  server/   @deckel/server — Hono app factory (source-imported by CLI)
  ui/       @deckel/ui     — React + Vite + Tailwind, built to static assets
```

The CLI is self-contained after build: `packages/cli/dist/cli.js` plus
`packages/cli/dist/ui/` is everything shipped to npm.
