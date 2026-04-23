import { existsSync } from "node:fs";
import type { Server } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "@deckel/server";
import { findDeckelRoot } from "@deckel/server/storage";
import { serve } from "@hono/node-server";
import type { Hono } from "hono";
import { releasePortLock, suggestStartingPort, writePortLock } from "../port-discovery.js";

export type ServeOptions = {
  port?: number;
  noMemory?: boolean;
};

const DEFAULT_PORT = 4321;
const MAX_PORT_ATTEMPTS = 20;

export async function runServe(options: ServeOptions = {}): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const uiDir = resolve(here, "ui");

  if (!existsSync(uiDir)) {
    console.warn(`[deckel] UI assets not found at ${uiDir} — API-only mode.`);
  }

  const deckelRoot = findDeckelRoot(process.cwd());
  if (!deckelRoot) {
    console.warn("[deckel] No .deckel/ found — run `deckel init` to scaffold one.");
  }

  const portFile = deckelRoot ? join(deckelRoot, ".port") : null;
  const startPort = suggestStartingPort(portFile, options.port ?? DEFAULT_PORT);

  const { app, csrfToken } = createApp({
    uiDir: existsSync(uiDir) ? uiDir : undefined,
    deckelRoot: deckelRoot ?? undefined,
    noMemory: options.noMemory,
  });

  const { server, port } = await listenWithRetry(app, startPort, MAX_PORT_ATTEMPTS);

  if (portFile) {
    writePortLock(portFile, {
      pid: process.pid,
      port,
      token: csrfToken,
      startedAt: new Date().toISOString(),
    });
  }

  const shutdown = () => {
    if (portFile) releasePortLock(portFile);
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(`deckel listening on http://localhost:${port}`);
  console.log(`  token: ${csrfToken}`);
  if (options.noMemory) {
    console.log("  memory scanner: disabled (--no-memory)");
  }
}

function listenWithRetry(
  app: Hono,
  startPort: number,
  attempts: number,
): Promise<{ server: Server; port: number }> {
  return new Promise((fulfill, reject) => {
    const tryPort = (port: number, remaining: number) => {
      const server = serve({ fetch: app.fetch, port }, (info) => {
        fulfill({ server: server as unknown as Server, port: info.port });
      });
      server.once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE" && remaining > 1) {
          tryPort(port + 1, remaining - 1);
        } else {
          reject(err);
        }
      });
    };
    tryPort(startPort, attempts);
  });
}
