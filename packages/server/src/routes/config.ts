import { Hono } from "hono";
import type { Store } from "../storage/store.js";
import { StoreError } from "../storage/store.js";

export function configRoutes(store: Store): Hono {
  const app = new Hono();

  app.get("/", async (c) => {
    try {
      const { config, etag } = await store.getConfig();
      c.header("ETag", etag);
      return c.json(config);
    } catch (err) {
      if (err instanceof StoreError && err.code === "NOT_FOUND") {
        return c.json({ error: err.message }, 404);
      }
      throw err;
    }
  });

  return app;
}
