import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/index.js";
import { stringifyConfig } from "../src/storage/config-io.js";
import { stringifySprint, stringifyTask } from "../src/storage/markdown.js";

const TOKEN = "test-csrf-token";

type Harness = {
  app: ReturnType<typeof createApp>["app"];
  dcklRoot: string;
  cleanup: () => void;
};

function setupdckl(): Harness {
  const tmp = mkdtempSync(join(tmpdir(), "dckl-api-"));
  const dcklRoot = join(tmp, ".dckl");
  mkdirSync(dcklRoot, { recursive: true });
  mkdirSync(join(dcklRoot, "sprints", "sprint-01", "tasks"), { recursive: true });
  mkdirSync(join(dcklRoot, ".trash"), { recursive: true });

  writeFileSync(
    join(dcklRoot, "config.yaml"),
    stringifyConfig({
      schema: 1,
      project: { name: "Test Project", created: "2026-04-22", version: 1 },
      ui: { port: 4321, theme: "dark" },
      task_id_prefix: "TSK",
      defaults: { security_check_template: "default", test_categories: ["unit"] },
    }),
  );

  writeFileSync(
    join(dcklRoot, "sprints", "sprint-01", "index.md"),
    stringifySprint({
      meta: {
        schema: 1,
        id: "sprint-01",
        name: "Foundation",
        goal: "Scaffold",
        status: "active",
        start: "2026-04-22",
        end: "2026-05-06",
        based_on: null,
        task_ids: ["TSK-1"],
      },
      body: "## Foundation\n",
    }),
  );

  writeFileSync(
    join(dcklRoot, "sprints", "sprint-01", "tasks", "TSK-1.md"),
    stringifyTask({
      meta: {
        schema: 1,
        id: "TSK-1",
        sprint_id: "sprint-01",
        title: "First task",
        type: "feature",
        status: "todo",
        security_checks: [{ id: "gdpr-storage", checked: false }],
        test_criteria: [{ id: "t1", label: "Unit test", checked: false }],
        corrections: [],
      },
      body: "## TSK-1\n",
    }),
  );

  const { app } = createApp({ dcklRoot, csrfToken: TOKEN });
  return { app, dcklRoot, cleanup: () => rmSync(tmp, { recursive: true, force: true }) };
}

describe("GET /api/config", () => {
  let h: Harness;
  beforeEach(() => {
    h = setupdckl();
  });
  afterEach(() => h.cleanup());

  it("returns parsed config with ETag header", async () => {
    const res = await h.app.request("/api/config");
    expect(res.status).toBe(200);
    expect(res.headers.get("ETag")).toMatch(/^"[a-f0-9]{32}"$/);
    const body = (await res.json()) as { project: { name: string } };
    expect(body.project.name).toBe("Test Project");
  });
});

describe("GET /api/sprints", () => {
  let h: Harness;
  beforeEach(() => {
    h = setupdckl();
  });
  afterEach(() => h.cleanup());

  it("lists sprints", async () => {
    const res = await h.app.request("/api/sprints");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { sprints: Array<{ id: string }> };
    expect(body.sprints).toHaveLength(1);
    expect(body.sprints[0]?.id).toBe("sprint-01");
  });

  it("returns a single sprint with its ETag", async () => {
    const res = await h.app.request("/api/sprints/sprint-01");
    expect(res.status).toBe(200);
    expect(res.headers.get("ETag")).toMatch(/^"[a-f0-9]{32}"$/);
  });

  it("404s unknown sprint", async () => {
    const res = await h.app.request("/api/sprints/sprint-nope");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/sprints/:sid/tasks/:tid (ETag + CSRF)", () => {
  let h: Harness;
  beforeEach(() => {
    h = setupdckl();
  });
  afterEach(() => h.cleanup());

  async function readTaskEtag(): Promise<string> {
    const res = await h.app.request("/api/sprints/sprint-01/tasks/TSK-1");
    expect(res.status).toBe(200);
    const tag = res.headers.get("ETag");
    if (!tag) throw new Error("missing ETag");
    return tag;
  }

  it("rejects write without CSRF token", async () => {
    const etag = await readTaskEtag();
    const res = await h.app.request("/api/sprints/sprint-01/tasks/TSK-1", {
      method: "PATCH",
      headers: { "If-Match": etag, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });
    expect(res.status).toBe(403);
  });

  it("rejects write without If-Match header", async () => {
    const res = await h.app.request("/api/sprints/sprint-01/tasks/TSK-1", {
      method: "PATCH",
      headers: {
        "X-dckl-Token": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "in_progress" }),
    });
    expect(res.status).toBe(428);
  });

  it("rejects write with stale ETag (409)", async () => {
    const res = await h.app.request("/api/sprints/sprint-01/tasks/TSK-1", {
      method: "PATCH",
      headers: {
        "X-dckl-Token": TOKEN,
        "If-Match": '"stale-etag-value-never-matches-anything"',
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "in_progress" }),
    });
    expect(res.status).toBe(409);
  });

  it("accepts valid patch, returns new ETag, persists change", async () => {
    const etag = await readTaskEtag();
    const res = await h.app.request("/api/sprints/sprint-01/tasks/TSK-1", {
      method: "PATCH",
      headers: {
        "X-dckl-Token": TOKEN,
        "If-Match": etag,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "in_progress" }),
    });
    expect(res.status).toBe(200);
    const newEtag = res.headers.get("ETag");
    expect(newEtag).toBeTruthy();
    expect(newEtag).not.toBe(etag);

    const refetch = await h.app.request("/api/sprints/sprint-01/tasks/TSK-1");
    const body = (await refetch.json()) as { meta: { status: string } };
    expect(body.meta.status).toBe("in_progress");
  });

  it("rejects rogue origin header", async () => {
    const etag = await readTaskEtag();
    const res = await h.app.request("/api/sprints/sprint-01/tasks/TSK-1", {
      method: "PATCH",
      headers: {
        "X-dckl-Token": TOKEN,
        "If-Match": etag,
        "Content-Type": "application/json",
        Origin: "https://evil.example.com",
      },
      body: JSON.stringify({ status: "in_progress" }),
    });
    expect(res.status).toBe(403);
  });

  it("accepts localhost origin", async () => {
    const etag = await readTaskEtag();
    const res = await h.app.request("/api/sprints/sprint-01/tasks/TSK-1", {
      method: "PATCH",
      headers: {
        "X-dckl-Token": TOKEN,
        "If-Match": etag,
        "Content-Type": "application/json",
        Origin: "http://localhost:4321",
      },
      body: JSON.stringify({ status: "in_progress" }),
    });
    expect(res.status).toBe(200);
  });
});
