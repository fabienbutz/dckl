import { Hono } from "hono";
import * as v from "valibot";
import { TaskMeta } from "../schema/index.js";
import { EtagMismatch } from "../storage/fs-adapter.js";
import type { Store } from "../storage/store.js";
import { StoreError } from "../storage/store.js";

// Patch payload: any subset of TaskMeta's mutable fields. Identity and schema
// fields are stripped server-side even if clients send them.
const PatchPayload = v.partial(TaskMeta);

export function taskRoutes(store: Store): Hono {
  const app = new Hono();

  app.get("/:sprintId/tasks/:taskId", async (c) => {
    try {
      const { task, etag } = await store.getTask(c.req.param("sprintId"), c.req.param("taskId"));
      c.header("ETag", etag);
      return c.json(task);
    } catch (err) {
      if (err instanceof StoreError && err.code === "NOT_FOUND") {
        return c.json({ error: err.message }, 404);
      }
      throw err;
    }
  });

  app.patch("/:sprintId/tasks/:taskId", async (c) => {
    const ifMatch = c.req.header("If-Match");
    if (!ifMatch) {
      return c.json(
        { error: "If-Match header required — read the task first to obtain its ETag" },
        428,
      );
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid JSON body" }, 400);
    }

    const parsed = v.safeParse(PatchPayload, body);
    if (!parsed.success) {
      return c.json({ error: "invalid payload", issues: parsed.issues }, 422);
    }

    try {
      const { task, etag } = await store.patchTask(
        c.req.param("sprintId"),
        c.req.param("taskId"),
        parsed.output,
        ifMatch,
      );
      c.header("ETag", etag);
      return c.json(task);
    } catch (err) {
      if (err instanceof EtagMismatch) {
        return c.json({ error: "etag mismatch — task was modified, re-read before patching" }, 409);
      }
      if (err instanceof StoreError && err.code === "NOT_FOUND") {
        return c.json({ error: err.message }, 404);
      }
      throw err;
    }
  });

  return app;
}
