import { execSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { Store, isClaimFresh } from "@deckel/server";
import { findDeckelRoot } from "@deckel/server/storage";
import type { SprintMeta, TaskMeta, Vision } from "@deckel/server/schema";

export type StatusOptions = {
  gitDays?: number;
  json?: boolean;
};

export async function runStatus(opts: StatusOptions = {}): Promise<void> {
  const deckelRoot = findDeckelRoot(process.cwd());
  if (!deckelRoot) {
    console.error("[deckel] no .deckel/ found — run `deckel init` first");
    process.exitCode = 1;
    return;
  }

  const store = new Store(deckelRoot);
  const gitDays = opts.gitDays ?? 14;

  let vision: Vision | null = null;
  try {
    vision = await store.getVision();
  } catch (err) {
    console.warn(`[deckel] VISION.md exists but failed to parse: ${(err as Error).message}`);
  }

  const sprintMetas = await store.listSprints();
  const activeSprint = sprintMetas.find((s) => s.status === "active") ?? null;
  const activeTasks = activeSprint ? await collectTasks(store, activeSprint) : [];

  const totals = tallyTasks(activeTasks);
  const staleClaims = activeTasks.filter(
    (t) => t.claim && !isClaimFresh(t.claim),
  );
  const freshClaims = activeTasks.filter(
    (t) => t.claim && isClaimFresh(t.claim),
  );

  const gitRecent = gatherGitRecent(deckelRoot, gitDays);
  const orphanTodos = gatherOrphanTodos(deckelRoot);

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          vision,
          activeSprint,
          activeTasks: activeTasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            claim: t.claim,
            openReminders: t.security_checks.filter((r) => !r.checked).length,
            openTests: t.test_criteria.filter((c) => !c.checked).length,
            openCorrections: t.corrections.filter((c) => c.open).length,
          })),
          totals,
          gitRecent,
          orphanTodoCount: orphanTodos.length,
        },
        null,
        2,
      ),
    );
    return;
  }

  const out: string[] = [];
  out.push(`# Deckel Status — ${new Date().toISOString().slice(0, 10)}`);
  out.push("");

  if (vision) {
    const ageDays = visionAgeDays(vision.meta.updated);
    const staleMarker = ageDays !== null && ageDays > 60 ? ` ⚠️  ${ageDays}d old — review` : "";
    out.push("## Vision");
    out.push("");
    out.push(`**North star:** ${vision.meta.north_star}`);
    if (vision.meta.audience) out.push(`**Audience:** ${vision.meta.audience}`);
    if (vision.meta.current_phase) out.push(`**Phase:** \`${vision.meta.current_phase}\``);
    if (vision.meta.non_goals && vision.meta.non_goals.length > 0) {
      out.push(`**Non-goals:** ${vision.meta.non_goals.join(", ")}`);
    }
    if (vision.meta.updated) out.push(`_Updated: ${vision.meta.updated}${staleMarker}_`);
    out.push("");
  } else {
    out.push("## Vision");
    out.push("");
    out.push("_No VISION.md — create `.deckel/VISION.md` to anchor sprints._");
    out.push("");
  }

  out.push("## Active sprint");
  out.push("");
  if (!activeSprint) {
    out.push("_No sprint has `status: active`._");
  } else {
    out.push(`\`${activeSprint.id}\` · **${activeSprint.name}**`);
    out.push(`Goal: ${activeSprint.goal}`);
    out.push(`Window: ${activeSprint.start} → ${activeSprint.end}`);
  }
  out.push("");

  out.push("## In flight");
  out.push("");
  const inFlight = activeTasks.filter((t) => t.status === "in_progress");
  if (inFlight.length === 0) {
    out.push("_No tasks with `status: in_progress`._");
  } else {
    for (const t of inFlight) {
      const live = t.claim && isClaimFresh(t.claim) ? ` · 🟠 live (${t.claim?.by})` : "";
      const stale = t.claim && !isClaimFresh(t.claim) ? ` · idle (${staleAge(t.claim.heartbeat)})` : "";
      out.push(`- \`${t.id}\` ${t.title}${live}${stale}`);
    }
  }
  out.push("");

  out.push("## Gap");
  out.push("");
  out.push(`- ${totals.openReminders} reminder${totals.openReminders === 1 ? "" : "s"} unchecked`);
  out.push(`- ${totals.openTests} test criteri${totals.openTests === 1 ? "on" : "a"} unchecked`);
  out.push(`- ${totals.openCorrections} correction${totals.openCorrections === 1 ? "" : "s"} open`);
  if (staleClaims.length > 0) {
    out.push(`- ${staleClaims.length} task${staleClaims.length === 1 ? "" : "s"} stale (claim heartbeat > 5 min)`);
  }
  if (freshClaims.length > 0) {
    out.push(`- ${freshClaims.length} task${freshClaims.length === 1 ? "" : "s"} live right now`);
  }
  out.push("");

  if (gitRecent) {
    out.push(`## Shipped (${gitDays}d)`);
    out.push("");
    if (gitRecent.commits.length === 0) {
      out.push("_No commits in window._");
    } else {
      for (const c of gitRecent.commits.slice(0, 15)) out.push(`- ${c}`);
      if (gitRecent.commits.length > 15) {
        out.push(`- _…and ${gitRecent.commits.length - 15} more_`);
      }
    }
    out.push("");
  }

  if (orphanTodos.length > 0) {
    out.push("## Orphan TODOs in code");
    out.push("");
    out.push(
      `${orphanTodos.length} \`TODO\`/\`FIXME\` comment${orphanTodos.length === 1 ? "" : "s"} not referenced by any task. Turn the important ones into chunks.`,
    );
    out.push("");
    for (const line of orphanTodos.slice(0, 8)) out.push(`- \`${line}\``);
    if (orphanTodos.length > 8) out.push(`- _…and ${orphanTodos.length - 8} more_`);
    out.push("");
  }

  console.log(out.join("\n"));
}

async function collectTasks(store: Store, sprintMeta: SprintMeta): Promise<TaskMeta[]> {
  const result: TaskMeta[] = [];
  for (const taskId of sprintMeta.task_ids) {
    try {
      const { task } = await store.getTask(sprintMeta.id, taskId);
      result.push(task.meta);
    } catch {
      // Skip missing/malformed tasks — surfaced via `deckel doctor` (future).
    }
  }
  return result;
}

type Totals = { openReminders: number; openTests: number; openCorrections: number };

function tallyTasks(tasks: TaskMeta[]): Totals {
  const totals: Totals = { openReminders: 0, openTests: 0, openCorrections: 0 };
  for (const t of tasks) {
    totals.openReminders += t.security_checks.filter((r) => !r.checked).length;
    totals.openTests += t.test_criteria.filter((c) => !c.checked).length;
    totals.openCorrections += t.corrections.filter((c) => c.open).length;
  }
  return totals;
}

function visionAgeDays(updated: string | undefined): number | null {
  if (!updated) return null;
  const ts = Date.parse(updated);
  if (Number.isNaN(ts)) return null;
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
}

function staleAge(heartbeat: string): string {
  const ts = Date.parse(heartbeat);
  if (Number.isNaN(ts)) return "unknown";
  const minutes = Math.floor((Date.now() - ts) / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function gatherGitRecent(
  deckelRoot: string,
  days: number,
): { commits: string[] } | null {
  const projectRoot = resolve(deckelRoot, "..");
  if (!existsSync(resolve(projectRoot, ".git"))) return null;
  try {
    const out = execSync(`git log --oneline --since="${days} days ago"`, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return {
      commits: out
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    };
  } catch {
    return null;
  }
}

function gatherOrphanTodos(deckelRoot: string): string[] {
  const projectRoot = resolve(deckelRoot, "..");
  const candidateDirs = ["src", "app", "packages", "lib"].filter((d) =>
    existsSync(resolve(projectRoot, d)),
  );
  if (candidateDirs.length === 0) return [];
  try {
    const pattern = "TODO\\|FIXME\\|XXX";
    const cmd = `grep -rnF --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' -E '${pattern}' ${candidateDirs.join(" ")} 2>/dev/null | head -40`;
    const out = execSync(cmd, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Expose stat checker for tests without needing to mock execSync. */
export function isGitRepo(projectRoot: string): boolean {
  const gitDir = resolve(projectRoot, ".git");
  return existsSync(gitDir) && statSync(gitDir).isDirectory();
}
