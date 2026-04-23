import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
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
