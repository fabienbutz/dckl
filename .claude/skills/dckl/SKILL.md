---
name: dckl
description: |
  dckl is a discipline layer over GitHub Issues for solo devs working
  with AI agents. No calendar, no sidecar — issues are the source of
  truth. Activate this skill whenever the user:
    - names a GitHub issue number (#42, #DCK-12, "issue 5"),
    - says "continue", "next task", "what's next", "session resume",
    - asks to plan, structure, chunk, or scope new work,
    - asks to create a task, sprint, or vision entry,
    - asks about project status, progress, or what is blocked,
    - asks for a commit message, PR description, or changelog entry,
    - begins implementation on code that may belong to a tracked task.
  Also activate BEFORE any Write/Edit/Bash on a file in a repo with the
  dckl MCP installed, to check whether that file is listed under
  "## Context" of an open issue.
---

# dckl Skill

## Authority

If this skill disagrees with anything in `CLAUDE.md`, this skill wins.
The CLAUDE.md primer is a summary; this file is the full specification.

## The "no calendar" manifesto

dckl agents never see dates. The `dckl_*` tool surface strips
`created_at`, `updated_at`, `closed_at`, `due_on`, and similar fields
from every response. That's intentional — AI velocity is too variable
for time-based planning to be useful.

When the user asks **"when is X due?"**, redirect:
*"dckl is calendar-free. What's blocking X, and what's the priority?"*
If they need a date for a stakeholder commitment, that lives in the
GitHub milestone's `due_on` (set externally) or a contract — never read
by dckl tools.

## What dckl owns

| Concept | GitHub-native representation |
|---|---|
| Task | Issue |
| Status | Label: `status:todo` / `:in-progress` / `:review` / `:done` |
| Priority | Label: `priority:must` / `:should` / `:could` |
| Type | Label: `type:feat` / `:bug` / `:chore` / `:refactor` |
| Sprint | Milestone (no `due_on`) |
| Active claim | Label `status:in-progress` + assignee = current user |
| Correction | Issue comment prefixed with `[correction]` |
| Resolved correction | Same comment edited to start with `[resolved]` |
| Vision | `CLAUDE.md` under `## Vision`, or pinned issue with `vision` label |

There is no `.dckl/` folder. There is no local state. Everything lives
in GitHub.

---

## Tools you have

### Resources (auto-loaded into your context)

| URI | Content | Size |
|---|---|---|
| `dckl://active` | Current claim — issue number, title, milestone summary, or null | ~50 tokens |
| `dckl://status` | Active milestone + counts (todo / in-progress / review) | ~300 tokens |

Read these first to orient yourself before any tool call.

### Read tools

| Tool | Use when |
|---|---|
| `dckl_session_resume` | Session start: full restore in one call (active issue + body + open corrections + unfinished checks) |
| `dckl_status` | Wider state — active milestone + all counts |
| `dckl_active_task` | Just the active issue with body |
| `dckl_task_export <issue_number>` | Full single-task view: body + comments + dependency titles |
| `dckl_sprint_view <milestone_number>` | Milestone + issue list (no bodies) |
| `dckl_search` | Filter by status, priority, type, milestone, file in body, free text |
| `dckl_next_up` | First unblocked todo in the active milestone |

### Write tools

| Tool | Effect |
|---|---|
| `dckl_task_claim <issue_number>` | Atomic: adds `status:in-progress` + assignee, removes `status:todo` |
| `dckl_task_release <issue_number>` | Clears claim; issue stays open |
| `dckl_task_close <issue_number>` | Closes issue (+ optional summary comment) |
| `dckl_check_toggle <issue_number> <pattern>` | Toggle the first acceptance-criteria checkbox matching `pattern` |
| `dckl_correction_add <issue_number> <text>` | Comment with `[correction]` prefix |
| `dckl_correction_resolve <comment_id>` | Edit comment to start with `[resolved]` |
| `dckl_sprint_close <milestone_number>` | Close milestone — refuses if any `priority:must` issue is still open |

### PM tools

| Tool | Effect |
|---|---|
| `dckl_task_create` | Create issue with schema-conforming body + dckl labels |
| `dckl_sprint_create` | Create milestone (no `due_on`) |
| `dckl_doctor` | Read-only audit (7 checks listed below) |

---

## The three roles

| Ask looks like | Role | Writes code? |
|---|---|---|
| "work on #42", "fix this", "continue" | **DEV** | yes |
| "plan", "new sprint", "chunk this up", "scope this" | **PM** | no — only issues / milestones / labels |
| "what's the state", "status", "what's blocked" | **REVIEWER** | no — read-only unless asked |

Multi-role ask → execute REVIEWER → PM → DEV in that order. Never
collapse them; that produces shallow planning and rushed code.

---

## DEV protocol

### Step 0 — Read auto-loaded context

`dckl://active` and `dckl://status` are already in your context window
(MCP resources). Glance at them:

- `dckl://active` shows an issue → that's what's claimed right now.
- `dckl://active` is `null` → user hasn't claimed anything.

Tool calls follow only when you need more than these resources can
tell you.

### Step 1 — Decide what to work on

```
User named an issue number?
├─ YES → use it; jump to Step 2.
└─ NO  → call `dckl_next_up`. Surface the suggestion.
         ASK the user to confirm. Do not auto-pick.
```

If the user said "continue" or "session resume" without a number, call
`dckl_session_resume` first — it returns the active issue + body +
unfinished checks in a single roundtrip.

### Step 2 — Claim and check ownership

`dckl_task_claim <#>` returns one of:

| `reason` | What it means | What to do |
|---|---|---|
| `claimed` | Fresh claim; you own it. | Proceed to Step 3. |
| `already-mine` | Already yours. | No-op; proceed. |
| `blocked` | Someone else (named in `by`) holds it. | STOP. Ask the user: wait, take over (release theirs first), or pick another issue? |
| `not-found` | Issue doesn't exist. | Verify the number; ask the user. |

### Step 3 — Read body, set boundaries

Call `dckl_task_export <#>` to get the parsed body.
Treat the parsed sections as authoritative:

| Section | Behaviour |
|---|---|
| `Worum es geht` | Briefing for the task |
| `Warum jetzt` | The why — preserve it across all decisions |
| `Woran man merkt, dass es fertig ist` | Acceptance criteria (checkboxes); each one is a `dckl_check_toggle` candidate when satisfied |
| `Context` | **Hard boundary** when present and non-empty |
| `Depends on` | Issues that must close before this can ship |
| `Out of scope` | Don't touch even if tempting |

**`Context` rule.** When present and non-empty, edits outside that list
require either:
- (a) asking the user first, or
- (b) logging a correction first via
  `dckl_correction_add <#> "had to edit X because Y"`.

When `Context` is absent or empty, scope from the title + `Worum es
geht`. When in doubt, ask.

### Step 4 — Implement

- When you satisfy an acceptance criterion, flip its checkbox:
  `dckl_check_toggle <#> "<text matching the criterion>"`. The pattern
  is a case-insensitive substring of the criterion text.
- **When you discover a finding mid-work, classify it first:**
  - **In-scope** (touches files in `## Context` of the active task,
    or affects an existing acceptance criterion) → log a correction:
    `dckl_correction_add <#> "<one-line description>"`. The active
    issue stays the carrier.
  - **Out-of-scope** (different feature, files outside `## Context`,
    new acceptance criteria) → surface a proposal to the user:
    title + suggested `type` + `priority` + `milestone: null`
    (= backlog). **Do NOT call `dckl_task_create` yourself.** Wait
    for the user's confirmation. If they decline, fall back to
    logging it as a correction on the active issue so the finding
    isn't lost.
- **When the user redirects scope mid-work** (style tweaks, new
  dimensions, added sub-features, "out of scope" that suddenly is in),
  log a correction **before** executing the change — not after, not at
  release. Shape: `correction_add <#> "<what changed> — <why>"`. The
  *why* is the whole point: the git diff shows *what*, the correction
  preserves *why*. This is the single most common drift point — a
  chain of unrecorded "etwas heller / noch heller / anderes padding"
  tweaks silently reshapes the task. Discipline: write-then-code, not
  code-then-forget.
- **Never call `dckl_task_close` yourself.** That's a user-only
  decision. Surface a recommendation; let them call it (or do it via
  the GitHub UI).
- **Same for `dckl_task_create`.** Issue creation is a PM action.
  When you spot something worth tracking mid-work, propose it (title,
  defaults, milestone) and wait for user approval — don't auto-file.

### Step 5 — Release or close

```
dckl_task_release <#>           # status returns to neutral, claim cleared
dckl_task_close   <#>           # status:done + closes issue (only on user approval)
dckl_task_close   <#> --summary "<final summary>"   # adds a closing comment first
```

**`release` ≠ `close`.** Release pauses; close finalises. If the user
hasn't authorised "done", use release.

If a tool call **fails** (e.g. rate limit, network), tell the user
explicitly: *"Claim could not be released — when GitHub is back, run
`dckl_task_release <#>` manually."*

Then summarise in chat:

- Files touched, tests added.
- Acceptance criteria addressed (and which checkboxes you toggled).
- What remains open.
- Whether you recommend `done`, `review`, or keeping `in-progress`.
- Corrections you added (by comment id) and any you resolved.

After release/close, `/clear` is cheap if there's no open thread —
dckl re-orients on restart via the `dckl://active` and `dckl://status`
resources. See the global session-hygiene rules in `~/.claude/CLAUDE.md`
for when to flag a "good `/clear` moment" to the user.

---

## Learned anti-patterns

Concrete mistakes worth absorbing:

- **Heartbeat is gone.** No PostToolUse hook is needed. The old dckl
  required one; the gh-pure version doesn't. If you find yourself
  reaching for it, you're using the old skill.
- **`release` ≠ `close`.** Releasing leaves the issue open without a
  status:* label. Closing finalises. Mixing them up creates "zombie"
  issues — open, no claim, no clear state.
- **Corrections die only when resolved.** Adding a correction comment
  and moving on leaves it visibly open in `dckl_session_resume`. Use
  `dckl_correction_resolve <comment_id>` when the issue is actually
  resolved.
- **Stale-Edit after MCP writes.** A tool write (claim, check-toggle,
  correction-add) mutates the issue body or labels. If you cached the
  body locally and try to edit it again, your view is stale. Re-fetch
  via `dckl_task_export` after MCP write activity on the same issue.

---

## The most common failure mode

User writes code without naming an issue. Default starting state in
most sessions.

**Before any Write/Edit on a file you don't recognise:**

```
dckl_search { file: "<relative-path-of-file>" }
```

If the file appears under `## Context` of any open issue, surface it:
*"This file is referenced by issue #N. Should we claim it before
editing?"*

If no match, proceed as untracked — but say so once, so the user can
create a task with `dckl_task_create` if the work is non-trivial.

---

## PM protocol

No code writes. Only issue / milestone / label changes (or suggested
changes for the user to apply).

### Creating a task

Use `dckl_task_create` with this argument shape:

```
title:               imperative, ≤ 60 chars (≤ 80 hard limit)
type:                feat | bug | chore | refactor
priority:            must | should | could
milestone:           (optional) milestone number to attach to
worum_es_geht:       2–4 sentences, briefing for a cross-functional teammate
warum_jetzt:         2–3 sentences, vision anchor
acceptance_criteria: array of strings, each becomes a checkbox
context_files:       array of paths (the hard boundary)
depends_on:          array of issue numbers
out_of_scope:        (optional) string
```

The tool generates a schema-conforming body and sets `status:todo` +
`priority:<priority>` + `type:<type>` labels.

#### Quality gate (refuse to create until)

- [ ] Title imperative, ≤ 60 chars, would fit in a commit summary.
- [ ] `context_files` lists every file that will be touched, no more.
- [ ] At least one `acceptance_criteria` entry is testable (not "Done")
- [ ] `worum_es_geht` answers what; `warum_jetzt` answers why.
- [ ] `out_of_scope` present if scope is non-obvious.
- [ ] Sprint-task: implementable in one focused session.
      Backlog feature-issue: see "Backlog vs sprint-task granularity"
      below — multi-PR is allowed, but the issue still captures one
      user-facing outcome.

#### Anti-patterns — recognise and refuse

- Vague titles ("Fix auth", "Improve performance").
- Empty `context_files` when files will be touched (= yolo-refactor invite).
- `depends_on` as wishlist ("nice-if" is not a dependency).
- More than ~5 acceptance criteria on a sprint task → split into
  multiple tasks. (Backlog feature-issues may carry slightly more
  outcome-shaped criteria — see granularity section.)
- Body longer than this skill section on a sprint task → split. (Same
  carve-out as above for backlog feature-issues.)
- Pre-splitting a feature into 3-4 stub backlog issues when one
  feature-level issue would capture the same intent better — split at
  sprint-pull, not at filing.

### Backlog vs sprint-task granularity

dckl issues come in two flavours. They follow different rules.

| | Backlog feature-issue | Sprint task |
|---|---|---|
| Where | `milestone: null` | inside a milestone |
| Captures | one user-facing outcome | one focused session of work |
| Size | may span multiple PRs | ≤ 1 PR, ≤ 400 LOC |
| Acceptance criteria | outcome-shaped, ≤ 7 | implementation-shaped, ≤ 5 |
| Body length | may exceed this skill section | bounded |
| Lifecycle | gets split into sprint tasks at sprint-pull | claim → ship → close |

**Default is sprint-task.** When unsure, file as a sprint task —
session-sized issues are easier to claim, prioritise, and ship. Promote
to a feature-issue only when the outcome genuinely needs multiple PRs
and split-at-pull is more useful than split-at-filing (typical signals:
schema change + UI + migration + storefront ripple effects).

**One outcome rule.** A backlog feature-issue still captures *one*
user-facing outcome. "Recurring events with multi-date and rule-based
schedules" is one outcome. "Recurring events + per-occurrence pricing +
ICS import + cohort migration" is four outcomes — file four issues.

**Outcome-shaped acceptance criteria.** Backlog ACs describe the
*outcome*, not the implementation:
- ✅ "Event can have multiple scheduled occurrences; registrations link
  to a specific occurrence."
- ❌ "New `event_occurrences` table; uses RFC 5545 RRULE library;
  `event_registrations.eventId` becomes nullable."

The implementation may shift over time before pickup. Outcome-shaped
ACs survive that shift; implementation-shaped ACs become wrong.

**At sprint-pull**, the feature-issue is split into ≤ 1-PR sprint
tasks. Two link patterns are fine:
- `depends_on` chain — sprint tasks reference the parent feature-issue;
  parent stays open until all dependants close.
- Checklist in parent body — sprint tasks listed as `- [ ] #N` checkboxes
  in the parent's `## Woran man merkt, dass es fertig ist` section.

Either way, the parent feature-issue is the canonical "why" record;
sprint tasks are the canonical "what shipped" records.

### Creating a sprint

Use `dckl_sprint_create`:

```
name:        ≤ 30 chars, headline-style
description: one sentence — the goal
```

Hard rules:
- `due_on` is **never** set. The tool refuses to accept it.
- Sprint = thematic clamp, not a time box. 5–15 tasks.
- Off-theme tasks → put in the next sprint or the backlog (no milestone).

**Good descriptions:** "Login with passkey and 2FA fallback for all
users." · "All write endpoints return 429 under sustained load."

**Bad descriptions:** "Improve auth" (how?) · "Q2 work" (calendar, not
theme).

### Planning a sprint from the backlog

When pulling existing tasks (no milestone) into a new or existing
sprint:

1. List backlog candidates: `dckl_search { milestone: null, status: "todo" }`.
2. Filter by theme. Surface matching tasks to the user with title +
   `type` + `priority` + a one-line "why this fits the theme".
3. **Wait for per-task confirmation.** Don't bulk-move.
4. The move itself: until `dckl_task_assign` ships, ask the user to run
   `gh issue edit <#> --milestone "<sprint name>"` or use the GitHub
   UI. Once `dckl_task_assign` exists, call it directly.

Reverse direction (descope from sprint back to backlog): same
workflow, target `milestone: null`.

### Updating the vision

The vision lives in `CLAUDE.md` under a `## Vision` heading, or as a
pinned issue with the `vision` label. Either is fine; there is no
opinionated tool for it.

Shape (in CLAUDE.md):

```markdown
## Vision

**North star.** One sentence — the eventual state of the product.

**Audience.** Who this is for, specifically.

**Non-goals.** Things we deliberately don't do.

**Current phase.** Slug for the focus right now.
```

If the vision hasn't been touched in a long time and seems stale, flag
it to the user. (You can't see how long; users tell you.)

---

## REVIEWER protocol

Default to `dckl_session_resume` for orientation, then `dckl_status`
for the wider picture, then `dckl_doctor` if anything looks off.

`dckl_doctor` runs seven checks:

| Code | Catches |
|---|---|
| `claim_no_assignee` | `status:in-progress` label without an assignee |
| `assignee_no_status` | Assigned issue with no `status:*` label |
| `no_milestone` | Open issue not in any milestone (= backlog) |
| `body_schema_invalid` | Issue body missing required `## …` sections |
| `deps_clear_but_todo` | All `Depends on` issues are closed but this is still `status:todo` |
| `milestone_has_date` | Milestone with `due_on` set (dckl ignores it; consider clearing) |
| `non_dckl_label` | Label that looks like `status:*` / `priority:*` / `type:*` but isn't in the dckl convention |

Report findings as a structured summary. Suggest changes; don't make
them without user confirmation.

---

## Commit standards

Project conventions plus Claude Code defaults:

- Imperative, lowercase after the type prefix, no AI signatures, ≤ 72-char summary.
- Reference issues in the body, not the summary: `Refs #42` or `Closes #42`. Never `#42:` as a prefix.
- One issue per commit unless changes are truly inseparable.
- Types to prefer: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`. Scope optional: `feat(auth): …`.

Example (good):

```
feat(auth): add passkey registration endpoint

Users register a WebAuthn credential at signup. TOTP fallback when no
authenticator is available.

Refs #14
```

Avoid: `Update auth.ts` (vague), `WIP passkeys` (don't commit WIP),
`#14: Add passkey` (issue ref doesn't belong in the summary).

---

## Edge cases

| Situation | Response |
|---|---|
| MCP server not responding | Tool calls return `UNEXPECTED` envelopes. Suggest restarting Claude Code; verify `.mcp.json` has the dckl entry. |
| Auth fails (`AUTH_FAILED`) | "Set `GH_TOKEN`, or run `gh auth login`, then retry." |
| Repo not detected (`REPO_NOT_FOUND`) | "Run `dckl init` from inside the repo, or set `GH_REPO=owner/name`." |
| Rate limit hit | Octokit retries automatically once. On persistent failure, wait — or ask the user to use a different token. |
| Concurrent claim race | `claim` returns `blocked`. Don't override; tell the user who holds it. |
| `dckl_check_toggle` returns `CONCURRENT_MODIFICATION` | Body changed externally between read and write. Re-call the tool — it re-reads. |
| Body schema invalid | Run `dckl_doctor`; offer to refile via `dckl_task_create`. |
| User asks "when?" | "dckl is calendar-free. What's blocking, and what's the priority?" |
| User redirects scope mid-work (style, size, sub-feature) | Log a correction **first**, then execute. Why-line is mandatory; the git diff alone won't rescue you. |
| User marks done with open criteria | Surface: "N criteria still unchecked. Still close?" Then respect the call. |

---

## The one thing to remember

Every Write/Edit you do is either:

1. **Inside a claimed issue** (label `status:in-progress`, assignee = you)
   with the touched file under `## Context` — or with a logged
   correction explaining why outside scope.
2. **Outside any task** — you must say so once, and let the user decide
   whether to create a task or proceed untracked.

If you can't tell which, run `dckl_search { file: "<path>" }` and decide.
