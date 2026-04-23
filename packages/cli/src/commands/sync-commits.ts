import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import matter from "gray-matter";
import { findDcklRoot, groupCommitsByTask, listCommits } from "@dckl/server/storage";

export type SyncCommitsOptions = {
  json?: boolean;
  sprintId?: string;
};

type SprintMeta = {
  id: string;
  name?: string;
  start?: string;
  task_ids?: string[];
  status?: string;
};

export async function runSyncCommits(opts: SyncCommitsOptions = {}): Promise<void> {
  const dcklRoot = findDcklRoot(process.cwd());
  if (!dcklRoot) {
    console.error("[dckl] no .dckl/ found — run `dckl init` first");
    process.exit(1);
  }

  const sprint = resolveSprint(dcklRoot, opts.sprintId);
  if (!sprint) {
    console.error(
      opts.sprintId
        ? `[dckl] sprint ${opts.sprintId} not found`
        : "[dckl] no active sprint — pass a sprint id explicitly",
    );
    process.exit(1);
  }

  const projectRoot = resolve(dcklRoot, "..");
  const prefix = readTaskPrefix(dcklRoot) ?? undefined;
  const commits = listCommits(projectRoot, typeof sprint.start === "string" ? sprint.start : undefined);
  const byTask = groupCommitsByTask(commits, prefix);

  if (opts.json) {
    console.log(JSON.stringify({ sprintId: sprint.id, commits: byTask }, null, 2));
    return;
  }

  printMarkdown(sprint, byTask);
}

function resolveSprint(dcklRoot: string, requested?: string): SprintMeta | null {
  const sprintsDir = join(dcklRoot, "sprints");
  if (!existsSync(sprintsDir)) return null;

  const entries = readdirSync(sprintsDir).filter(
    (e) => !e.startsWith(".") && existsSync(join(sprintsDir, e, "index.md")),
  );

  if (requested) {
    if (!entries.includes(requested)) return null;
    return readSprintMeta(join(sprintsDir, requested, "index.md"));
  }

  for (const id of entries) {
    const meta = readSprintMeta(join(sprintsDir, id, "index.md"));
    if (meta?.status === "active") return meta;
  }
  // Fallback: first sprint in the dir.
  const first = entries[0];
  if (!first) return null;
  return readSprintMeta(join(sprintsDir, first, "index.md"));
}

function readSprintMeta(indexPath: string): SprintMeta | null {
  try {
    const { data } = matter(readFileSync(indexPath, "utf8"));
    return data as SprintMeta;
  } catch {
    return null;
  }
}

function readTaskPrefix(dcklRoot: string): string | null {
  const path = join(dcklRoot, "config.yaml");
  if (!existsSync(path)) return null;
  const m = /^task_id_prefix:\s*(\S+)\s*$/m.exec(readFileSync(path, "utf8"));
  return m?.[1]?.trim() ?? null;
}

function printMarkdown(
  sprint: SprintMeta,
  byTask: Record<string, Array<{ short: string; subject: string; date: string }>>,
): void {
  const out: string[] = [
    `# Commits — sprint ${sprint.id}${sprint.name ? ` (${sprint.name})` : ""}`,
    sprint.start ? `Since: ${String(sprint.start).slice(0, 10)}` : "",
    "",
  ];
  const taskIds = (sprint.task_ids ?? []).slice().sort();
  if (taskIds.length === 0) {
    out.push("_sprint has no task_ids listed_");
  } else {
    for (const id of taskIds) {
      const commits = byTask[id];
      out.push(`## ${id}`);
      if (!commits || commits.length === 0) {
        out.push("  _no commits yet_");
      } else {
        for (const c of commits) {
          out.push(`  - \`${c.short}\` · ${c.subject} · ${c.date.slice(0, 10)}`);
        }
      }
      out.push("");
    }
  }

  // Orphan commits — referenced task-ids that are not in the sprint's task_ids.
  const known = new Set(taskIds);
  const orphans = Object.keys(byTask).filter((id) => !known.has(id));
  if (orphans.length > 0) {
    out.push("## _Other referenced IDs (not in this sprint)_");
    for (const id of orphans.sort()) {
      const commits = byTask[id] ?? [];
      out.push(`  - ${id}: ${commits.length} commit${commits.length === 1 ? "" : "s"}`);
    }
  }

  console.log(out.filter((l) => l !== "" || true).join("\n"));
}
