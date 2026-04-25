import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import matter from "gray-matter";
import { findDcklRoot } from "@dckl/server/storage";

export type BacklogAddOptions = {
  type?: "feature" | "bug" | "chore" | "refactor";
};

export async function runBacklogAdd(
  title: string,
  opts: BacklogAddOptions = {},
): Promise<void> {
  const dcklRoot = requireDcklRoot();
  const trimmed = title.trim();
  if (!trimmed) {
    console.error("[dckl] backlog title must not be empty");
    process.exit(1);
  }

  const prefix = readTaskPrefix(dcklRoot);
  if (!prefix) {
    console.error("[dckl] config.yaml has no task_id_prefix — fix config first");
    process.exit(1);
  }

  const number = nextTaskNumber(dcklRoot);
  const padded = String(number).padStart(2, "0");
  const id = `${prefix}-${padded}`;

  const backlogDir = join(dcklRoot, "backlog");
  if (!existsSync(backlogDir)) mkdirSync(backlogDir, { recursive: true });
  const file = join(backlogDir, `${id}.md`);
  if (existsSync(file)) {
    console.error(`[dckl] ${file} already exists — id collision, refusing to overwrite`);
    process.exit(1);
  }

  const created = new Date().toISOString();
  const type = opts.type ?? "feature";
  const body = `---
schema: 1
id: ${id}
title: ${JSON.stringify(trimmed)}
type: ${type}
status: todo
created: ${created}
---

`;
  writeFileSync(file, body, "utf8");
  console.log(`[dckl] backlog: created ${id} — ${trimmed}`);
  console.log(`        ${file}`);
  console.log(`        Promote with: dckl task move ${id} <sprint-id>`);
}

export async function runTaskMove(taskId: string, targetSprintId: string): Promise<void> {
  const dcklRoot = requireDcklRoot();
  const backlogFile = join(dcklRoot, "backlog", `${taskId}.md`);
  if (!existsSync(backlogFile)) {
    console.error(`[dckl] backlog task ${taskId} not found`);
    process.exit(1);
  }
  const sprintDir = join(dcklRoot, "sprints", targetSprintId);
  const sprintIndex = join(sprintDir, "index.md");
  if (!existsSync(sprintIndex)) {
    console.error(`[dckl] target sprint ${targetSprintId} has no index.md`);
    process.exit(1);
  }
  const tasksDir = join(sprintDir, "tasks");
  if (!existsSync(tasksDir)) mkdirSync(tasksDir, { recursive: true });
  const targetFile = join(tasksDir, `${taskId}.md`);
  if (existsSync(targetFile)) {
    console.error(`[dckl] target ${targetFile} already exists — refusing to overwrite`);
    process.exit(1);
  }

  // Update the file's frontmatter (sprint_id) before moving — keeps a
  // single atomic state on disk if the rename fails.
  const raw = readFileSync(backlogFile, "utf8");
  const parsed = matter(raw);
  const nextMeta = { ...parsed.data, sprint_id: targetSprintId };
  const nextContent = matter.stringify(parsed.content, nextMeta);
  writeFileSync(backlogFile, nextContent, "utf8");

  // Add the task id to the sprint's task_ids list before moving.
  const indexRaw = readFileSync(sprintIndex, "utf8");
  const indexParsed = matter(indexRaw);
  const indexMeta = indexParsed.data as { task_ids?: string[] };
  const ids = Array.isArray(indexMeta.task_ids) ? indexMeta.task_ids : [];
  if (!ids.includes(taskId)) ids.push(taskId);
  const nextIndex = matter.stringify(indexParsed.content, { ...indexMeta, task_ids: ids });
  writeFileSync(sprintIndex, nextIndex, "utf8");

  renameSync(backlogFile, targetFile);
  console.log(`[dckl] moved ${taskId} → ${targetSprintId}`);
}

function requireDcklRoot(): string {
  const root = findDcklRoot(process.cwd());
  if (!root) {
    console.error("[dckl] no .dckl/ found — run `dckl init` first");
    process.exit(1);
  }
  return root;
}

function readTaskPrefix(dcklRoot: string): string | null {
  const path = join(dcklRoot, "config.yaml");
  if (!existsSync(path)) return null;
  const m = /^task_id_prefix:\s*(\S+)\s*$/m.exec(readFileSync(path, "utf8"));
  return m?.[1]?.trim() ?? null;
}

function nextTaskNumber(dcklRoot: string): number {
  const re = /^[A-Z][A-Z0-9]*-(\d+)\.md$/;
  let max = 0;
  const sprintsDir = join(dcklRoot, "sprints");
  if (existsSync(sprintsDir)) {
    for (const sprint of readdirSync(sprintsDir)) {
      if (sprint.startsWith(".")) continue;
      const tasksDir = resolve(sprintsDir, sprint, "tasks");
      if (!existsSync(tasksDir)) continue;
      for (const file of readdirSync(tasksDir)) {
        const m = re.exec(file);
        if (m?.[1]) max = Math.max(max, Number.parseInt(m[1], 10));
      }
    }
  }
  const backlogDir = join(dcklRoot, "backlog");
  if (existsSync(backlogDir)) {
    for (const file of readdirSync(backlogDir)) {
      const m = re.exec(file);
      if (m?.[1]) max = Math.max(max, Number.parseInt(m[1], 10));
    }
  }
  return max + 1;
}
