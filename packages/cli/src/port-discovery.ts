import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

export type PortLock = {
  pid: number;
  port: number;
  token: string;
  startedAt: string;
};

export function readPortLock(portFile: string): PortLock | null {
  if (!existsSync(portFile)) return null;
  try {
    const raw = readFileSync(portFile, "utf8");
    return JSON.parse(raw) as PortLock;
  } catch {
    return null;
  }
}

/**
 * POSIX `kill(pid, 0)` probes a process without delivering a signal.
 * Returns true if the PID currently references a running process.
 */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function writePortLock(portFile: string, lock: PortLock): void {
  writeFileSync(portFile, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
}

export function releasePortLock(portFile: string): void {
  try {
    unlinkSync(portFile);
  } catch {
    // File may have been removed already (double-shutdown) — ignore.
  }
}

/**
 * Pre-bind port hint: if .port says a live PID already owns the desired port,
 * start our search one higher. Actual EADDRINUSE is still handled by the
 * listen-retry loop in serve.ts — this just avoids a guaranteed collision.
 */
export function suggestStartingPort(portFile: string | null, desired: number): number {
  if (!portFile) return desired;
  const lock = readPortLock(portFile);
  if (!lock) return desired;
  if (lock.port !== desired) return desired;
  if (isProcessAlive(lock.pid)) return desired + 1;
  return desired;
}
