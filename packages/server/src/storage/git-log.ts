import { execFileSync } from "node:child_process";

export type CommitRef = {
  sha: string;
  short: string;
  date: string; // ISO-8601
  subject: string;
  body: string;
};

// Match any task-shaped identifier (`XYZ-123`) in commit subject or body.
// Permissive on purpose: false positives are cheap (human ignores), false
// negatives are expensive (missed commit on the task card). The `Refs` /
// `Closes` keywords are the documented convention but any mention links.
const TASK_ID_RE = /\b([A-Z][A-Z0-9]*-\d+)\b/g;

/**
 * Reads `git log` from the project root and returns parsed commits
 * newer than `since` (ISO date, optional). Runs in a best-effort mode:
 * if `git` is missing or the project is not a git repo, returns [].
 */
export function listCommits(projectRoot: string, since?: string): CommitRef[] {
  try {
    const args = ["log", "--format=---COMMIT---%n%H%n%at%n%s%n%b", "--no-color"];
    const normalized = normalizeSince(since);
    if (normalized) args.push(`--since=${normalized}`);
    const out = execFileSync("git", args, {
      cwd: projectRoot,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const commits: CommitRef[] = [];
    for (const block of out.split(/^---COMMIT---\n/m)) {
      if (!block.trim()) continue;
      const lines = block.split("\n");
      const sha = lines[0]?.trim();
      const atStr = lines[1]?.trim();
      if (!sha || !atStr) continue;
      const at = Number.parseInt(atStr, 10);
      if (Number.isNaN(at)) continue;
      const subject = lines[2] ?? "";
      const body = lines.slice(3).join("\n").replace(/\n+$/, "");
      commits.push({
        sha,
        short: sha.slice(0, 8),
        date: new Date(at * 1000).toISOString(),
        subject,
        body,
      });
    }
    return commits;
  } catch {
    return [];
  }
}

/**
 * Git's `--since` uses the approxidate parser. A bare `YYYY-MM-DD` for
 * today's date returns zero commits (parsed as "since end of that day").
 * Pinning an explicit `T00:00:00` forces the strict-date path. Non-date
 * strings pass through unchanged.
 */
function normalizeSince(s?: string): string | undefined {
  if (!s) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00` : s;
}

/**
 * Groups commits by every task ID mentioned in their subject or body.
 * A commit can belong to multiple tasks; no ownership is implied, just
 * reference. Each task's list is sorted by date, newest first.
 *
 * `prefix` scopes the match to one project's task-ID prefix (e.g. "DCK",
 * "RBA"). Without it, unrelated strings like `SHA-256` match the generic
 * `<PREFIX>-<N>` shape and clutter the output.
 */
export function groupCommitsByTask(
  commits: CommitRef[],
  prefix?: string,
): Record<string, CommitRef[]> {
  const map: Record<string, CommitRef[]> = {};
  const matcher = prefix
    ? new RegExp(`\\b(${escapeRegex(prefix)}-\\d+)\\b`, "g")
    : TASK_ID_RE;
  for (const c of commits) {
    const text = `${c.subject}\n${c.body}`;
    const ids = new Set<string>();
    matcher.lastIndex = 0;
    let m: RegExpExecArray | null = matcher.exec(text);
    while (m !== null) {
      if (m[1]) ids.add(m[1]);
      m = matcher.exec(text);
    }
    for (const id of ids) {
      (map[id] ??= []).push(c);
    }
  }
  for (const bucket of Object.values(map)) {
    bucket.sort((a, b) => b.date.localeCompare(a.date));
  }
  return map;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
