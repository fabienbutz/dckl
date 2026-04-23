import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/index.js";
import type { Journey } from "../src/schema/index.js";
import { stringifyConfig } from "../src/storage/config-io.js";
import { parseJourney, stringifyJourney } from "../src/storage/journey-io.js";

const TOKEN = "test-csrf-token";

function setupdckl(): { app: ReturnType<typeof createApp>["app"]; dcklRoot: string; cleanup: () => void } {
  const tmp = mkdtempSync(join(tmpdir(), "dckl-journey-"));
  const dcklRoot = join(tmp, ".dckl");
  mkdirSync(dcklRoot, { recursive: true });
  mkdirSync(join(dcklRoot, "sprints"), { recursive: true });
  mkdirSync(join(dcklRoot, ".trash"), { recursive: true });
  writeFileSync(
    join(dcklRoot, "config.yaml"),
    stringifyConfig({
      schema: 1,
      project: { name: "T", created: "2026-04-22", version: 1 },
      ui: { port: 4321, theme: "dark" },
      task_id_prefix: "TSK",
      defaults: { security_check_template: "default", test_categories: ["unit"] },
    }),
  );
  const { app } = createApp({ dcklRoot, csrfToken: TOKEN });
  return { app, dcklRoot, cleanup: () => rmSync(tmp, { recursive: true, force: true }) };
}

describe("journey round-trip", () => {
  const sample: Journey = {
    meta: {
      schema: 1,
      id: "signup",
      name: "User Signup",
      description: "Landing → signup → verify → onboarding → dashboard",
      steps: [
        { id: "landing", label: "Landing page", route: "/", status: "done" },
        { id: "signup", label: "Signup form", route: "/signup", status: "done" },
        {
          id: "verify",
          label: "Email verification",
          route: "/verify-email",
          status: "todo",
          related_tasks: ["TSK-14"],
        },
      ],
    },
    body: "## Notes\n\nMulti-step flow.\n",
  };

  it("stringify → parse preserves the meta", () => {
    const text = stringifyJourney(sample);
    const parsed = parseJourney(text);
    expect(parsed.meta).toEqual(sample.meta);
  });

  it("parse → stringify → parse is stable", () => {
    const text1 = stringifyJourney(sample);
    const parsed1 = parseJourney(text1);
    const text2 = stringifyJourney(parsed1);
    expect(text2).toBe(text1);
  });
});

describe("journey API (POST/GET/PATCH with CSRF + ETag)", () => {
  let h: ReturnType<typeof setupdckl>;
  beforeEach(() => {
    h = setupdckl();
  });
  afterEach(() => h.cleanup());

  const createBody = {
    id: "signup",
    name: "User Signup",
    steps: [
      { id: "landing", label: "Landing", route: "/", status: "done" },
    ],
  };

  async function create(): Promise<string> {
    const res = await h.app.request("/api/journeys", {
      method: "POST",
      headers: {
        "X-dckl-Token": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createBody),
    });
    expect(res.status).toBe(201);
    const etag = res.headers.get("ETag");
    if (!etag) throw new Error("missing ETag after create");
    return etag;
  }

  it("POST creates a journey and returns its ETag", async () => {
    const etag = await create();
    expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
  });

  it("POST without CSRF token → 403", async () => {
    const res = await h.app.request("/api/journeys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createBody),
    });
    expect(res.status).toBe(403);
  });

  it("POST with invalid payload → 422", async () => {
    const res = await h.app.request("/api/journeys", {
      method: "POST",
      headers: {
        "X-dckl-Token": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "no id" }),
    });
    expect(res.status).toBe(422);
  });

  it("POST twice with same id → 409", async () => {
    await create();
    const res = await h.app.request("/api/journeys", {
      method: "POST",
      headers: {
        "X-dckl-Token": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createBody),
    });
    expect(res.status).toBe(409);
  });

  it("GET /api/journeys lists created journey", async () => {
    await create();
    const res = await h.app.request("/api/journeys");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { journeys: Array<{ id: string; name: string }> };
    expect(body.journeys).toHaveLength(1);
    expect(body.journeys[0]?.id).toBe("signup");
  });

  it("GET /api/journeys/:id returns the journey with ETag", async () => {
    await create();
    const res = await h.app.request("/api/journeys/signup");
    expect(res.status).toBe(200);
    expect(res.headers.get("ETag")).toMatch(/^"[a-f0-9]{32}"$/);
  });

  it("GET unknown id → 404", async () => {
    const res = await h.app.request("/api/journeys/does-not-exist");
    expect(res.status).toBe(404);
  });

  it("PATCH without If-Match → 428", async () => {
    await create();
    const res = await h.app.request("/api/journeys/signup", {
      method: "PATCH",
      headers: {
        "X-dckl-Token": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "new" }),
    });
    expect(res.status).toBe(428);
  });

  it("PATCH with stale If-Match → 409", async () => {
    await create();
    const res = await h.app.request("/api/journeys/signup", {
      method: "PATCH",
      headers: {
        "X-dckl-Token": TOKEN,
        "Content-Type": "application/json",
        "If-Match": '"stale-etag-never-matches"',
      },
      body: JSON.stringify({ name: "new" }),
    });
    expect(res.status).toBe(409);
  });

  it("PATCH with valid If-Match applies + returns new ETag", async () => {
    const firstEtag = await create();
    const res = await h.app.request("/api/journeys/signup", {
      method: "PATCH",
      headers: {
        "X-dckl-Token": TOKEN,
        "Content-Type": "application/json",
        "If-Match": firstEtag,
      },
      body: JSON.stringify({ name: "User Signup — revised" }),
    });
    expect(res.status).toBe(200);
    const newEtag = res.headers.get("ETag");
    expect(newEtag).toBeTruthy();
    expect(newEtag).not.toBe(firstEtag);

    const refetch = await h.app.request("/api/journeys/signup");
    const body = (await refetch.json()) as { meta: { name: string } };
    expect(body.meta.name).toBe("User Signup — revised");
  });
});
