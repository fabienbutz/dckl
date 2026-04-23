import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Hono } from "hono";
import { etag } from "../storage/etag.js";
import { resolveMemoryPath, scanMemory } from "../storage/memory-reader.js";
import {
  type StackEntry,
  isStackFileAllowed,
  scanStack,
} from "../storage/stack-scanner.js";
import type { Store } from "../storage/store.js";

export type StackRoutesOptions = {
  /** When true, the Claude Code memory scanner is disabled entirely —
   *  useful for screenshare/demo contexts where user_*.md could leak. */
  noMemory?: boolean;
};

export function stackRoutes(store: Store, options: StackRoutesOptions = {}): Hono {
  const app = new Hono();

  // `.dckl/` lives inside the project root. Walk up one level to reach
  // the project root that scanStack expects.
  const projectRoot = resolve(store.paths.root, "..");

  const buildInventory = () => {
    const base = scanStack(projectRoot);
    const memoryEntries: StackEntry[] = options.noMemory
      ? []
      : scanMemory(projectRoot);
    return {
      projectRoot: base.projectRoot,
      entries: [...base.entries, ...memoryEntries],
    };
  };

  app.get("/", (c) => {
    return c.json(buildInventory());
  });

  app.get("/file", async (c) => {
    const requested = c.req.query("path");
    if (!requested) {
      return c.json({ error: "?path=<relative-path> is required" }, 400);
    }

    // Memory files: resolved via the memory-specific pathway. Always
    // validated against the memory dir, never persisted to .dckl/.
    if (requested.startsWith("memory://")) {
      if (options.noMemory) {
        return c.json({ error: "memory scanner disabled (--no-memory)" }, 403);
      }
      const absolute = resolveMemoryPath(projectRoot, requested);
      if (!absolute) {
        return c.json({ error: `invalid memory path "${requested}"` }, 403);
      }
      // Double-check this path is in the current scan (allowlist).
      const memoryEntries = scanMemory(projectRoot);
      if (!memoryEntries.some((e) => e.path === requested)) {
        return c.json({ error: "memory file not in current scan" }, 403);
      }
      try {
        const content = await readFile(absolute, "utf8");
        c.header("ETag", etag(content));
        c.header("Content-Type", "text/plain; charset=utf-8");
        // Memory is user-private. Make absolutely sure caches don't hold on
        // to it (client or intermediary).
        c.header("Cache-Control", "no-store");
        return c.body(content);
      } catch (err) {
        return c.json(
          { error: `failed to read memory: ${(err as Error).message}` },
          500,
        );
      }
    }

    // Project files: existing allowlist pathway.
    const inventory = scanStack(projectRoot);
    const absolute = isStackFileAllowed(inventory, requested);
    if (!absolute) {
      return c.json(
        { error: `path "${requested}" is not in the stack allowlist` },
        403,
      );
    }
    try {
      const content = await readFile(absolute, "utf8");
      c.header("ETag", etag(content));
      c.header("Content-Type", "text/plain; charset=utf-8");
      return c.body(content);
    } catch (err) {
      return c.json(
        { error: `failed to read ${requested}: ${(err as Error).message}` },
        500,
      );
    }
  });

  return app;
}
