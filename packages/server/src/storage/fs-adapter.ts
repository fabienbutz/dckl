import { existsSync, mkdirSync } from "node:fs";
import { cp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import lockfile from "proper-lockfile";
import { etag } from "./etag.js";

export type ReadResult = {
  content: string;
  etag: string;
};

/** Reads a UTF-8 file and returns its content plus ETag. */
export async function readWithEtag(path: string): Promise<ReadResult> {
  const content = await readFile(path, "utf8");
  return { content, etag: etag(content) };
}

export type WriteOptions = {
  /**
   * If set, the write is rejected unless the current on-disk ETag matches.
   * Implements optimistic locking against parallel edits (UI + Claude Code).
   */
  ifMatch?: string;
  /** Directory (absolute) where .trash/ lives. Required for backups. */
  trashDir: string;
  /** Maximum number of backup generations per file. Defaults to 10. */
  keepVersions?: number;
};

export class EtagMismatch extends Error {
  constructor(
    public readonly expected: string,
    public readonly actual: string,
  ) {
    super(`ETag mismatch: expected ${expected}, got ${actual}`);
    this.name = "EtagMismatch";
  }
}

/**
 * Writes `content` to `path` atomically: takes a file lock, backs up the
 * existing file into .trash/, writes to a tempfile, renames. If `ifMatch` is
 * supplied and the current on-disk ETag differs, throws EtagMismatch.
 */
export async function writeAtomic(
  path: string,
  content: string,
  opts: WriteOptions,
): Promise<string> {
  const absPath = resolve(path);
  mkdirSync(dirname(absPath), { recursive: true });

  // Create the file if missing so proper-lockfile has something to lock.
  if (!existsSync(absPath)) {
    await writeFile(absPath, "", "utf8");
  }

  const release = await lockfile.lock(absPath, {
    retries: { retries: 5, minTimeout: 50, maxTimeout: 250 },
    stale: 10_000,
  });

  try {
    if (opts.ifMatch) {
      const current = await readFile(absPath, "utf8");
      const currentTag = etag(current);
      if (currentTag !== opts.ifMatch) {
        throw new EtagMismatch(opts.ifMatch, currentTag);
      }
    }

    await backupBeforeWrite(absPath, opts.trashDir, opts.keepVersions ?? 10);

    const tmp = `${absPath}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(tmp, content, "utf8");
    // fs.rename is atomic on POSIX and on Windows when target is not held
    // open. proper-lockfile guards against concurrent writers.
    const { rename } = await import("node:fs/promises");
    await rename(tmp, absPath);

    return etag(content);
  } finally {
    await release();
  }
}

async function backupBeforeWrite(
  filePath: string,
  trashDir: string,
  keepVersions: number,
): Promise<void> {
  if (!existsSync(filePath)) return;
  const content = await readFile(filePath, "utf8");
  if (content.length === 0) return;

  const rel = filePath.replace(/^[/\\]+/, "").replace(/[/\\]/g, "__");
  const stamp = new Date().toISOString().replace(/[:]/g, "-").replace(/\..+$/, "");
  const backupPath = join(trashDir, stamp, rel);
  mkdirSync(dirname(backupPath), { recursive: true });
  await cp(filePath, backupPath);

  await trimBackups(trashDir, rel, keepVersions);
}

async function trimBackups(trashDir: string, rel: string, keep: number): Promise<void> {
  if (!existsSync(trashDir)) return;
  const stamps = await readdir(trashDir);
  const matching: Array<{ stamp: string; path: string }> = [];
  for (const stamp of stamps) {
    const candidate = join(trashDir, stamp, rel);
    if (existsSync(candidate)) matching.push({ stamp, path: candidate });
  }
  matching.sort((a, b) => b.stamp.localeCompare(a.stamp));
  for (const extra of matching.slice(keep)) {
    await rm(extra.path, { force: true });
  }
}
