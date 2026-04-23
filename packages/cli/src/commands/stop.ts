import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { findDcklRoot } from "@dckl/server/storage";
import { isProcessAlive, readPortLock } from "../port-discovery.js";

export type StopOptions = {
  force?: boolean;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 2_000;
const POLL_INTERVAL_MS = 100;

/**
 * Gracefully shuts down the running dckl server by signalling the PID
 * in .dckl/.port and waiting for it to exit. Cleans up stale .port
 * files when the PID is already dead.
 */
export async function runStop(opts: StopOptions = {}): Promise<void> {
  const dcklRoot = findDcklRoot(process.cwd());
  if (!dcklRoot) {
    console.error("[dckl stop] no .dckl/ found in this tree");
    process.exitCode = 1;
    return;
  }

  const portFile = join(dcklRoot, ".port");
  const lock = readPortLock(portFile);
  if (!lock) {
    console.log("[dckl stop] nothing to stop — no .port file");
    return;
  }

  if (!isProcessAlive(lock.pid)) {
    tryUnlink(portFile);
    console.log(
      `[dckl stop] removed stale .port (pid ${lock.pid} was not running)`,
    );
    return;
  }

  // PID is alive — graceful SIGTERM. The serve.ts shutdown() handler
  // catches SIGTERM, closes the http.Server, and calls releasePortLock.
  try {
    process.kill(lock.pid, "SIGTERM");
  } catch (err) {
    console.error(`[dckl stop] failed to signal pid ${lock.pid}: ${(err as Error).message}`);
    process.exitCode = 1;
    return;
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessAlive(lock.pid)) {
      tryUnlink(portFile);
      console.log(
        `[dckl stop] stopped (pid ${lock.pid}, port ${lock.port})`,
      );
      return;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  // Did not exit in time.
  if (opts.force) {
    try {
      process.kill(lock.pid, "SIGKILL");
    } catch (err) {
      console.error(
        `[dckl stop] SIGKILL failed for pid ${lock.pid}: ${(err as Error).message}`,
      );
      process.exitCode = 1;
      return;
    }
    // After SIGKILL, the graceful shutdown handler never runs — we clean up
    // .port ourselves.
    tryUnlink(portFile);
    console.log(`[dckl stop] force-killed pid ${lock.pid}`);
    return;
  }

  console.error(
    `[dckl stop] pid ${lock.pid} did not exit after ${timeoutMs}ms. Retry with --force to escalate to SIGKILL.`,
  );
  process.exitCode = 1;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tryUnlink(path: string): void {
  if (!existsSync(path)) return;
  try {
    unlinkSync(path);
  } catch {
    // Best-effort — stale .port is less harmful than a failed cleanup.
  }
}
