import { Hono } from "hono";
import type { SprintMeta } from "../schema/sprint.js";
import { isClaimFresh } from "../schema/task.js";
import type { Store } from "../storage/store.js";
import { StoreError } from "../storage/store.js";

export function sprintRoutes(store: Store): Hono {
  const app = new Hono();

  app.get("/", async (c) => {
    const sprints = await store.listSprints();
    const withDerived = await Promise.all(
      sprints.map(async (meta) => ({
        ...meta,
        ...(await computeDerived(store, meta)),
      })),
    );
    return c.json({ sprints: withDerived });
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    try {
      const { sprint, etag } = await store.getSprint(id);
      c.header("ETag", etag);
      return c.json(sprint);
    } catch (err) {
      if (err instanceof StoreError && err.code === "NOT_FOUND") {
        return c.json({ error: err.message }, 404);
      }
      throw err;
    }
  });

  return app;
}

type SprintDerived = {
  live: boolean;
  tasks_total: number;
  tasks_done: number;
  tasks_in_progress: number;
  corrections_open: number;
};

/**
 * Derived sprint-level aggregates. `live` is true when any task is
 * in-progress or has a fresh claim heartbeat. The counts feed the
 * sprints-list table view so the UI can render progress without
 * fetching each task individually. Single pass over task files.
 */
async function computeDerived(store: Store, sprint: SprintMeta): Promise<SprintDerived> {
  const derived: SprintDerived = {
    live: false,
    tasks_total: sprint.task_ids.length,
    tasks_done: 0,
    tasks_in_progress: 0,
    corrections_open: 0,
  };
  for (const taskId of sprint.task_ids) {
    try {
      const { task } = await store.getTask(sprint.id, taskId);
      if (task.meta.status === "done") derived.tasks_done++;
      if (task.meta.status === "in_progress") {
        derived.tasks_in_progress++;
        derived.live = true;
      }
      if (task.meta.claim && isClaimFresh(task.meta.claim)) derived.live = true;
      derived.corrections_open += task.meta.corrections.filter((c) => c.open).length;
    } catch {
      // Task file missing or malformed — skip, Doctor surfaces it elsewhere.
    }
  }
  return derived;
}
