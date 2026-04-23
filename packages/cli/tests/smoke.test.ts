import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const cliBundle = resolve(here, "..", "dist", "cli.js");
const TEST_PORT = 4329;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function waitForHealthy(url: string, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`server did not become healthy within ${timeoutMs}ms: ${String(lastError)}`);
}

describe("CLI smoke test", () => {
  let child: ChildProcess;

  beforeAll(async () => {
    if (!existsSync(cliBundle)) {
      throw new Error(
        `CLI bundle not found at ${cliBundle} — run 'pnpm --filter @dckl/cli build' first`,
      );
    }
    child = spawn("node", [cliBundle, "serve", "--port", String(TEST_PORT)], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });
    await waitForHealthy(BASE_URL);
  });

  afterAll(() => {
    if (child && !child.killed) {
      child.kill("SIGTERM");
    }
  });

  it("GET /api/health returns ok envelope", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; name: string; version: number };
    expect(body).toEqual({ ok: true, name: "dckl", version: 1 });
  });

  it("GET / returns the UI index.html", async () => {
    const res = await fetch(`${BASE_URL}/`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("<!doctype html>");
    expect(text).toContain('id="root"');
  });

  it("unknown path falls back to SPA index", async () => {
    const res = await fetch(`${BASE_URL}/sprints/sprint-01`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('id="root"');
  });
});
