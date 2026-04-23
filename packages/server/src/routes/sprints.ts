import { Hono } from "hono";
import type { SprintMeta } from "../schema/sprint.js";
import { isClaimFresh } from "../schema/task.js";
import type { Store } from "../storage/store.js";
import { StoreError } from "../storage/store.js";

export function sprintRoutes(store: Store): Hono {
  const app = new Hono();

  app.get("/", async (c) => {
    const sprints = await store.listSprints();
    const withLive = await Promise.all(
      sprints.map(async (meta) => ({
        ...meta,
        live: await computeLive(store, meta),
      })),
    );
    return c.json({ sprints: withLive });
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

/**
 * Derived "someone is actually working on this sprint right now" flag.
 * True when any task has `status: in_progress` or a fresh claim. Purely
 * read-only — the user's declared `status` stays authoritative for
 * intent, `live` complements it for observed reality.
 */
async function computeLive(store: Store, sprint: SprintMeta): Promise<boolean> {
  for (const taskId of sprint.task_ids) {
    try {
      const { task } = await store.getTask(sprint.id, taskId);
      if (task.meta.status === "in_progress") return true;
      if (task.meta.claim && isClaimFresh(task.meta.claim)) return true;
    } catch {
      // Task file missing or malformed — skip, Doctor surfaces it elsewhere.
    }
  }
  return false;
}
