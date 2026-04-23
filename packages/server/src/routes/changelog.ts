import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Hono } from "hono";
import { etag } from "../storage/etag.js";
import type { Store } from "../storage/store.js";

export function changelogRoutes(store: Store): Hono {
  const app = new Hono();

  // Returns the raw markdown content of .dckl/CHANGELOG.md. UI parses it.
  // Returns an empty string when the file does not yet exist — this happens
  // in a fresh `dckl init` before any patch has fired, and UI should show
  // an empty state rather than an error.
  app.get("/", async (c) => {
    const path = join(store.paths.root, "CHANGELOG.md");
    if (!existsSync(path)) {
      return c.json({ content: "" });
    }
    const content = await readFile(path, "utf8");
    c.header("ETag", etag(content));
    return c.json({ content });
  });

  return app;
}
