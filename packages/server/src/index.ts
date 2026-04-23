import { existsSync } from "node:fs";
import { Hono } from "hono";
import { configRoutes } from "./routes/config.js";
import { sprintRoutes } from "./routes/sprints.js";
import { taskRoutes } from "./routes/tasks.js";
import { csrfMiddleware, generateCsrfToken } from "./security/csrf.js";
import { Store } from "./storage/store.js";
import { uiHandler } from "./ui-handler.js";

export type AppOptions = {
  /** Absolute path to the .deckel/ root. If omitted, data routes return 503. */
  deckelRoot?: string;
  /** Absolute path to the built UI directory. If omitted, UI is not served. */
  uiDir?: string;
  /** CSRF token. Generated randomly if not supplied. */
  csrfToken?: string;
};

export type AppHandle = {
  app: Hono;
  csrfToken: string;
  store: Store | null;
};

export function createApp(options: AppOptions = {}): AppHandle {
  const csrfToken = options.csrfToken ?? generateCsrfToken();
  const store = options.deckelRoot ? new Store(options.deckelRoot) : null;

  const app = new Hono();

  app.get("/api/health", (c) => c.json({ ok: true, name: "deckel", version: 1 }));
  app.get("/api/token", (c) => c.json({ token: csrfToken }));

  app.use("/api/*", csrfMiddleware(csrfToken));

  if (store) {
    app.route("/api/config", configRoutes(store));
    app.route("/api/sprints", sprintRoutes(store));
    app.route("/api/sprints", taskRoutes(store));
  } else {
    app.all("/api/config", (c) => c.json({ error: "no .deckel/ found" }, 503));
    app.all("/api/sprints/*", (c) => c.json({ error: "no .deckel/ found" }, 503));
    app.all("/api/sprints", (c) => c.json({ error: "no .deckel/ found" }, 503));
  }

  if (options.uiDir && existsSync(options.uiDir)) {
    app.use("*", uiHandler({ uiDir: options.uiDir, csrfToken }));
  }

  return { app, csrfToken, store };
}

// Re-exports for consumers (CLI).
export { generateCsrfToken } from "./security/csrf.js";
export { Store, StoreError } from "./storage/store.js";
export { EtagMismatch } from "./storage/fs-adapter.js";
