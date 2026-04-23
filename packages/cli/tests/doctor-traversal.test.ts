import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runDoctor } from "../src/commands/doctor.js";

const CONFIG = `schema: 1
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

describe("doctor — path traversal hardening", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "dckl-trav-"));
    mkdirSync(join(tmp, ".dckl", "sprints"), { recursive: true });
    writeFileSync(join(tmp, ".dckl", "config.yaml"), CONFIG);
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("rejects a .active-task with path-traversal in sprint_id", async () => {
    writeFileSync(
      join(tmp, ".dckl", ".active-task"),
      JSON.stringify({ sprint_id: "../../../etc/passwd", task_id: "TSK-01" }),
    );
    const { findings } = await runDoctor({ cwd: tmp, silent: true });
    const f = findings.find((x) => x.code === "active-task-malformed");
    expect(f).toBeDefined();
    expect(f?.message).toMatch(/unsafe/i);
  });

  it("rejects a .active-task with slashes in task_id", async () => {
    writeFileSync(
      join(tmp, ".dckl", ".active-task"),
      JSON.stringify({ sprint_id: "sprint-01", task_id: "../../secrets" }),
    );
    const { findings } = await runDoctor({ cwd: tmp, silent: true });
    expect(findings.find((x) => x.code === "active-task-malformed")).toBeDefined();
  });

  it("rejects non-string values (boolean, number) in .active-task", async () => {
    writeFileSync(
      join(tmp, ".dckl", ".active-task"),
      JSON.stringify({ sprint_id: 42, task_id: true }),
    );
    const { findings } = await runDoctor({ cwd: tmp, silent: true });
    expect(findings.find((x) => x.code === "active-task-malformed")).toBeDefined();
  });
});
