import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
// biome-ignore lint: duplicate import tolerated for readability
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runInit } from "../src/commands/init.js";

describe("deckel init", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "deckel-init-"));
    process.exitCode = 0;
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    process.exitCode = 0;
  });

  it("creates the expected .deckel/ layout", async () => {
    await runInit({ cwd: tmp, yes: true, name: "Test Project", prefix: "ENG" });
    expect(existsSync(join(tmp, ".deckel", "config.yaml"))).toBe(true);
    expect(existsSync(join(tmp, ".deckel", "sprints"))).toBe(true);
    expect(existsSync(join(tmp, ".deckel", "templates", "security-checks.yaml"))).toBe(true);
    expect(existsSync(join(tmp, ".deckel", "templates", "test-categories.yaml"))).toBe(true);
    expect(existsSync(join(tmp, ".deckel", ".trash"))).toBe(true);
    expect(existsSync(join(tmp, ".deckel", ".deckelignore"))).toBe(true);
    expect(existsSync(join(tmp, ".deckel", ".gitignore"))).toBe(true);
  });

  it("by default scaffolds a 3-task welcome sprint teaching check/claim/correction", async () => {
    await runInit({ cwd: tmp, yes: true, name: "Test", prefix: "TSK" });
    const welcomeDir = join(tmp, ".deckel", "sprints", "sprint-00-welcome");
    expect(existsSync(join(welcomeDir, "index.md"))).toBe(true);
    expect(existsSync(join(welcomeDir, "tasks", "TSK-01.md"))).toBe(true);
    expect(existsSync(join(welcomeDir, "tasks", "TSK-02.md"))).toBe(true);
    expect(existsSync(join(welcomeDir, "tasks", "TSK-03.md"))).toBe(true);

    // Each task exercises one mechanic — verify by reading the file.
    const t1 = readFileSync(join(welcomeDir, "tasks", "TSK-01.md"), "utf8");
    const t2 = readFileSync(join(welcomeDir, "tasks", "TSK-02.md"), "utf8");
    const t3 = readFileSync(join(welcomeDir, "tasks", "TSK-03.md"), "utf8");
    expect(t1).toContain("deckel check TSK-01");
    expect(t2).toContain("deckel task claim TSK-02");
    expect(t2).toContain("deckel task release TSK-02");
    expect(t3).toContain("deckel correction add TSK-03");
  });

  it("--no-demo (noDemo option) skips the welcome sprint", async () => {
    await runInit({ cwd: tmp, yes: true, name: "Test", prefix: "TSK", noDemo: true });
    expect(existsSync(join(tmp, ".deckel", "sprints", "sprint-00-welcome"))).toBe(false);
    // And sprints/ is otherwise empty
    expect(existsSync(join(tmp, ".deckel", "sprints"))).toBe(true);
  });

  it("welcome sprint has status: active so board is not empty on first run", async () => {
    await runInit({ cwd: tmp, yes: true, name: "Test", prefix: "TSK" });
    const index = readFileSync(
      join(tmp, ".deckel", "sprints", "sprint-00-welcome", "index.md"),
      "utf8",
    );
    expect(index).toContain("status: active");
    expect(index).toMatch(/task_ids:\s*\n\s*- TSK-01\s*\n\s*- TSK-02\s*\n\s*- TSK-03/);
  });

  it("writes the chosen project name and prefix into config.yaml", async () => {
    await runInit({ cwd: tmp, yes: true, name: "LMS for Coaches", prefix: "LMS" });
    const cfg = readFileSync(join(tmp, ".deckel", "config.yaml"), "utf8");
    expect(cfg).toContain('name: "LMS for Coaches"');
    expect(cfg).toContain("task_id_prefix: LMS");
  });

  it("refuses to overwrite an existing .deckel/ directory", async () => {
    await runInit({ cwd: tmp, yes: true, prefix: "TSK" });
    await runInit({ cwd: tmp, yes: true, prefix: "XXX" });
    expect(process.exitCode).toBe(1);
    const cfg = readFileSync(join(tmp, ".deckel", "config.yaml"), "utf8");
    expect(cfg).toContain("task_id_prefix: TSK");
  });

  it("uppercases the prefix and rejects invalid shapes", async () => {
    await expect(runInit({ cwd: tmp, yes: true, prefix: "1bad" })).rejects.toThrow(
      /invalid prefix/i,
    );
  });
});
