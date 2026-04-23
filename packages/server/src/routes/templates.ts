import { Hono } from "hono";
import type { Store } from "../storage/store.js";
import { StoreError } from "../storage/store.js";

export function templateRoutes(store: Store): Hono {
  const app = new Hono();

  app.get("/security-checks", async (c) => {
    try {
      const templates = await store.getSecurityTemplates();
      return c.json(templates);
    } catch (err) {
      if (err instanceof StoreError && err.code === "NOT_FOUND") {
        return c.json({ error: err.message }, 404);
      }
      throw err;
    }
  });

  return app;
}
