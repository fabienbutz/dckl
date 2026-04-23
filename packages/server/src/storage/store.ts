import { existsSync, mkdirSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import * as v from "valibot";
import type {
  Config,
  Journey,
  JourneyMeta as JourneyMetaType,
  SecurityCheckTemplates,
  Sprint,
  SprintMeta,
  Task,
  TaskMeta,
} from "../schema/index.js";
import { JourneyMeta as JourneyMetaSchema } from "../schema/index.js";
import { TaskMeta as TaskMetaSchema } from "../schema/index.js";
import type { Vision } from "../schema/index.js";
import type { EventBus } from "../events/bus.js";
import { appendChangelog, diffTaskForChangelog } from "./changelog.js";
import { readConfig, readSecurityTemplates } from "./config-io.js";
import { etag } from "./etag.js";
import { writeAtomic } from "./fs-adapter.js";
import { parseJourney, stringifyJourney } from "./journey-io.js";
import { parseSprint, parseTask, stringifyTask } from "./markdown.js";
import { type DcklPaths, dcklPaths, sprintDir, sprintIndexFile, taskFile } from "./paths.js";
import { readVisionIfPresent } from "./vision-io.js";

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
  readonly paths: DcklPaths;
  private bus: EventBus | null = null;

  constructor(dcklRoot: string) {
    this.paths = dcklPaths(dcklRoot);
  }

  /** Wire an event bus so Store writes fan out to SSE subscribers. */
  setEventBus(bus: EventBus): void {
    this.bus = bus;
  }

  async getConfig(): Promise<{ config: Config; etag: string }> {
    if (!existsSync(this.paths.config)) {
      throw new StoreError("NOT_FOUND", "config.yaml not found — run `dckl init`");
    }
    return readConfig(this.paths.config);
  }

  async getSecurityTemplates(): Promise<SecurityCheckTemplates> {
    const path = join(this.paths.templates, "security-checks.yaml");
    if (!existsSync(path)) {
      throw new StoreError("NOT_FOUND", "templates/security-checks.yaml not found");
    }
    return readSecurityTemplates(path);
  }

  /** Read .dckl/VISION.md if it exists; null otherwise (optional file). */
  async getVision(): Promise<Vision | null> {
    return readVisionIfPresent(this.paths.vision);
  }

  // ─── Journeys ───────────────────────────────────────────────────────────

  private journeysDir(): string {
    return join(this.paths.root, "journeys");
  }

  async listJourneys(): Promise<JourneyMetaType[]> {
    const dir = this.journeysDir();
    if (!existsSync(dir)) return [];
    const entries = await readdir(dir);
    const metas: JourneyMetaType[] = [];
    for (const entry of entries) {
      if (!entry.endsWith(".md")) continue;
      try {
        const content = await readFile(join(dir, entry), "utf8");
        metas.push(parseJourney(content).meta);
      } catch {
        // Malformed journey file — surfaced via `dckl doctor` later.
      }
    }
    metas.sort((a, b) => a.id.localeCompare(b.id));
    return metas;
  }

  async getJourney(id: string): Promise<{ journey: Journey; etag: string }> {
    const file = join(this.journeysDir(), `${id}.md`);
    if (!existsSync(file)) {
      throw new StoreError("NOT_FOUND", `journey ${id} not found`);
    }
    const content = await readFile(file, "utf8");
    return { journey: parseJourney(content), etag: etag(content) };
  }

  async createJourney(input: {
    id: string;
    name: string;
    description?: string;
    steps?: JourneyMetaType["steps"];
  }): Promise<{ journey: Journey; etag: string }> {
    const dir = this.journeysDir();
    const file = join(dir, `${input.id}.md`);
    if (existsSync(file)) {
      throw new StoreError("CONFLICT", `journey ${input.id} already exists`);
    }
    const meta = v.parse(JourneyMetaSchema, {
      schema: 1,
      id: input.id,
      name: input.name,
      description: input.description,
      steps: input.steps ?? [],
      updated: new Date().toISOString(),
    });
    const journey: Journey = { meta, body: "" };
    mkdirSync(dir, { recursive: true });
    const newEtag = await writeAtomic(file, stringifyJourney(journey), {
      trashDir: this.paths.trash,
    });
    return { journey, etag: newEtag };
  }

  async patchJourney(
    id: string,
    patch: Partial<JourneyMetaType>,
    ifMatch: string,
  ): Promise<{ journey: Journey; etag: string }> {
    const file = join(this.journeysDir(), `${id}.md`);
    if (!existsSync(file)) {
      throw new StoreError("NOT_FOUND", `journey ${id} not found`);
    }
    const content = await readFile(file, "utf8");
    const current = parseJourney(content);
    const nextMeta = v.parse(JourneyMetaSchema, {
      ...current.meta,
      ...patch,
      // Identity is immutable.
      id: current.meta.id,
      schema: current.meta.schema,
      updated: new Date().toISOString(),
    });
    const next: Journey = { meta: nextMeta, body: current.body };
    const newEtag = await writeAtomic(file, stringifyJourney(next), {
      ifMatch,
      trashDir: this.paths.trash,
    });
    return { journey: next, etag: newEtag };
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

    // Best-effort changelog — failures here must not roll back the patch.
    const events = diffTaskForChangelog(currentTask.meta, nextMeta);
    if (events.length > 0) {
      appendChangelog(this.paths.root, events).catch((err) => {
        console.warn("[dckl] failed to append changelog:", err);
      });
    }

    this.bus?.publish({ kind: "task.updated", sprint_id: sprintId, task_id: taskId });
    return { task: nextTask, etag: newEtag };
  }

  /**
   * Mark the task as actively worked on by a named agent. Side effect: if
   * the task's status is `todo`, auto-transition to `in_progress` so the
   * UI's amber-pulse (which requires in_progress + fresh claim) actually
   * fires. `done` and `blocked` are left alone — a user deliberately
   * re-claiming a finished task should not silently reopen it.
   */
  async claimTask(
    sprintId: string,
    taskId: string,
    by: string,
  ): Promise<{ task: Task; etag: string }> {
    const now = new Date().toISOString();
    return this.writeTaskMeta(sprintId, taskId, (current) => ({
      ...current,
      status: current.status === "todo" ? "in_progress" : current.status,
      claim: {
        by,
        at: current.claim?.by === by ? current.claim.at : now,
        heartbeat: now,
      },
    }));
  }

  /** Bump the heartbeat timestamp on an active claim. No-op if not claimed. */
  async heartbeatTask(
    sprintId: string,
    taskId: string,
  ): Promise<{ task: Task; etag: string } | null> {
    const file = taskFile(this.paths, sprintId, taskId);
    if (!existsSync(file)) return null;
    const content = await readFile(file, "utf8");
    const parsed = parseTask(content);
    if (!parsed.meta.claim) return null;

    return this.writeTaskMeta(sprintId, taskId, (current) => ({
      ...current,
      claim: current.claim
        ? { ...current.claim, heartbeat: new Date().toISOString() }
        : undefined,
    }));
  }

  /** Release the claim. Idempotent — no-op if already unclaimed. */
  async releaseTask(
    sprintId: string,
    taskId: string,
  ): Promise<{ task: Task; etag: string }> {
    return this.writeTaskMeta(sprintId, taskId, (current) => {
      const { claim: _drop, ...rest } = current;
      return rest as TaskMeta;
    });
  }

  /**
   * Internal helper: read task, apply transform, write atomically. Used by
   * claim/heartbeat/release which bypass the ETag check — these are agent
   * signals, not user edits, and need to fire without coordination.
   */
  private async writeTaskMeta(
    sprintId: string,
    taskId: string,
    transform: (current: TaskMeta) => TaskMeta,
  ): Promise<{ task: Task; etag: string }> {
    const file = taskFile(this.paths, sprintId, taskId);
    if (!existsSync(file)) {
      throw new StoreError("NOT_FOUND", `task ${taskId} in ${sprintId} not found`);
    }
    const content = await readFile(file, "utf8");
    const current = parseTask(content);
    const nextMeta = v.parse(TaskMetaSchema, transform(current.meta));
    const nextTask: Task = { meta: nextMeta, body: current.body };
    const serialized = stringifyTask(nextTask);
    const newEtag = await writeAtomic(file, serialized, {
      trashDir: this.paths.trash,
    });
    this.bus?.publish({ kind: "task.updated", sprint_id: sprintId, task_id: taskId });
    return { task: nextTask, etag: newEtag };
  }

  /** Test helper — ensures the sprint dir exists before writing fixtures. */
  sprintDir(id: string): string {
    return sprintDir(this.paths, id);
  }

  /** Verifies the .dckl/ layout is present and looks valid. */
  async doctor(): Promise<{ ok: boolean; issues: string[] }> {
    const issues: string[] = [];
    if (!existsSync(this.paths.root)) issues.push("missing .dckl/");
    if (!existsSync(this.paths.config)) issues.push("missing .dckl/config.yaml");
    if (!existsSync(this.paths.sprints)) issues.push("missing .dckl/sprints/");
    if (existsSync(this.paths.root)) {
      const s = await stat(this.paths.root);
      if (!s.isDirectory()) issues.push(".dckl/ is not a directory");
    }
    return { ok: issues.length === 0, issues };
  }
}
