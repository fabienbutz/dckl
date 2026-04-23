import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runDoctor } from "../src/commands/doctor.js";

const MIN_CONFIG = `schema: 1
project:
  name: "Test"
  created: 2026-04-22
  version: 1
ui:
  port: 4321
  theme: dark
task_id_prefix: TSK
defaults:
  security_check_template: default
  test_categories:
    - unit
`;

const MIN_SPRINT = `---
schema: 1
id: sprint-01
name: Test sprint
goal: test
status: active
start: 2026-04-22
end: 2026-05-06
based_on: null
task_ids:
  - TSK-01
---

## Test sprint
`;

const MIN_TASK = `---
schema: 1
id: TSK-01
sprint_id: sprint-01
title: A task
type: feature
status: todo
security_checks: []
test_criteria: []
corrections: []
---

## TSK-01
`;

function scaffold(tmp: string, withTaskFile = true): void {
  const deckel = join(tmp, ".deckel");
  mkdirSync(join(deckel, "sprints", "sprint-01", "tasks"), { recursive: true });
  writeFileSync(join(deckel, "config.yaml"), MIN_CONFIG);
  writeFileSync(join(deckel, "sprints", "sprint-01", "index.md"), MIN_SPRINT);
  if (withTaskFile) {
    writeFileSync(join(deckel, "sprints", "sprint-01", "tasks", "TSK-01.md"), MIN_TASK);
  }
}

function installHook(tmp: string): void {
  const path = join(tmp, ".claude");
  mkdirSync(path, { recursive: true });
  mkdirSync(join(path, "skills", "deckel"), { recursive: true });
  writeFileSync(join(path, "skills", "deckel", "SKILL.md"), "---\nname: deckel\ndescription: x\n---\n");
  writeFileSync(
    join(path, "settings.json"),
    JSON.stringify({
      hooks: {
        PostToolUse: [
          {
            matcher: "Write|Edit|Bash",
            hooks: [{ type: "command", command: "pnpm deckel heartbeat --silent" }],
          },
        ],
      },
    }),
  );
}

describe("deckel doctor", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "deckel-doctor-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  // Acceptance: exit-codes ────────────────────────────────────────────────

  it("exits 0 on a clean project", async () => {
    scaffold(tmp);
    installHook(tmp);
    const { code, findings } = await runDoctor({ cwd: tmp, silent: true });
    expect(findings.some((f) => f.severity === "error")).toBe(false);
    expect(findings.some((f) => f.severity === "warn")).toBe(false);
    expect(code).toBe(0);
  });

  it("exits 1 when only warnings are present (no hook)", async () => {
    scaffold(tmp);
    // Intentionally do NOT installHook — expect a warn for the missing hook.
    const { code, findings } = await runDoctor({ cwd: tmp, silent: true });
    expect(findings.find((f) => f.code === "no-claude-settings")).toBeDefined();
    expect(findings.some((f) => f.severity === "error")).toBe(false);
    expect(code).toBe(1);
  });

  it("exits 2 when errors are present (missing task file)", async () => {
    scaffold(tmp, false); // sprint references TSK-01 but no task file
    installHook(tmp);
    const { code, findings } = await runDoctor({ cwd: tmp, silent: true });
    expect(findings.find((f) => f.code === "missing-task-file")).toBeDefined();
    expect(code).toBe(2);
  });

  // Acceptance: detects-missing ───────────────────────────────────────────

  it("detects missing .deckel/ directory", async () => {
    // tmp has no .deckel/ at all
    const { code, findings } = await runDoctor({ cwd: tmp, silent: true });
    expect(findings[0]?.code).toBe("missing-deckel");
    expect(code).toBe(2);
  });

  it("detects malformed task frontmatter", async () => {
    scaffold(tmp, false);
    installHook(tmp);
    writeFileSync(
      join(tmp, ".deckel", "sprints", "sprint-01", "tasks", "TSK-01.md"),
      "---\nschema: 999\nid: TSK-01\n---\n", // wrong schema version → Valibot fails
    );
    const { findings } = await runDoctor({ cwd: tmp, silent: true });
    expect(findings.find((f) => f.code === "task-invalid")).toBeDefined();
  });

  // Acceptance: detects-orphan ────────────────────────────────────────────

  it("detects an orphan task file (on disk but not in task_ids)", async () => {
    scaffold(tmp);
    installHook(tmp);
    writeFileSync(
      join(tmp, ".deckel", "sprints", "sprint-01", "tasks", "TSK-99.md"),
      MIN_TASK.replace("TSK-01", "TSK-99"),
    );
    const { findings } = await runDoctor({ cwd: tmp, silent: true });
    expect(findings.find((f) => f.code === "orphan-task-file")).toBeDefined();
  });

  it("detects an orphan .active-task pointer (valid format, missing file)", async () => {
    scaffold(tmp);
    installHook(tmp);
    writeFileSync(
      join(tmp, ".deckel", ".active-task"),
      JSON.stringify({ sprint_id: "sprint-01", task_id: "TSK-99" }),
    );
    const { findings } = await runDoctor({ cwd: tmp, silent: true });
    expect(findings.find((f) => f.code === "active-task-orphan")).toBeDefined();
  });

  // Acceptance: detects-stale-claim ───────────────────────────────────────

  it("detects a claim whose heartbeat is > 24h old", async () => {
    scaffold(tmp);
    installHook(tmp);
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    writeFileSync(
      join(tmp, ".deckel", "sprints", "sprint-01", "tasks", "TSK-01.md"),
      `---
schema: 1
id: TSK-01
sprint_id: sprint-01
title: A task
type: feature
status: in_progress
security_checks: []
test_criteria: []
corrections: []
claim:
  by: claude-code
  at: "${twoDaysAgo}"
  heartbeat: "${twoDaysAgo}"
---

## TSK-01
`,
    );
    const { findings } = await runDoctor({ cwd: tmp, silent: true });
    expect(findings.find((f) => f.code === "stale-claim")).toBeDefined();
  });

  // Acceptance: detects-hook ──────────────────────────────────────────────

  it("detects when the heartbeat hook is missing from settings.json", async () => {
    scaffold(tmp);
    const dir = join(tmp, ".claude");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "settings.json"), JSON.stringify({ hooks: { PostToolUse: [] } }));
    mkdirSync(join(dir, "skills", "deckel"), { recursive: true });
    writeFileSync(join(dir, "skills", "deckel", "SKILL.md"), "---\nname: deckel\n---\n");
    const { findings } = await runDoctor({ cwd: tmp, silent: true });
    expect(findings.find((f) => f.code === "hook-not-installed")).toBeDefined();
  });
});
