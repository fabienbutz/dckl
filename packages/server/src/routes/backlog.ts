import { Hono } from "hono";
import type { Store } from "../storage/store.js";

export function backlogRoutes(store: Store): Hono {
  const app = new Hono();

  // Read-only list of every backlog item. UI renders the table from
  // here; CLI uses the same data for status + import flows.
  app.get("/", async (c) => {
    const items = await store.listBacklog();
    return c.json({ items });
  });

  return app;
}
