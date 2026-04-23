import { describe, expect, it } from "vitest";
import { createApp } from "../src/index.js";

describe("GET /api/health", () => {
  it("returns ok:true with name and version", async () => {
    const { app } = createApp();
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; name: string; version: number };
    expect(body).toEqual({ ok: true, name: "deckel", version: 1 });
  });

  it("GET /api/token returns the generated token", async () => {
    const { app, csrfToken } = createApp({ csrfToken: "fixed-test-token" });
    const res = await app.request("/api/token");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string };
    expect(body.token).toBe(csrfToken);
    expect(body.token).toBe("fixed-test-token");
  });
});
