import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const CLAUDE_MD_START = "<!-- deckel:start (auto-managed, do not edit between markers) -->";
const CLAUDE_MD_END = "<!-- deckel:end -->";

/**
 * Installs three integration touchpoints for Claude Code:
 *   1. CLAUDE.md managed block (short primer with working-commands table)
 *   2. .claude/skills/deckel/SKILL.md (state-driven, exec-ready protocols)
 *   3. .claude/settings.json PostToolUse hook (auto-heartbeat)
 *
 * Idempotent. Never touches user content outside the managed block.
 */
export function installClaudeIntegration(cwd: string): void {
  installClaudeMd(cwd);
  installSkill(cwd);
  installHook(cwd);
}

function installClaudeMd(cwd: string): void {
  const path = resolve(cwd, "CLAUDE.md");
  const block = renderClaudeMdBlock();
  const wrapped = `${CLAUDE_MD_START}\n${block}\n${CLAUDE_MD_END}`;

  if (!existsSync(path)) {
    writeFileSync(path, `# Project\n\n${wrapped}\n`, "utf8");
    return;
  }

  const current = readFileSync(path, "utf8");
  const startIdx = current.indexOf(CLAUDE_MD_START);
  const endIdx = current.indexOf(CLAUDE_MD_END);

  if (startIdx >= 0 && endIdx > startIdx) {
    const before = current.slice(0, startIdx);
    const after = current.slice(endIdx + CLAUDE_MD_END.length);
    writeFileSync(path, `${before}${wrapped}${after}`, "utf8");
  } else {
    const sep = current.endsWith("\n") ? "\n" : "\n\n";
    writeFileSync(path, `${current}${sep}${wrapped}\n`, "utf8");
  }
}

function installSkill(cwd: string): void {
  const path = resolve(cwd, ".claude", "skills", "deckel", "SKILL.md");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, renderSkill(), "utf8");
}

function installHook(cwd: string): void {
  const path = resolve(cwd, ".claude", "settings.json");
  mkdirSync(dirname(path), { recursive: true });

  type HookEntry = { type: string; command: string };
  type HookMatcher = { matcher?: string; hooks: HookEntry[] };
  type Settings = { hooks?: { PostToolUse?: HookMatcher[] }; [k: string]: unknown };

  let settings: Settings = {};
  if (existsSync(path)) {
    try {
      settings = JSON.parse(readFileSync(path, "utf8")) as Settings;
    } catch {
      console.warn(`[deckel init] ${path} is not valid JSON; skipping hook install`);
      return;
    }
  }

  const DECKEL_HOOK: HookEntry = {
    type: "command",
    command: "pnpm deckel heartbeat --silent",
  };
  const MATCHER = "Write|Edit|Bash|NotebookEdit";

  settings.hooks ??= {};
  settings.hooks.PostToolUse ??= [];

  const existing = settings.hooks.PostToolUse.find((m) => m.matcher === MATCHER);
  if (existing) {
    const already = existing.hooks.some((h) => h.command === DECKEL_HOOK.command);
    if (!already) existing.hooks.push(DECKEL_HOOK);
  } else {
    settings.hooks.PostToolUse.push({
      matcher: MATCHER,
      hooks: [DECKEL_HOOK],
    });
  }

  writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

function renderClaudeMdBlock(): string {
  return `## Deckel — Task Tracker (managed by \`deckel init\`)

Sprint, chunk, and project-vision state lives under \`.deckel/\`. Full
protocols, quality bars, commit standards, and anti-patterns live in
\`.claude/skills/deckel/SKILL.md\`. Read that skill before acting on any
Deckel-tracked work; it is authoritative when it disagrees with this block.

### Commands you invoke directly

| Situation | Command |
|---|---|
| Start working on a task | \`pnpm deckel task claim <ID>\` |
| Finish / pause / switch task | \`pnpm deckel task release <ID>\` |
| Toggle a reminder or test check | \`pnpm deckel check <ID> <check-id>\` |
| Log an issue found mid-work | \`pnpm deckel correction add <ID> "<text>"\` |
| Read the whole task context (pipe to Claude) | \`pnpm deckel export <ID>\` |
| Project-wide state (gaps, in-flight, recent) | \`pnpm deckel status\` |
| Start the UI server | \`pnpm deckel\` (default command is \`serve\`) |

\`pnpm deckel heartbeat\` exists but fires automatically via the
\`PostToolUse\` hook in \`.claude/settings.json\`. **Do not invoke it
manually.**

### Invariants

- Mark \`status: done\` only when the user explicitly approves.
- Before any Write/Edit on a file you don't recognize, check whether it
  belongs to a tracked task:
  \`grep -lF "<file>" .deckel/sprints/*/tasks/*.md\`.
- Do not modify \`.deckel/config.yaml\`, \`templates/\`, or \`VISION.md\`
  without asking.
- \`.deckel/.port\` and \`.deckel/.active-task\` are runtime artefacts,
  already gitignored — never commit them.`;
}

function renderSkill(): string {
  return `---
name: deckel
description: |
  Deckel tracks sprints and tasks ("chunks") locally under .deckel/.
  Activate this skill whenever the user:
    - names a task ID matching <UPPERCASE>-<DIGITS> (e.g. TSK-01, DCK-12),
    - says "continue the sprint", "next task", "keep working", "what should
      I do next",
    - asks to plan, structure, chunk, or scope new work,
    - asks to create a task, sprint, or vision entry,
    - asks about project status, progress, or what is blocked,
    - asks for a commit message, PR description, or changelog entry,
    - begins implementation on code that may belong to a Deckel-tracked task,
    - asks "what does this codebase do" or "where do I start".
  Also activate BEFORE any Write/Edit/Bash on a file in a repo that has a
  .deckel/ directory, to check whether that file is listed in any task's
  context_files.
---

# Deckel Skill

## Authority

If this skill disagrees with the CLAUDE.md managed block, this skill wins —
the block is a summary primer, this file is the full specification.

## Commands

All commands below are implemented. Each is safe to invoke directly.

\`\`\`bash
pnpm deckel                              # default = serve; starts UI on :4321
pnpm deckel status                       # project-wide report (vision, sprint, gaps)
pnpm deckel export <TASK-ID>             # structured prompt for this task
pnpm deckel task claim <TASK-ID>         # mark live-worked, starts amber pulse
pnpm deckel task release <TASK-ID>       # clear the claim
pnpm deckel check <TASK-ID> <check-id>   # toggle a reminder or test check
pnpm deckel correction add <TASK-ID> "<text>"   # log an issue discovered mid-work
\`\`\`

\`pnpm deckel heartbeat\` also exists but fires automatically from the
PostToolUse hook. Never invoke it yourself.

**Planned (not yet built):** journeys (\`.deckel/journeys/\`), a Stack /
Docs / Memory reader in the UI. If the user asks for those, tell them the
concept is reserved but the feature ships later; don't pretend commands
exist that don't.

---

## The three roles

| Ask looks like | Role | Writes code? |
|---|---|---|
| "work on TSK-01", "fix this", "continue", "add …" | **DEV** | yes |
| "plan", "chunk this up", "new sprint", "write a vision" | **PM** | no — only \`.deckel/\` edits |
| "what's the state", "status", "what am I missing" | **REVIEWER** | no — read-only unless asked |

Multi-role ask → execute REVIEWER → PM → DEV in that order. Never collapse
them; that produces shallow planning and rushed code.

---

## DEV protocol

### Step 0 — Read the four signals

Executable checks. Run exactly these before acting:

\`\`\`bash
# Signal 1: Is there an active-task pointer?
cat .deckel/.active-task 2>/dev/null || echo "(absent)"

# Signal 2: Is the deckel server running?
#   .port file exists AND PID alive
[ -f .deckel/.port ] \\
  && kill -0 "$(python3 -c 'import json,sys;print(json.load(open(".deckel/.port"))["pid"])')" 2>/dev/null \\
  && echo "server up" || echo "server down"

# Signal 3 & 4: Read target task frontmatter (status + claim)
#   Replace <SPRINT> and <TASK-ID>. Frontmatter is between the first two "---".
sed -n '/^---$/,/^---$/p' .deckel/sprints/<SPRINT>/tasks/<TASK-ID>.md
\`\`\`

If Signal 2 reports "server down", tell the user: **"Start \`pnpm deckel\`
in another terminal, then retry."** Do not proceed with writes — the
amber-pulse indicator will be stale and the claim won't stick.

### Step 1 — Decide what to work on

\`\`\`
Has the user named a task ID?
├─ YES → use it (jump to Step 2)
└─ NO  → find the active sprint:
          grep -l "^status: active$" .deckel/sprints/*/index.md
         read it, list its task_ids, SUGGEST the first in_progress or todo,
         then ASK the user to confirm. Do not auto-pick.
\`\`\`

**Task-ID padding:** if the user said \`TSK-1\` but files are \`TSK-01.md\`,
resolve with:
\`\`\`bash
find .deckel/sprints -type f -name "*<ID>*.md"
\`\`\`
Use the closest match; if ambiguous, list candidates and ask.

### Step 2 — Check ownership before claiming

\`\`\`
Read target task's claim field.
  ├─ claim absent                         → continue to Step 3
  ├─ claim present, heartbeat < 5 min old → STOP.
  │                                          Report: "TSK-NN is claimed by
  │                                          <by> (Xs ago). Wait, take
  │                                          over, or pick another task?"
  └─ claim present, heartbeat > 5 min old → safe to take over; continue

.active-task already points at a DIFFERENT task?
  ├─ YES → \`pnpm deckel task release <OLD-ID>\` first, then continue
  └─ NO  → continue
\`\`\`

### Step 3 — Claim

\`\`\`bash
pnpm deckel task claim <TASK-ID>
\`\`\`

- **Succeeds (exit 0):** proceed to Step 4.
- **Fails:** stop. Tell the user the exact error. Common cause: server
  down (Signal 2) — ask them to start \`pnpm deckel\`.

### Step 4 — Read task, set boundaries

Re-read the task frontmatter. Extract and treat as authoritative:

| Field | Behaviour |
|---|---|
| \`title\`, \`status\`, \`type\` | Orients your work |
| \`security_checks\` | Unchecked items = acceptance criteria |
| \`test_criteria\` | Unchecked items block "done" |
| \`corrections\` | Open items = known issues; resolved = history |
| \`context_files\` | **Hard boundary when present and non-empty** |
| \`depends_on\` | Task IDs that must be done before this one |
| \`pre_flight\` | Steps to perform before writing code |
| \`related_docs\` | Read these if they exist |

**\`context_files\` rule:** when present and non-empty, edits outside that
list require either (a) asking the user first, or (b) logging a
correction first:

\`\`\`bash
pnpm deckel correction add <TASK-ID> "had to edit <path> because <reason>"
\`\`\`

When \`context_files\` is absent or empty, scope from the title + body;
when in doubt, ask.

### Step 5 — Implement

- When you satisfy an acceptance criterion, **flip its check**:
  \`pnpm deckel check <TASK-ID> <check-id>\`. The check ID matches an
  entry in \`security_checks\` or \`test_criteria\`.
- When you discover a new issue mid-work, log it:
  \`pnpm deckel correction add <TASK-ID> "<one-line description>"\`.
- **Never set \`status: done\` yourself.** That is a user-only decision,
  made via the UI's status-icon cycle.

### Step 6 — Release

\`\`\`bash
pnpm deckel task release <TASK-ID>
\`\`\`

If release **fails** (e.g. server crashed mid-session), tell the user
explicitly: _"Claim could not be released — when the server is back,
run \`pnpm deckel task release <TASK-ID>\` manually, otherwise the
amber-pulse will stay on."_

Then summarise in chat:

- Files touched, tests added
- Acceptance criteria addressed (and checked)
- What remains open
- Whether you recommend \`done\`, \`review\`, or keeping \`in_progress\`
- Corrections you added (by ID)

---

## The most common failure mode

User writes code without naming a task. Default starting state in most
sessions. **Before any Write/Edit on a file you don't recognise:**

\`\`\`bash
grep -lF "<relative-path-of-file>" .deckel/sprints/*/tasks/*.md
\`\`\`

If the file appears in any task's \`context_files\` or body, surface it:
"This file is referenced by TSK-NN. Should we claim it before editing?"

If no match, proceed as untracked — but say so once, so the user can
create a task if the work is non-trivial.

---

## PM protocol

No code writes. Only \`.deckel/\` edits (or suggested edits for user to
apply).

### Creating a chunk (task)

A chunk = one focused session of work. Fits inside one human workday.
Larger = split before writing the file.

#### Frontmatter template

\`\`\`yaml
schema: 1
id: <PREFIX>-<NN>             # zero-padded to 2 digits, auto-extends at 100
sprint_id: <sprint-nn-slug>
title: <imperative, < 60 chars>
type: feature | bug | chore | refactor
status: todo                  # never start as in_progress
context_files:
  - path/to/file.ts           # explicit, minimal, complete
depends_on: []                # only real blockers
pre_flight:                   # optional pre-work steps
  - "Read ADR-003 on auth-token storage"
security_checks:              # id references templates/security-checks.yaml
  - { id: rate-limiting, checked: false }
test_criteria:                # inline label, task-specific
  - { id: unit-happy, label: "Unit: happy path", checked: false }
  - { id: manual-edge, label: "Manual: Firefox with hardware key", checked: false }
corrections: []
\`\`\`

Note: \`security_checks\` entries reference labels from
\`.deckel/templates/security-checks.yaml\`; only the \`id\` lives on the
task. \`test_criteria\` entries carry an inline \`label\` because tests are
task-specific.

#### Body template

\`\`\`markdown
## <Title — do NOT repeat the task ID>

One paragraph: WHAT this implements, as if explaining to a teammate
joining today.

### Why
One paragraph: motivation. Link to a business constraint or vision
anchor. Without this, future-you makes reasonable-looking but wrong
decisions.

### Out of scope          # required when scope is non-obvious; omit otherwise
- bullets of things a reader might assume are part of this but aren't
\`\`\`

Do not repeat the task ID or title as an H2 — already in the frontmatter.
Duplication guarantees drift.

#### Anti-patterns — recognise and refuse

- Vague titles ("Fix auth", "Improve performance")
- Empty \`context_files\` when files will be touched (= yolo-refactor invite)
- Copy-pasted \`security_checks\` template (all 6 entries = zero curation)
- \`depends_on\` as wishlist ("nice-if" not a dependency)
- Oversized: body lists > 5 sub-tasks → split into multiple chunks

#### Quality gate

- [ ] Title imperative, < 60 chars, would fit in a commit summary
- [ ] \`context_files\` lists every file that will be touched, no more
- [ ] \`security_checks\` contains only real criteria for this chunk
- [ ] \`test_criteria\` covers happy path + one failure
- [ ] Body answers "why", not just "what"
- [ ] "Out of scope" present if scope is non-obvious
- [ ] Implementable in one focused session

### Creating a sprint

- 5–15 tasks. Fewer = wasted structure. More = roadmap, not sprint.
- One-sentence \`goal\`. Two sentences = two sprints.
- All tasks coherent to the theme. Off-theme → tell the user to hold
  them for a later sprint.
- Status transitions: \`planning → active → review → done\`. No skipping.

**Good goals:** "Login with passkey and 2FA fallback for all users" ·
"All write endpoints return 429 under sustained load".

**Bad goals:** "Improve auth" (how?) · "Q2 work" (calendar, not theme).

### Writing / updating the vision

\`.deckel/VISION.md\` is optional but high-leverage. Shape:

\`\`\`yaml
---
schema: 1
north_star: "One sentence — the eventual state of the product"
audience: "Who this is for, specifically"
non_goals:
  - "Things we deliberately don't do"
current_phase: "slug-for-the-focus-right-now"
updated: YYYY-MM-DD
---

## Full Vision

Longer prose body (optional).
\`\`\`

Flag to the user if \`updated\` is > 60 days old — stale visions mislead.

### Journeys (planned)

A journey will be an ordered list of routes users traverse. Schema lands
later. If the user asks about journeys, describe the planned shape and
suggest tracking the same info inside task bodies under "Out of scope"
or a \`docs/\` note for now. Do not write to \`.deckel/journeys/\` — no
reader exists yet.

---

## REVIEWER protocol

Prefer \`deckel status\` — it already aggregates everything:

\`\`\`bash
pnpm deckel status             # Markdown
pnpm deckel status --json      # machine-readable
\`\`\`

Output includes: vision + staleness, active sprint, in-flight tasks
(with live/idle claim state), totals (unchecked reminders + tests +
open corrections), recent commits, orphan TODOs.

Report to the user, structured. Suggest changes; don't make them without
user confirmation.

---

## Commit standards

Claude Code's defaults already cover: imperative, lowercase after the
type prefix, no AI signatures, ≤ 72-char summary. The project adds:

- **Reference tasks in the body**, not the summary:
  \`Refs TSK-14\` or \`Closes TSK-14\`. Never \`TSK-14:\` as a prefix.
- **One task per commit** unless changes are truly inseparable.
- Types to prefer: \`feat\`, \`fix\`, \`refactor\`, \`chore\`, \`docs\`, \`test\`,
  \`perf\`. Scope optional: \`feat(auth): …\`.

Example (good):

\`\`\`
feat(auth): add passkey registration endpoint

Users register a WebAuthn credential at signup. TOTP fallback when no
authenticator is available.

Refs TSK-14
\`\`\`

Avoid: \`Update auth.ts\` (vague), \`WIP passkeys\` (don't commit WIP),
\`TSK-14: Add passkey\` (task ID doesn't belong in the summary).

---

## Edge cases

| Situation | Response |
|---|---|
| Server down | \`claim\`/\`release\`/\`heartbeat\`/\`check\` fail. Tell user: "start \`pnpm deckel\` in another terminal, then retry". Don't write code without a successful claim. |
| Task-ID padding mismatch | \`find .deckel/sprints -type f -name "*<ID>*.md"\`. If ambiguous, list candidates. |
| Multi-session claim race | Two sessions claiming the SAME task = last write wins on \`by\`. If you see a fresh claim by another agent: release yours, ask user to coordinate. |
| \`context_files\` looks incomplete | Ask first. If you must expand, add a correction explaining the reason BEFORE editing. |
| Body contradicts frontmatter | Trust frontmatter for structured state. Trust body for rationale. Semantic conflict → stop and ask. |
| No \`.deckel/\` in the repo | Offer \`pnpm deckel init\`. If declined, proceed untracked but warn once. |
| User marks \`done\` with open criteria | Say so: "N reminders and M tests are still open. Still mark done?" Then respect the call. |
| Release fails | Tell the user explicitly and give them the exact retry command. Don't silently move on. |
| Grep patterns with regex metachars | Use \`grep -F\` for literal file-path matches. |

---

## The one thing to remember

Every Write/Edit you do is either:
1. **Inside a claimed task** → the user sees amber-pulse, the heartbeat
   hook keeps it alive, \`release\` summarises.
2. **Outside any task** → you must say so, once, and let the user decide
   whether to create a task or proceed untracked.

If you can't tell which, run the grep in "The most common failure mode"
and then decide.
`;
}
