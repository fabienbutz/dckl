import { describe, expect, it } from "vitest";
import type { Sprint, Task } from "../src/schema/index.js";
import { parseSprint, parseTask, stringifySprint, stringifyTask } from "../src/storage/markdown.js";

const SAMPLE_SPRINT: Sprint = {
  meta: {
    schema: 1,
    id: "sprint-02",
    name: "Auth & Passkey Setup",
    goal: "Login mit Passkey und 2FA-Fallback verfügbar",
    status: "active",
    start: "2026-04-22",
    end: "2026-05-06",
    based_on: null,
    task_ids: ["TSK-12", "TSK-13"],
  },
  body: "## Sprint 02\n\nGoal details here.\n",
};

const SAMPLE_TASK: Task = {
  meta: {
    schema: 1,
    id: "TSK-12",
    sprint_id: "sprint-02",
    title: "Passkey-Registrierung bei Signup",
    type: "feature",
    status: "in_progress",
    security_checks: [
      { id: "gdpr-storage", checked: true },
      { id: "passkey-support", checked: true },
      { id: "rate-limiting", checked: false },
    ],
    test_criteria: [
      { id: "t1", label: "Unit: Passkey-Registration-Flow", checked: true },
      { id: "t2", label: "Integration: End-to-End", checked: false },
    ],
    corrections: [
      { id: "c1", text: "WebAuthn-Fehler bei Firefox Linux", open: true, target_sprint: null },
    ],
  },
  body: "## Task TSK-12\n\nUser can register a passkey.\n",
};

describe("sprint round-trip", () => {
  it("stringify → parse yields the same meta", () => {
    const text = stringifySprint(SAMPLE_SPRINT);
    const parsed = parseSprint(text);
    expect(parsed.meta).toEqual(SAMPLE_SPRINT.meta);
  });

  it("parse → stringify → parse is stable", () => {
    const text1 = stringifySprint(SAMPLE_SPRINT);
    const parsed1 = parseSprint(text1);
    const text2 = stringifySprint(parsed1);
    expect(text2).toBe(text1);
  });

  it("preserves the markdown body", () => {
    const text = stringifySprint(SAMPLE_SPRINT);
    const parsed = parseSprint(text);
    expect(parsed.body.trim()).toBe(SAMPLE_SPRINT.body.trim());
  });
});

describe("task round-trip", () => {
  it("stringify → parse yields the same meta", () => {
    const text = stringifyTask(SAMPLE_TASK);
    const parsed = parseTask(text);
    expect(parsed.meta).toEqual(SAMPLE_TASK.meta);
  });

  it("parse → stringify → parse is stable", () => {
    const text1 = stringifyTask(SAMPLE_TASK);
    const parsed1 = parseTask(text1);
    const text2 = stringifyTask(parsed1);
    expect(text2).toBe(text1);
  });

  it("rejects frontmatter with an invalid status", () => {
    const invalid = stringifyTask({
      ...SAMPLE_TASK,
      meta: { ...SAMPLE_TASK.meta, status: "bogus" as never },
    });
    expect(() => parseTask(invalid)).toThrow();
  });

  it("rejects frontmatter with the wrong schema version", () => {
    const invalid = stringifyTask({
      ...SAMPLE_TASK,
      meta: { ...SAMPLE_TASK.meta, schema: 99 as never },
    });
    expect(() => parseTask(invalid)).toThrow();
  });
});
