# dckl v0.1 — Roadmap

> Pivot from local CLI/UI tool → gh-pure MCP + Skill.
> Realistic timeline: 6–8 weeks at ~50% utilization.
> See README for the positioning manifest and final architecture.

## Decisions locked in

- Source of truth: GitHub Issues + Milestones + Labels (no `.dckl/` folder).
- Agent layer is temporal-sterile: dates filtered out before reaching tools.
- Distribution: npm package via `npx -y @scope/dckl-mcp init`.
- License: MIT.
- Platforms: macOS + Linux first; Windows best-effort, no CI.
- Telemetry: none, ever.
- Skill: Claude Code only in v0.1.

---

## Phase 1 — Foundations (Week 1)

- [x] Plan v3 finalized (in conversation).
- [x] LICENSE in place (MIT, already committed).
- [x] TODOS.md committed.
- [x] README.md rewritten with positioning manifest, why, install, privacy, FAQ.
- [x] CHANGELOG.md entry: pivot to gh-pure MCP + Skill.
- [x] `.gitignore` reviewed (already covers `node_modules/`, `dist/`, `coverage/`).
- [ ] **Manual user action:** reserve npm scope (e.g. `@deckel`) on npmjs.com.
- [ ] `.npmignore` per publishable package — deferred to Phase 2/3 when `packages/core/` and `packages/mcp/` exist.

## Phase 2 — packages/core/ (Weeks 2–3)

- [x] Scaffold `packages/core/` workspace (TS, ESM, tsup build, vitest).
- [x] Octokit setup with `@octokit/plugin-throttling` + `@octokit/plugin-retry`.
- [x] Auth resolver: `GH_TOKEN` / `GITHUB_TOKEN` env var → `gh auth token` shell-out → `AuthError`.
- [x] Repo detection: `GH_REPO` env var → `gh repo view` → `git remote get-url origin` (SSH + HTTPS) → `RepoNotFoundError`.
- [x] Defensive body parser (sections + checkboxes + dependencies + warnings).
- [x] Body builder (round-trip safe with the parser).
- [x] Time-strip filter (`created_at`, `updated_at`, `closed_at`, `due_on`, `merged_at`, `submitted_at`, `started_at`, `completed_at`, `pushed_at`, `last_edited_at`).
- [x] Optimistic concurrency wrapper (`optimisticEdit`).
- [x] ETag cache primitive (`EtagCache`, 30s TTL default, prefix-based invalidation).
- [x] 8 test files, 57 tests, all green; typecheck + build clean.
- [ ] Conditional-request integration with Octokit (uses `EtagCache` + Octokit request hooks). Deferred to Phase 3 where the read-tools live.
- [ ] Coverage report tool (`@vitest/coverage-v8`) — added with CI in Phase 6.

## Phase 3 — packages/mcp/ (Weeks 4–5)

### 3A — Scaffold + foundations (DONE)

- [x] Operations layer in `@dckl/core/src/ops.ts`: `getCurrentUser`, `getIssue`, `getActiveIssue`, `listOpenMilestones`, `getStatusSummary`, `claimIssue` + 11 tests with fetch-mock helper.
- [x] `packages/mcp/` scaffold (TS, ESM, tsup, vitest, `bin: dckl-mcp`, shebang).
- [x] MCP SDK 1.29 + zod 3.23 wired up.
- [x] STDIO transport entry point (`src/index.ts`).
- [x] `Runtime` class (lazy auth + repo + user resolution, `EtagCache` instance).
- [x] Error envelope (`ok`, `fail`, `fromError`, `asMcpContent`) + 7 tests.
- [x] Resources: `dckl://active` (~50 tokens), `dckl://status` (~300 tokens).
- [x] Tools: `dckl_active_task`, `dckl_status`.
- [x] **Smoke test passed:** server answers `initialize`, `tools/list`, `resources/list` over STDIO with correct shapes.

### 3B — Remaining read tools (DONE)

- [x] `dckl_session_resume` — active issue + parsed body + open `[correction]` comments + unfinished checkboxes.
- [x] `dckl_task_export` — full issue body, comments, dependency refs.
- [x] `dckl_sprint_view` — milestone summary + issue list (no dates).
- [x] `dckl_search` — by status, priority, type, milestone, file in body, free text.
- [x] `dckl_next_up` — first todo without open `Depends on` references.

### 3C — Write tools (DONE)

- [x] `dckl_task_claim`, `dckl_task_release`, `dckl_task_close`.
- [x] `dckl_check_toggle` (read → modify → verify-read → write, throws `ConcurrentModificationError` on race).
- [x] `dckl_correction_add`, `dckl_correction_resolve` (issue comments with `[correction]` / `[resolved]` prefix).
- [x] `dckl_sprint_close` — refuses unless all `priority:must` issues are closed.

### 3D — PM tools (DONE)

- [x] `dckl_task_create` — builds schema-conforming body via `buildIssueBody`, sets `status:todo` + `priority:*` + `type:*` labels.
- [x] `dckl_sprint_create` — creates milestone without `due_on`.
- [x] `dckl_doctor` — 7 explicit checks (claim_no_assignee, assignee_no_status, no_milestone, body_schema_invalid, deps_clear_but_todo, milestone_has_date, non_dckl_label). Date-based "stale claim" check intentionally skipped — conflicts with the temporal-sterile design.

### 3E — Cross-cutting (DONE)

- [x] Rate-limit warning hook in `createClient` (logs to `octokit.log.warn` when `x-ratelimit-remaining < 100`).
- [x] `advanced_search: "true"` flag on `searchIssues` and `countByLabel` — Octokit still emits a deprecation warning at call time, but the call uses the new path.
- [x] Integration tests for new ops: 21 tests in `ops-extended.test.ts` covering search, session resume, task export, release, close, toggleCheck, corrections, createTask, createSprint, closeSprint.

### Phase 3 final tally

- **17 MCP tools** registered + **2 resources** (`dckl://active`, `dckl://status`).
- **96 tests passing** (89 in `@dckl/core`, 7 in `@dckl/mcp`).
- `@dckl/core` build: 29.78 KB ESM, 11.35 KB d.ts.
- `@dckl/mcp` build: 23.26 KB ESM (executable bin).
- Smoke test: STDIO server answers `initialize`, `tools/list` (17), `resources/list` (2) cleanly.

## Phase 4 — packages/cli/ shrink (DONE)

- [x] Stripped CLI from 3213 LOC to a minimal `init` / `status` / `doctor` wrapper.
- [x] Deleted obsolete commands (backlog, claude-integration, export, journey, pages, serve, sprint, stop, sync-commits, task, vision) plus `port-discovery.ts` and `starter-templates.ts`.
- [x] Removed legacy deps: `@dckl/server`, `@dckl/ui`, `gray-matter`, `js-yaml`, `proper-lockfile`, `valibot`, `hono`, `@hono/node-server`.
- [x] Centralised `Runtime` class in `@dckl/core` (lazy auth + repo + user). Both `@dckl/mcp` and `@dckl/cli` use it now.
- [x] `dckl init`:
  - Detects/merges `.mcp.json` entry (or prompts to create), with `--print-only` for non-interactive snippet output.
  - Copies bundled SKILL.md to `.claude/skills/dckl/SKILL.md`.
  - Copies `.github/ISSUE_TEMPLATE/dckl-*.yml` when bundled (Phase 5 fills these in).
  - Creates the 11 dckl labels (with colors + descriptions); idempotent — 422 = already exists.
  - Flags: `--yes` (non-interactive), `--print-only`, `--update-skill` (skill-only refresh).
- [x] `dckl status` — Markdown summary (or `--json`) of active sprint, claimed task, counts.
- [x] `dckl doctor` — grouped warnings (or `--json`); same checks as the MCP tool.
- [x] `scripts/copy-assets.mjs` bundles SKILL.md + issue templates into `dist/assets/` at build time.
- [x] CLI build: 10.38 KB ESM (executable bin), Node 20+.

## Phase 5 — Skill v2 + Templates (DONE)

- [x] Rewrote `.claude/skills/dckl/SKILL.md` for the gh-pure model:
  - All `.dckl/` paths and Bash CLI commands removed.
  - "No calendar" manifesto at the top, with the "user asks 'when?' → redirect" rule.
  - Tool inventory grouped by Resources / Read / Write / PM, with intent + return shape per tool.
  - DEV / PM / REVIEWER protocol structure preserved.
  - Body-schema sections (`Worum es geht` / `Warum jetzt` / `Woran man merkt` / `Context` / `Depends on` / `Out of scope`) treated as hard contract.
  - Anti-patterns table updated for the gh-pure world (no heartbeat, `release` ≠ `close`, stale-edit after MCP writes).
  - Edge cases include MCP / auth / repo / rate-limit / concurrent-modification handling and the "user asks when" redirect.
- [x] `.github/ISSUE_TEMPLATE/dckl-task.md` — Markdown template with the body schema, prefilled labels (`status:todo`), comment hints in each section.
- [ ] ~~`.github/ISSUE_TEMPLATE/dckl-correction.md`~~ — **skipped intentionally**. Corrections are MCP-tool-driven (issue comments via `dckl_correction_add`), not file-based templates. A separate template would only invite confusion.
- [x] `copy-assets.mjs` extended to bundle `.md` templates alongside `.yml` / `.yaml`.
- [x] `init.ts` updated to look for both `.md` and `.yml` template variants.
- [x] CLI rebuild verified: `dist/assets/skill.md` + `dist/assets/templates/dckl-task.md` both bundled.

## Phase 6 — Release Pipeline (Week 7)

- [ ] `.github/workflows/ci.yml` (lint, test, typecheck on PR).
- [ ] `.github/workflows/publish.yml` (npm publish on tag matching `v*`).
- [ ] Smoke-test repo: `@deckel/dckl-smoke-test` with seeded issues for end-to-end verification.
- [ ] **DESTRUCTIVE — confirm with user before executing:**
  - Delete `packages/server/`.
  - Delete `packages/ui/`.
  - Delete `.dckl/`.
- [ ] Update root `package.json` workspaces, scripts.

## Phase 7 — Beta + Release (Week 8)

- [ ] Tag `v0.1.0-beta.1`, npm publish.
- [ ] Self-dogfood for 7 days on a real gh repo.
- [ ] README revisions from dogfood findings.
- [ ] Tag `v0.1.0`, npm publish.
- [ ] Public-repo announcement (pinned issue or discussion).

---

## Definition of Done v0.1

- [ ] `npx -y @scope/dckl-mcp init` runs cleanly on fresh macOS + Linux.
- [ ] After init + Claude Code restart, `dckl_status` is available.
- [ ] User can claim, toggle check, add correction, close — all via Claude.
- [ ] gh body remains schema-conforming after all MCP operations.
- [ ] `dckl://active` and `dckl://status` auto-loaded as resources.
- [ ] `dckl_doctor` lists all 8 check types.
- [ ] README explains Why/Install/Privacy in <3 min reading time.
- [ ] CI green, npm publish pipeline tested.
- [ ] 1 week of self-dogfood without major bug.

---

## Out of scope for v0.1

- `dckl migrate` (importing existing local `.dckl/` data into gh issues).
- Online variants (hosted MCP, GitHub App, GitHub Action).
- Cursor / Cline / other AI-tool integrations.
- Vision-Editor / Journey-Editor.
- Burndown / velocity / story points (per definitionem nicht).
- Windows official support.
