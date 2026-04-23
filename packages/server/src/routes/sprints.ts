import { Hono } from "hono";
import type { Store } from "../storage/store.js";
import { StoreError } from "../storage/store.js";

export function sprintRoutes(store: Store): Hono {
  const app = new Hono();

  app.get("/", async (c) => {
    const sprints = await store.listSprints();
    return c.json({ sprints });
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
