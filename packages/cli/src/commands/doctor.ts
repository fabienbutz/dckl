import { existsSync, readFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { Store, isClaimFresh } from "@dckl/server";
import { findDcklRoot } from "@dckl/server/storage";

type Severity = "ok" | "warn" | "error";

type Finding = {
  severity: Severity;
  code: string;
  message: string;
};

export type DoctorOptions = {
  json?: boolean;
  cwd?: string;
  /** If true, the caller handles exiting; runDoctor only returns the code. */
  silent?: boolean;
  /** Clear safely-fixable issues (today: orphan/malformed `.active-task`). */
  fix?: boolean;
};

const STALE_CLAIM_MS = 24 * 60 * 60 * 1000;

/**
 * Runs the doctor checks and returns an exit code:
 *   0 = clean, 1 = warnings only, 2 = any errors.
 * Emits a Markdown or JSON report unless `silent: true`.
 */
export async function runDoctor(opts: DoctorOptions = {}): Promise<{
  code: 0 | 1 | 2;
  findings: Finding[];
}> {
  const findings: Finding[] = [];
  const cwd = opts.cwd ?? process.cwd();

  const dcklRoot = findDcklRoot(cwd);
  if (!dcklRoot) {
    findings.push({
      severity: "error",
      code: "missing-dckl",
      message: "No .dckl/ directory found in this tree. Run `pnpm dckl init` first.",
    });
    if (!opts.silent) emit(findings, opts);
    return { code: 2, findings };
  }

  findings.push({
    severity: "ok",
    code: "dckl-root",
    message: `.dckl/ found at ${dcklRoot}`,
  });

  const store = new Store(dcklRoot);

  await checkConfig(store, findings);
  await checkVision(store, findings);
  await checkSprintsAndTasks(dcklRoot, store, findings);
  checkActiveTaskPointer(dcklRoot, findings, { fix: opts.fix ?? false });
  checkClaudeIntegration(dcklRoot, findings);

  if (!opts.silent) emit(findings, opts);

  const hasError = findings.some((f) => f.severity === "error");
  const hasWarn = findings.some((f) => f.severity === "warn");
  return { code: hasError ? 2 : hasWarn ? 1 : 0, findings };
}

async function checkConfig(store: Store, findings: Finding[]): Promise<void> {
  try {
    const { config } = await store.getConfig();
    findings.push({
      severity: "ok",
      code: "config",
      message: `config.yaml valid — project: "${config.project.name}", prefix: ${config.task_id_prefix}`,
    });
  } catch (err) {
    findings.push({
      severity: "error",
      code: "config-invalid",
      message: `config.yaml missing or unparseable: ${(err as Error).message}`,
    });
  }
}

async function checkVision(store: Store, findings: Finding[]): Promise<void> {
  try {
    const vision = await store.getVision();
    if (!vision) {
      // Optional file — not having one is fine. We mention it so the user
      // is aware the feature exists, but it doesn't bump the exit code.
      findings.push({
        severity: "ok",
        code: "no-vision",
        message:
          "No VISION.md (optional) — create one via `pnpm dckl vision init` to anchor sprints.",
      });
      return;
    }
    findings.push({
      severity: "ok",
      code: "vision",
      message: `VISION.md valid — north star: "${vision.meta.north_star.slice(0, 80)}…"`,
    });
    if (!vision.meta.updated) {
      findings.push({
        severity: "warn",
        code: "vision-updated-missing",
        message:
          "VISION.md has no `updated:` field in its frontmatter — the staleness heuristic silently fails without it. Add `updated: YYYY-MM-DD`.",
      });
    } else {
      const age = Date.now() - Date.parse(vision.meta.updated);
      const ageDays = Math.floor(age / (1000 * 60 * 60 * 24));
      if (ageDays > 90) {
        findings.push({
          severity: "warn",
          code: "vision-stale",
          message: `VISION.md is ${ageDays} days old — consider a review.`,
        });
      }
    }
  } catch (err) {
    findings.push({
      severity: "error",
      code: "vision-invalid",
      message: `VISION.md present but unparseable: ${(err as Error).message}`,
    });
  }
}

async function checkSprintsAndTasks(
  dcklRoot: string,
  store: Store,
  findings: Finding[],
): Promise<void> {
  const sprintsDir = join(dcklRoot, "sprints");
  if (!existsSync(sprintsDir)) {
    findings.push({
      severity: "error",
      code: "no-sprints-dir",
      message: "`.dckl/sprints/` directory missing.",
    });
    return;
  }

  let metas: Awaited<ReturnType<Store["listSprints"]>>;
  try {
    metas = await store.listSprints();
  } catch (err) {
    findings.push({
      severity: "error",
      code: "sprints-listing-failed",
      message: `Could not list sprints: ${(err as Error).message}`,
    });
    return;
  }

  if (metas.length === 0) {
    findings.push({
      severity: "warn",
      code: "no-sprints",
      message: "No sprints found. Create one under `.dckl/sprints/<slug>/index.md`.",
    });
  } else {
    findings.push({
      severity: "ok",
      code: "sprints",
      message: `${metas.length} sprint${metas.length === 1 ? "" : "s"} indexed.`,
    });
  }

  // Cross-check: task files referenced by sprints must exist, and task files
  // on disk must be referenced by exactly one sprint.
  const referencedTasks = new Set<string>();
  for (const sprint of metas) {
    for (const taskId of sprint.task_ids) {
      const tf = join(sprintsDir, sprint.id, "tasks", `${taskId}.md`);
      referencedTasks.add(`${sprint.id}/${taskId}`);
      if (!existsSync(tf)) {
        findings.push({
          severity: "error",
          code: "missing-task-file",
          message: `Sprint \`${sprint.id}\` references \`${taskId}\` but ${tf} does not exist.`,
        });
        continue;
      }
      try {
        await store.getTask(sprint.id, taskId);
      } catch (err) {
        findings.push({
          severity: "error",
          code: "task-invalid",
          message: `Task \`${taskId}\` in \`${sprint.id}\` has invalid frontmatter: ${(err as Error).message}`,
        });
      }
    }
  }

  // Orphan detection: walk every tasks/ dir under sprints/ and flag files
  // that are NOT referenced by their sprint's task_ids.
  for (const sprintEntry of readdirSync(sprintsDir)) {
    if (sprintEntry.startsWith(".")) continue;
    const tasksDir = join(sprintsDir, sprintEntry, "tasks");
    if (!existsSync(tasksDir) || !statSync(tasksDir).isDirectory()) continue;
    for (const taskFile of readdirSync(tasksDir)) {
      if (!taskFile.endsWith(".md")) continue;
      const taskId = basename(taskFile, ".md");
      const key = `${sprintEntry}/${taskId}`;
      if (!referencedTasks.has(key)) {
        findings.push({
          severity: "warn",
          code: "orphan-task-file",
          message: `\`${taskId}.md\` exists under \`${sprintEntry}/tasks/\` but sprint index does not list it in \`task_ids\`.`,
        });
      }
    }

    // Stale-claim check — scan every task's claim.heartbeat.
    for (const taskFile of readdirSync(tasksDir)) {
      if (!taskFile.endsWith(".md")) continue;
      const taskId = basename(taskFile, ".md");
      try {
        const { task } = await store.getTask(sprintEntry, taskId);
        const claim = task.meta.claim;
        if (!claim) continue;
        const heartbeatMs = Date.parse(claim.heartbeat);
        if (Number.isNaN(heartbeatMs)) continue;
        const ageMs = Date.now() - heartbeatMs;
        if (ageMs > STALE_CLAIM_MS) {
          const hours = Math.floor(ageMs / (60 * 60 * 1000));
          findings.push({
            severity: "warn",
            code: "stale-claim",
            message: `\`${taskId}\` has a claim by \`${claim.by}\` whose heartbeat is ${hours}h old. Run \`pnpm dckl task release ${taskId}\`.`,
          });
        } else if (!isClaimFresh(claim)) {
          findings.push({
            severity: "ok",
            code: "claim-idle",
            message: `\`${taskId}\` has an idle (but not stale) claim by \`${claim.by}\`.`,
          });
        }
      } catch {
        // already flagged by task-invalid check above
      }
    }
  }
}

function checkActiveTaskPointer(
  dcklRoot: string,
  findings: Finding[],
  opts: { fix: boolean },
): void {
  const activePath = join(dcklRoot, ".active-task");
  if (!existsSync(activePath)) {
    findings.push({
      severity: "ok",
      code: "active-task",
      message: "No `.active-task` pointer (nothing is currently claimed — expected when idle).",
    });
    return;
  }

  const fixHint = opts.fix
    ? " Auto-fixing now."
    : " Run `dckl doctor --fix` to clear the pointer.";

  const applyFix = (code: string, reason: string): void => {
    if (!opts.fix) return;
    try {
      unlinkSync(activePath);
      findings.push({
        severity: "ok",
        code: `${code}-fixed`,
        message: `Cleared stale \`.active-task\` (${reason}).`,
      });
    } catch (err) {
      findings.push({
        severity: "error",
        code: `${code}-fix-failed`,
        message: `Could not delete \`.active-task\`: ${(err as Error).message}`,
      });
    }
  };

  let parsed: { sprint_id?: unknown; task_id?: unknown };
  try {
    parsed = JSON.parse(readFileSync(activePath, "utf8")) as typeof parsed;
  } catch (err) {
    findings.push({
      severity: "warn",
      code: "active-task-malformed",
      message: `\`.active-task\` exists but is not valid JSON: ${(err as Error).message}.${fixHint}`,
    });
    applyFix("active-task-malformed", "unparseable JSON");
    return;
  }

  const sid = typeof parsed.sprint_id === "string" ? parsed.sprint_id : null;
  const tid = typeof parsed.task_id === "string" ? parsed.task_id : null;
  if (!sid || !tid) {
    findings.push({
      severity: "warn",
      code: "active-task-malformed",
      message: `\`.active-task\` is missing \`sprint_id\` or \`task_id\`.${fixHint}`,
    });
    applyFix("active-task-malformed", "missing fields");
    return;
  }

  // Reject path-traversal via a crafted .active-task file. Sprint IDs are
  // `sprint-<slug>` and task IDs are `<PREFIX>-<N>` — anything else is an
  // injection attempt or a user editing the file by hand. Both → warn +
  // bail, never join into a path.
  if (!/^sprint-[a-z0-9-]+$/i.test(sid) || !/^[A-Z][A-Z0-9]*-\d+$/.test(tid)) {
    findings.push({
      severity: "warn",
      code: "active-task-malformed",
      message: `\`.active-task\` has unsafe values (\`sprint_id=${sid}\`, \`task_id=${tid}\`).${fixHint}`,
    });
    applyFix("active-task-malformed", "unsafe values");
    return;
  }

  const taskFile = join(dcklRoot, "sprints", sid, "tasks", `${tid}.md`);
  if (!existsSync(taskFile)) {
    findings.push({
      severity: "warn",
      code: "active-task-orphan",
      message: `\`.active-task\` points at \`${sid}/${tid}\` but no such task file exists.${fixHint}`,
    });
    applyFix("active-task-orphan", `task ${tid} not found in ${sid}`);
    return;
  }

  findings.push({
    severity: "ok",
    code: "active-task",
    message: `\`.active-task\` points at \`${tid}\` in \`${sid}\` (task file exists).`,
  });
}

function checkClaudeIntegration(dcklRoot: string, findings: Finding[]): void {
  const projectRoot = resolve(dcklRoot, "..");
  const settingsPath = join(projectRoot, ".claude", "settings.json");
  if (!existsSync(settingsPath)) {
    findings.push({
      severity: "warn",
      code: "no-claude-settings",
      message:
        "`.claude/settings.json` missing — re-run `pnpm dckl init` to install the auto-heartbeat hook.",
    });
    return;
  }

  let settings: Record<string, unknown>;
  try {
    settings = JSON.parse(readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
  } catch (err) {
    findings.push({
      severity: "error",
      code: "claude-settings-invalid",
      message: `.claude/settings.json is not valid JSON: ${(err as Error).message}`,
    });
    return;
  }

  const hooks = (settings.hooks as Record<string, unknown> | undefined)?.PostToolUse;
  const matchers = Array.isArray(hooks) ? hooks : [];
  const hasHeartbeat = matchers.some((m) => {
    const entries = (m as { hooks?: Array<{ command?: string }> }).hooks;
    return entries?.some((h) => h.command?.includes("dckl heartbeat"));
  });
  if (!hasHeartbeat) {
    findings.push({
      severity: "warn",
      code: "hook-not-installed",
      message:
        "PostToolUse `dckl heartbeat` hook missing from `.claude/settings.json`. The UI's amber-pulse will not stay alive during AI sessions. Re-run `pnpm dckl init`.",
    });
  } else {
    findings.push({
      severity: "ok",
      code: "hook",
      message: "PostToolUse `dckl heartbeat` hook is installed.",
    });
  }

  const skillPath = join(projectRoot, ".claude", "skills", "dckl", "SKILL.md");
  if (!existsSync(skillPath)) {
    findings.push({
      severity: "warn",
      code: "no-skill",
      message: ".claude/skills/dckl/SKILL.md missing. Re-run `pnpm dckl init`.",
    });
  } else {
    findings.push({
      severity: "ok",
      code: "skill",
      message: "dckl skill installed for Claude Code.",
    });
  }
}

function emit(findings: Finding[], opts: DoctorOptions): void {
  if (opts.json) {
    console.log(JSON.stringify({ findings }, null, 2));
    return;
  }

  const out: string[] = ["# dckl doctor", ""];
  for (const f of findings) {
    out.push(`${icon(f.severity)} **${f.code}** — ${f.message}`);
  }
  out.push("");
  const errors = findings.filter((f) => f.severity === "error").length;
  const warns = findings.filter((f) => f.severity === "warn").length;
  const oks = findings.filter((f) => f.severity === "ok").length;
  out.push(
    `**Summary:** ${oks} ok · ${warns} warning${warns === 1 ? "" : "s"} · ${errors} error${errors === 1 ? "" : "s"}`,
  );
  console.log(out.join("\n"));
}

function icon(severity: Severity): string {
  switch (severity) {
    case "ok":
      return "✓";
    case "warn":
      return "⚠";
    case "error":
      return "✗";
  }
}
