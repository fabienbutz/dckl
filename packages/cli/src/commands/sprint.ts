import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { findDcklRoot } from "@dckl/server/storage";

type SprintMeta = {
  id: string;
  name?: string;
  goal?: string;
  status?: string;
  start?: string;
  end?: string;
  task_ids?: string[];
};

type TaskMeta = {
  id?: string;
  status?: string;
  corrections?: Array<{ id: string; open: boolean; text?: string }>;
};

type Counts = {
  totalTasks: number;
  done: number;
  inProgress: number;
  todo: number;
  correctionsOpen: number;
  correctionsResolved: number;
};

export type SprintCloseOptions = {
  force?: boolean;
  dryRun?: boolean;
};

export async function runSprintClose(
  sprintId: string,
  opts: SprintCloseOptions = {},
): Promise<void> {
  const dcklRoot = findDcklRoot(process.cwd());
  if (!dcklRoot) {
    console.error("[dckl] no .dckl/ found — run `dckl init` first");
    process.exit(1);
  }

  const sprintDir = join(dcklRoot, "sprints", sprintId);
  if (!existsSync(sprintDir)) {
    console.error(`[dckl] sprint ${sprintId} not found at ${sprintDir}`);
    process.exit(1);
  }
  const indexPath = join(sprintDir, "index.md");
  if (!existsSync(indexPath)) {
    console.error(`[dckl] sprint ${sprintId} has no index.md`);
    process.exit(1);
  }

  const raw = readFileSync(indexPath, "utf8");
  const parsed = matter(raw);
  const sprintMeta = parsed.data as SprintMeta;
  const body = parsed.content;

  const archiveRoot = join(dcklRoot, "sprints", ".archive");
  const archivedDir = join(archiveRoot, sprintId);
  if (existsSync(archivedDir)) {
    console.error(`[dckl] ${sprintId} is already archived at ${archivedDir}`);
    process.exit(1);
  }

  const { counts, openTaskIds } = tallyTasks(sprintDir);

  if (openTaskIds.length > 0 && !opts.force) {
    console.error(
      `[dckl] ${sprintId} has ${openTaskIds.length} non-done task${openTaskIds.length === 1 ? "" : "s"}:`,
    );
    for (const id of openTaskIds) console.error(`  · ${id}`);
    console.error("[dckl] pass --force to archive anyway.");
    process.exit(1);
  }

  const changelogExcerpt = readChangelogExcerpt(dcklRoot, sprintMeta.task_ids ?? []);
  const summary = buildSummary(sprintMeta, counts, changelogExcerpt);

  if (opts.dryRun) {
    console.log(`[dckl] --dry-run: would archive ${sprintId} → ${archivedDir}`);
    console.log(`[dckl] --dry-run: would write ${sprintDir}/SUMMARY.md:`);
    console.log(summary);
    return;
  }

  // Write SUMMARY.md in the source dir before the move (so renameSync carries
  // it in one atomic step).
  writeFileSync(join(sprintDir, "SUMMARY.md"), summary, "utf8");

  // Flip sprint status to done.
  const newMeta = { ...sprintMeta, status: "done" };
  const newIndex = matter.stringify(body, newMeta);
  writeFileSync(indexPath, newIndex, "utf8");

  // Clear .active-task if it pointed into this sprint.
  const activePath = join(dcklRoot, ".active-task");
  if (existsSync(activePath)) {
    try {
      const lock = JSON.parse(readFileSync(activePath, "utf8")) as {
        sprint_id?: string;
      };
      if (lock.sprint_id === sprintId) unlinkSync(activePath);
    } catch {
      // malformed — leave it; `dckl doctor --fix` will handle that path
    }
  }

  // Move to archive. Atomic on same filesystem (fs.renameSync).
  if (!existsSync(archiveRoot)) mkdirSync(archiveRoot, { recursive: true });
  renameSync(sprintDir, archivedDir);

  appendSprintCloseToChangelog(dcklRoot, sprintId, counts);

  console.log(`[dckl] archived ${sprintId} → ${archivedDir}`);
  console.log(
    `  ${counts.done} done · ${counts.inProgress} in_progress · ${counts.todo} todo`,
  );
  console.log(
    `  ${counts.correctionsOpen} corrections open · ${counts.correctionsResolved} resolved`,
  );
}

function tallyTasks(sprintDir: string): { counts: Counts; openTaskIds: string[] } {
  const tasksDir = join(sprintDir, "tasks");
  const counts: Counts = {
    totalTasks: 0,
    done: 0,
    inProgress: 0,
    todo: 0,
    correctionsOpen: 0,
    correctionsResolved: 0,
  };
  const openTaskIds: string[] = [];

  if (!existsSync(tasksDir)) return { counts, openTaskIds };

  for (const file of readdirSync(tasksDir)) {
    if (!file.endsWith(".md")) continue;
    const id = file.replace(/\.md$/, "");
    try {
      const { data } = matter(readFileSync(join(tasksDir, file), "utf8"));
      const tm = data as TaskMeta;
      counts.totalTasks++;
      if (tm.status === "done") counts.done++;
      else if (tm.status === "in_progress") {
        counts.inProgress++;
        openTaskIds.push(id);
      } else {
        counts.todo++;
        openTaskIds.push(id);
      }
      for (const c of tm.corrections ?? []) {
        if (c.open) counts.correctionsOpen++;
        else counts.correctionsResolved++;
      }
    } catch {
      // unreadable → count as todo-equivalent for safety
      counts.totalTasks++;
      counts.todo++;
      openTaskIds.push(id);
    }
  }
  return { counts, openTaskIds };
}

function readChangelogExcerpt(dcklRoot: string, taskIds: string[]): string[] {
  if (taskIds.length === 0) return [];
  const path = join(dcklRoot, "CHANGELOG.md");
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, "utf8").split("\n");
  return lines.filter((line) => taskIds.some((id) => line.includes(`\`${id}\``)));
}

function buildSummary(
  sprintMeta: SprintMeta,
  counts: Counts,
  changelogExcerpt: string[],
): string {
  const duration =
    sprintMeta.start && sprintMeta.end
      ? `${formatDate(sprintMeta.start)} → ${formatDate(sprintMeta.end)}`
      : "unknown";
  const parts = [
    `# ${sprintMeta.id}${sprintMeta.name ? ` — ${sprintMeta.name}` : ""}`,
    "",
    `**Closed:** ${new Date().toISOString().slice(0, 10)}`,
    `**Window:** ${duration}`,
    sprintMeta.goal ? `**Goal:** ${sprintMeta.goal}` : "",
    "",
    "## Totals",
    "",
    `- Tasks: ${counts.totalTasks} (${counts.done} done, ${counts.inProgress} in_progress, ${counts.todo} todo)`,
    `- Corrections: ${counts.correctionsOpen} open, ${counts.correctionsResolved} resolved`,
    "",
  ];
  if (changelogExcerpt.length > 0) {
    parts.push("## Changelog excerpt", "");
    parts.push(...changelogExcerpt);
    parts.push("");
  }
  return parts.filter((line) => line !== "").join("\n").concat("\n");
}

function formatDate(v: unknown): string {
  if (!v) return "?";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function appendSprintCloseToChangelog(
  dcklRoot: string,
  sprintId: string,
  counts: Counts,
): void {
  const path = join(dcklRoot, "CHANGELOG.md");
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const line = `- **${stamp}** · \`${sprintId}\` · sprint closed (${counts.done} done / ${counts.totalTasks} tasks)\n`;
  try {
    if (!existsSync(path)) {
      writeFileSync(path, `# Project History\n\n${line}`, "utf8");
    } else {
      appendFileSync(path, line, "utf8");
    }
  } catch {
    // best-effort
  }
}
