import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runStop } from "../src/commands/stop.js";

function writeLock(dir: string, pid: number, port = 4321): void {
  writeFileSync(
    join(dir, ".dckl", ".port"),
    JSON.stringify(
      { pid, port, token: "t", startedAt: "2026-04-23T00:00:00.000Z" },
      null,
      2,
    ),
  );
}

describe("dckl stop", () => {
  let tmp: string;
  let prevCwd: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "dckl-stop-"));
    // Need a .dckl/ layout so findDcklRoot succeeds.
    const dckl = join(tmp, ".dckl");
    readdirSync(tmp); // ensure dir exists
    require("node:fs").mkdirSync(dckl, { recursive: true });
    prevCwd = process.cwd();
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(prevCwd);
    rmSync(tmp, { recursive: true, force: true });
  });

  // Acceptance: stop-no-server ───────────────────────────────────────────

  it("reports 'nothing to stop' when .port is absent and exits cleanly", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    process.exitCode = 0;
    await runStop({});
    expect(process.exitCode).toBe(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("nothing to stop"));
    log.mockRestore();
  });

  // Acceptance: stop-stale ───────────────────────────────────────────────

  it("removes a .port pointing at a dead PID without signaling", async () => {
    writeLock(tmp, 999_999_999); // effectively dead
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    process.exitCode = 0;
    await runStop({});
    expect(process.exitCode).toBe(0);
    expect(existsSync(join(tmp, ".dckl", ".port"))).toBe(false);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("stale"));
    log.mockRestore();
  });

  // Acceptance: stop-graceful ────────────────────────────────────────────

  it("signals an alive PID with SIGTERM and cleans up when it exits", async () => {
    // Spawn a long-running node process that installs a SIGTERM handler
    // which mirrors our serve.ts: on signal, delete .port and exit.
    const portFile = join(tmp, ".dckl", ".port");
    const child = spawn(
      process.execPath,
      [
        "-e",
        `process.on("SIGTERM", () => { try { require("fs").unlinkSync(${JSON.stringify(portFile)}); } catch {} process.exit(0); });
         setInterval(() => {}, 1000);`,
      ],
      { stdio: "ignore" },
    );
    await new Promise((r) => setTimeout(r, 150));
    writeLock(tmp, child.pid ?? 0);

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    process.exitCode = 0;
    await runStop({ timeoutMs: 2000 });
    expect(process.exitCode).toBe(0);
    expect(existsSync(portFile)).toBe(false);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("stopped"));
    log.mockRestore();
  });

  // Acceptance: stop-force ───────────────────────────────────────────────

  it("escalates to SIGKILL with --force when SIGTERM is ignored", async () => {
    const portFile = join(tmp, ".dckl", ".port");
    // Child that ignores SIGTERM entirely.
    const child = spawn(
      process.execPath,
      [
        "-e",
        `process.on("SIGTERM", () => {}); setInterval(() => {}, 1000);`,
      ],
      { stdio: "ignore" },
    );
    await new Promise((r) => setTimeout(r, 150));
    writeLock(tmp, child.pid ?? 0);

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    process.exitCode = 0;
    await runStop({ force: true, timeoutMs: 400 });
    expect(process.exitCode).toBe(0);
    expect(existsSync(portFile)).toBe(false);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("force-killed"));
    log.mockRestore();

    // Belt-and-suspenders — make sure the child is really gone so it
    // doesn't leak across tests. We don't assert on child.killed because
    // Node only sets that when the child was killed via child.kill(), not
    // when signalled directly via process.kill(pid).
    try {
      process.kill(child.pid ?? 0, "SIGKILL");
    } catch {}
  });

  it("exits 1 when SIGTERM is ignored and --force is not set", async () => {
    const portFile = join(tmp, ".dckl", ".port");
    const child = spawn(
      process.execPath,
      [
        "-e",
        `process.on("SIGTERM", () => {}); setInterval(() => {}, 1000);`,
      ],
      { stdio: "ignore" },
    );
    await new Promise((r) => setTimeout(r, 150));
    writeLock(tmp, child.pid ?? 0);

    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    process.exitCode = 0;
    await runStop({ timeoutMs: 300 });
    expect(process.exitCode).toBe(1);
    expect(err).toHaveBeenCalledWith(expect.stringContaining("did not exit"));
    err.mockRestore();

    // Tidy up the zombie child manually so it doesn't leak across tests.
    try {
      process.kill(child.pid ?? 0, "SIGKILL");
    } catch {}
    // .port was not removed (exit 1 means no cleanup from our side)
    expect(existsSync(portFile)).toBe(true);
  });
});
