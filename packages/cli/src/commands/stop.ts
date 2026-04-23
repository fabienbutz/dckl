import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { findDeckelRoot } from "@deckel/server/storage";
import { isProcessAlive, readPortLock } from "../port-discovery.js";

export type StopOptions = {
  force?: boolean;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 2_000;
const POLL_INTERVAL_MS = 100;

/**
 * Gracefully shuts down the running deckel server by signalling the PID
 * in .deckel/.port and waiting for it to exit. Cleans up stale .port
 * files when the PID is already dead.
 */
export async function runStop(opts: StopOptions = {}): Promise<void> {
  const deckelRoot = findDeckelRoot(process.cwd());
  if (!deckelRoot) {
    console.error("[deckel stop] no .deckel/ found in this tree");
    process.exitCode = 1;
    return;
  }

  const portFile = join(deckelRoot, ".port");
  const lock = readPortLock(portFile);
  if (!lock) {
    console.log("[deckel stop] nothing to stop — no .port file");
    return;
  }

  if (!isProcessAlive(lock.pid)) {
    tryUnlink(portFile);
    console.log(
      `[deckel stop] removed stale .port (pid ${lock.pid} was not running)`,
    );
    return;
  }

  // PID is alive — graceful SIGTERM. The serve.ts shutdown() handler
  // catches SIGTERM, closes the http.Server, and calls releasePortLock.
  try {
    process.kill(lock.pid, "SIGTERM");
  } catch (err) {
    console.error(`[deckel stop] failed to signal pid ${lock.pid}: ${(err as Error).message}`);
    process.exitCode = 1;
    return;
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessAlive(lock.pid)) {
      tryUnlink(portFile);
      console.log(
        `[deckel stop] stopped (pid ${lock.pid}, port ${lock.port})`,
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
        `[deckel stop] SIGKILL failed for pid ${lock.pid}: ${(err as Error).message}`,
      );
      process.exitCode = 1;
      return;
    }
    // After SIGKILL, the graceful shutdown handler never runs — we clean up
    // .port ourselves.
    tryUnlink(portFile);
    console.log(`[deckel stop] force-killed pid ${lock.pid}`);
    return;
  }

  console.error(
    `[deckel stop] pid ${lock.pid} did not exit after ${timeoutMs}ms. Retry with --force to escalate to SIGKILL.`,
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
