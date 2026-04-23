import { resolve } from "node:path";
import { Hono } from "hono";
import { scanRoutes } from "../storage/route-scanner.js";
import type { Store } from "../storage/store.js";

type PagesConfig = {
  pages?: {
    roots?: string[];
    page_file?: string[];
  };
};

export function pagesRoutes(store: Store): Hono {
  const app = new Hono();

  app.get("/", async (c) => {
    const projectRoot = resolve(store.paths.root, "..");
    let override: PagesConfig["pages"];
    try {
      const { config } = await store.getConfig();
      override = (config as unknown as PagesConfig).pages;
    } catch {
      // config unreadable — fall through to auto-detection
    }
    const result = scanRoutes({
      projectRoot,
      roots: override?.roots,
      pageFile: override?.page_file,
    });
    return c.json(result);
  });

  return app;
}
