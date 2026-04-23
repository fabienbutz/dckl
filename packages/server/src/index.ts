import { existsSync } from "node:fs";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { EventBus } from "./events/bus.js";
import { changelogRoutes } from "./routes/changelog.js";
import { configRoutes } from "./routes/config.js";
import { journeyRoutes } from "./routes/journeys.js";
import { sprintRoutes } from "./routes/sprints.js";
import { stackRoutes } from "./routes/stack.js";
import { taskRoutes } from "./routes/tasks.js";
import { templateRoutes } from "./routes/templates.js";
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
  /** When true, disables the Claude Code memory scanner entirely. For
   *  screenshare/demo contexts where `user_*.md` content could leak. */
  noMemory?: boolean;
};

export type AppHandle = {
  app: Hono;
  csrfToken: string;
  store: Store | null;
};

export function createApp(options: AppOptions = {}): AppHandle {
  const csrfToken = options.csrfToken ?? generateCsrfToken();
  const bus = new EventBus();
  const store = options.deckelRoot ? new Store(options.deckelRoot) : null;
  if (store) store.setEventBus(bus);

  const app = new Hono();

  app.get("/api/health", (c) => c.json({ ok: true, name: "deckel", version: 1 }));
  app.get("/api/token", (c) => c.json({ token: csrfToken }));

  // SSE stream of Store state changes. Registered directly (not as a
  // sub-app) because mounting eventRoutes via app.route() returned 404 for
  // GET /api/events — the interaction between streamSSE, the catch-all
  // uiHandler, and sub-app routing wasn't matching the inner "/" route.
  app.get("/api/events", (c) =>
    streamSSE(c, async (stream) => {
      const unsubscribe = bus.subscribe((event) => {
        stream.writeSSE({ event: event.kind, data: JSON.stringify(event) });
      });
      const ping = setInterval(() => {
        stream.writeSSE({ event: "ping", data: "" }).catch(() => {});
      }, 25_000);
      await stream.writeSSE({
        event: "hello",
        data: JSON.stringify({ at: new Date().toISOString() }),
      });
      // Hold the stream open in 24h chunks. Node's setTimeout is 32-bit —
      // anything over ~24.8 days silently fires immediately (1ms) and
      // closes the stream. If a client stays connected > 24h the loop
      // ticks and we keep streaming.
      while (!stream.aborted) {
        await stream.sleep(24 * 60 * 60 * 1000);
      }
      clearInterval(ping);
      unsubscribe();
    }),
  );

  app.use("/api/*", csrfMiddleware(csrfToken));

  if (store) {
    app.route("/api/config", configRoutes(store));
    app.route("/api/sprints", sprintRoutes(store));
    app.route("/api/sprints", taskRoutes(store));
    app.route("/api/templates", templateRoutes(store));
    app.route("/api/changelog", changelogRoutes(store));
    app.route("/api/journeys", journeyRoutes(store));
    app.route("/api/stack", stackRoutes(store, { noMemory: options.noMemory }));
  } else {
    const missing = (c: { json: (body: unknown, status: number) => Response }) =>
      c.json({ error: "no .deckel/ found — run `deckel init`" }, 503);
    app.all("/api/config", missing);
    app.all("/api/sprints", missing);
    app.all("/api/sprints/*", missing);
    app.all("/api/templates/*", missing);
    app.all("/api/changelog", missing);
    app.all("/api/journeys", missing);
    app.all("/api/journeys/*", missing);
    app.all("/api/stack", missing);
    app.all("/api/stack/*", missing);
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
export { isClaimFresh } from "./schema/task.js";
