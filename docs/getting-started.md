# Getting Started

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 10

## First run

```bash
pnpm install
pnpm build
pnpm deckel init    # scaffolds .deckel/, CLAUDE.md block, Claude Code skill, heartbeat hook
pnpm deckel         # starts the UI on http://localhost:4321
```

The bundled CLI bundles the server and the pre-built UI assets — a single
`pnpm deckel` boots everything, no orchestration needed.

## Dev workflow — two terminals

When you're iterating on the UI, the production bundle is a cache-hostile
path (every UI change needs `pnpm build` before you see it). Use the Vite
dev server with hot-reload instead — it proxies `/api/*` to the CLI
backend, so you get the real data without losing sub-second feedback.

```bash
# Terminal 1 — the API + data layer (stays up)
pnpm deckel

# Terminal 2 — the UI with hot-reload
pnpm dev        # opens http://localhost:5173
```

What happens behind the scenes:

- Terminal 1 runs the bundled CLI, binds to `:4321`, writes `.deckel/.port`.
- Terminal 2 runs `vite` on `:5173`. `vite.config.ts` proxies `/api/*` →
  `http://localhost:4321`, including the SSE stream at `/api/events`.
- `api.ts` fetches the CSRF token from `/api/token` once on startup (dev)
  or reads it from an injected `<meta>` tag (prod) — either way, writes
  are authenticated without you thinking about it.

**Open `http://localhost:5173` in the browser** (not :4321 while dev is
running). Edit any `.tsx` under `packages/ui/src/` — Vite hot-reloads in
under 100 ms.

## Available commands

| Command | What it does |
|---|---|
| `pnpm build` | Builds `@deckel/ui` (Vite) and `@deckel/cli` (tsup). UI assets are copied into `packages/cli/dist/ui/`. |
| `pnpm dev` | Runs `vite` (UI hot-reload on :5173) and `tsup --watch` (CLI re-bundle on source change). |
| `pnpm test` | Runs Vitest across all workspaces. |
| `pnpm typecheck` | Runs `tsc --noEmit` across all workspaces. |
| `pnpm lint` | Runs Biome in check mode. |
| `pnpm format` | Formats the repo with Biome. |
| `pnpm deckel` | Starts the CLI (default command: `serve`). |

## Deckel subcommands

```bash
pnpm deckel                              # serve — UI + API on :4321
pnpm deckel init                         # scaffold .deckel/ + Claude integration
pnpm deckel status                       # project-wide report
pnpm deckel doctor                       # audit .deckel/ consistency
pnpm deckel task claim <ID>              # mark task as live-worked (amber pulse)
pnpm deckel task release <ID>            # clear the claim
pnpm deckel check <ID> <check-id>        # toggle a reminder or test check
pnpm deckel correction add <ID> "text"   # log an issue found during work
pnpm deckel export <ID>                  # structured Claude prompt for a task
pnpm deckel vision init                  # scaffold .deckel/VISION.md
```

## Layout

```
packages/
  cli/      @deckel/cli    — commander-based CLI, bundles server
  server/   @deckel/server — Hono app factory (source-imported by CLI)
  ui/       @deckel/ui     — React + Vite + Tailwind, built to static assets
```

The CLI is self-contained after build: `packages/cli/dist/cli.js` plus
`packages/cli/dist/ui/` is everything shipped to npm.

## Troubleshooting

- **UI says "No .deckel/ in this directory":** run `pnpm deckel init`.
- **UI shows stale data:** your browser is on `:4321` but you expected
  live-reload. Switch to `:5173` during dev.
- **Commands fail with `server not running`:** start `pnpm deckel` in a
  separate terminal, then retry.
- **Orange banner on clicks doesn't appear:** the task may be claimed by
  a stale agent — run `pnpm deckel doctor` to spot it, then
  `pnpm deckel task release <ID>`.
