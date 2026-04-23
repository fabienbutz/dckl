import { describe, expect, it } from "vitest";
import type { Task } from "../src/schema/index.js";
import { parseTask, stringifyTask } from "../src/storage/markdown.js";

describe("claim field round-trip", () => {
  const sample: Task = {
    meta: {
      schema: 1,
      id: "TSK-01",
      sprint_id: "sprint-01-demo",
      title: "x",
      type: "feature",
      status: "in_progress",
      security_checks: [],
      test_criteria: [],
      corrections: [],
      claim: {
        by: "claude-code",
        at: "2026-04-23T10:00:00.000Z",
        heartbeat: "2026-04-23T10:05:00.000Z",
      },
    },
    body: "body\n",
  };

  it("stringify → parse preserves the claim", () => {
    const s = stringifyTask(sample);
    const back = parseTask(s);
    expect(back.meta.claim).toEqual(sample.meta.claim);
  });
});
