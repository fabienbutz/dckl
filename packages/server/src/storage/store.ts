import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import * as v from "valibot";
import type { Config, Sprint, SprintMeta, Task, TaskMeta } from "../schema/index.js";
import { TaskMeta as TaskMetaSchema } from "../schema/index.js";
import { readConfig } from "./config-io.js";
import { etag } from "./etag.js";
import { writeAtomic } from "./fs-adapter.js";
import { parseSprint, parseTask, stringifyTask } from "./markdown.js";
import { type DeckelPaths, deckelPaths, sprintDir, sprintIndexFile, taskFile } from "./paths.js";

export class StoreError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "INVALID" | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "StoreError";
  }
}

export class Store {
  readonly paths: DeckelPaths;

  constructor(deckelRoot: string) {
    this.paths = deckelPaths(deckelRoot);
  }

  async getConfig(): Promise<{ config: Config; etag: string }> {
    if (!existsSync(this.paths.config)) {
      throw new StoreError("NOT_FOUND", "config.yaml not found — run `deckel init`");
    }
    return readConfig(this.paths.config);
  }

  async listSprints(): Promise<SprintMeta[]> {
    if (!existsSync(this.paths.sprints)) return [];
    const entries = await readdir(this.paths.sprints);
    const metas: SprintMeta[] = [];
    for (const entry of entries) {
      const indexPath = sprintIndexFile(this.paths, entry);
      if (!existsSync(indexPath)) continue;
      try {
        const content = await readFile(indexPath, "utf8");
        metas.push(parseSprint(content).meta);
      } catch {
        // Skip malformed sprint folders — surfaced via /api/doctor later.
      }
    }
    metas.sort((a, b) => a.id.localeCompare(b.id));
    return metas;
  }

  async getSprint(id: string): Promise<{ sprint: Sprint; etag: string }> {
    const indexPath = sprintIndexFile(this.paths, id);
    if (!existsSync(indexPath)) {
      throw new StoreError("NOT_FOUND", `sprint ${id} not found`);
    }
    const content = await readFile(indexPath, "utf8");
    return { sprint: parseSprint(content), etag: etag(content) };
  }

  async getTask(sprintId: string, taskId: string): Promise<{ task: Task; etag: string }> {
    const file = taskFile(this.paths, sprintId, taskId);
    if (!existsSync(file)) {
      throw new StoreError("NOT_FOUND", `task ${taskId} in ${sprintId} not found`);
    }
    const content = await readFile(file, "utf8");
    return { task: parseTask(content), etag: etag(content) };
  }

  /**
   * Applies a shallow patch to a task's metadata. Caller must supply the
   * ETag they read; writeAtomic rejects with EtagMismatch if the file
   * changed on disk in the meantime.
   */
  async patchTask(
    sprintId: string,
    taskId: string,
    patch: Partial<TaskMeta>,
    ifMatch: string,
  ): Promise<{ task: Task; etag: string }> {
    const file = taskFile(this.paths, sprintId, taskId);
    if (!existsSync(file)) {
      throw new StoreError("NOT_FOUND", `task ${taskId} in ${sprintId} not found`);
    }

    const current = await readFile(file, "utf8");
    const currentTask = parseTask(current);

    const nextMeta = v.parse(TaskMetaSchema, {
      ...currentTask.meta,
      ...patch,
      // Never let callers rewrite identity fields.
      id: currentTask.meta.id,
      sprint_id: currentTask.meta.sprint_id,
      schema: currentTask.meta.schema,
      updated: new Date().toISOString(),
    });

    const nextTask: Task = { meta: nextMeta, body: currentTask.body };
    const serialized = stringifyTask(nextTask);
    const newEtag = await writeAtomic(file, serialized, {
      ifMatch,
      trashDir: this.paths.trash,
    });
    return { task: nextTask, etag: newEtag };
  }

  /** Test helper — ensures the sprint dir exists before writing fixtures. */
  sprintDir(id: string): string {
    return sprintDir(this.paths, id);
  }

  /** Verifies the .deckel/ layout is present and looks valid. */
  async doctor(): Promise<{ ok: boolean; issues: string[] }> {
    const issues: string[] = [];
    if (!existsSync(this.paths.root)) issues.push("missing .deckel/");
    if (!existsSync(this.paths.config)) issues.push("missing .deckel/config.yaml");
    if (!existsSync(this.paths.sprints)) issues.push("missing .deckel/sprints/");
    if (existsSync(this.paths.root)) {
      const s = await stat(this.paths.root);
      if (!s.isDirectory()) issues.push(".deckel/ is not a directory");
    }
    return { ok: issues.length === 0, issues };
  }
}
