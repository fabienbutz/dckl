import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findDcklRoot } from "@dckl/server/storage";
import { readPortLock } from "../port-discovery.js";

type TaskLock = { sprint_id: string; task_id: string };

export type TaskCmdOptions = {
  by?: string;
};

export async function runTaskClaim(taskId: string, opts: TaskCmdOptions = {}): Promise<void> {
  const dcklRoot = requiredcklRoot();
  const sprintId = findSprintForTask(dcklRoot, taskId);
  if (!sprintId) {
    console.error(`[dckl] task ${taskId} not found in any sprint`);
    process.exitCode = 1;
    return;
  }

  writeFileSync(
    join(dcklRoot, ".active-task"),
    `${JSON.stringify({ sprint_id: sprintId, task_id: taskId } satisfies TaskLock, null, 2)}\n`,
    "utf8",
  );

  const by = opts.by ?? "claude-code";
  const result = await apiPost(dcklRoot, `/api/sprints/${sprintId}/tasks/${taskId}/claim`, {
    by,
  });
  if (!result.ok) {
    if (isServerDown(result)) {
      reportServerDown(`pnpm dckl task claim ${taskId}`);
    } else {
      console.error(`[dckl] claim failed: ${result.status} ${result.error}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`[dckl] claimed ${taskId} as ${by}`);
}

export async function runTaskRelease(taskId: string): Promise<void> {
  const dcklRoot = requiredcklRoot();
  const sprintId = findSprintForTask(dcklRoot, taskId);
  if (!sprintId) {
    console.error(`[dckl] task ${taskId} not found in any sprint`);
    process.exitCode = 1;
    return;
  }

  const activePath = join(dcklRoot, ".active-task");
  if (existsSync(activePath)) {
    try {
      unlinkSync(activePath);
    } catch {
      // best-effort
    }
  }

  const result = await apiPost(dcklRoot, `/api/sprints/${sprintId}/tasks/${taskId}/release`);
  if (!result.ok) {
    if (isServerDown(result)) {
      reportServerDown(`pnpm dckl task release ${taskId}`);
    } else {
      console.error(`[dckl] release failed: ${result.status} ${result.error}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`[dckl] released ${taskId}`);
}

export async function runHeartbeat(opts: { silent?: boolean } = {}): Promise<void> {
  const dcklRoot = findDcklRoot(process.cwd());
  if (!dcklRoot) {
    if (!opts.silent) console.error("[dckl] no .dckl/ found");
    return;
  }

  const activePath = join(dcklRoot, ".active-task");
  if (!existsSync(activePath)) {
    // No active task — silent no-op (used by hook).
    return;
  }

  let lock: TaskLock;
  try {
    lock = JSON.parse(readFileSync(activePath, "utf8")) as TaskLock;
  } catch {
    if (!opts.silent) console.error("[dckl] malformed .active-task");
    return;
  }

  const result = await apiPost(
    dcklRoot,
    `/api/sprints/${lock.sprint_id}/tasks/${lock.task_id}/heartbeat`,
  );
  if (!result.ok && !opts.silent) {
    console.error(`[dckl] heartbeat failed: ${result.status} ${result.error}`);
  }
}

function requiredcklRoot(): string {
  const root = findDcklRoot(process.cwd());
  if (!root) {
    console.error("[dckl] no .dckl/ found — run `dckl init` first");
    process.exit(1);
  }
  return root;
}

function findSprintForTask(dcklRoot: string, taskId: string): string | null {
  const sprintsDir = join(dcklRoot, "sprints");
  if (!existsSync(sprintsDir)) return null;
  for (const entry of readdirSync(sprintsDir)) {
    const taskFile = join(sprintsDir, entry, "tasks", `${taskId}.md`);
    if (existsSync(taskFile)) return entry;
  }
  return null;
}

type ApiErrorKind = "SERVER_DOWN" | "HTTP_ERROR" | "NETWORK_ERROR";

type ApiResult<T = unknown> = {
  ok: boolean;
  status: number;
  error?: string;
  data?: T;
  etag?: string;
  kind?: ApiErrorKind;
};

/**
 * Loud, multi-line banner for the most common failure: server not running.
 * Every command that talks to the API routes through this so the user sees
 * an actionable recovery path, not a one-line whisper.
 */
function reportServerDown(retryCommand: string): void {
  process.stderr.write("\n");
  process.stderr.write("  ✗ dckl: server not running.\n");
  process.stderr.write("\n");
  process.stderr.write("    Start the server in another terminal:\n");
  process.stderr.write("        pnpm dckl\n");
  process.stderr.write("\n");
  process.stderr.write("    Then retry:\n");
  process.stderr.write(`        ${retryCommand}\n`);
  process.stderr.write("\n");
}

function isServerDown(result: ApiResult<unknown>): boolean {
  return !result.ok && result.kind === "SERVER_DOWN";
}

async function apiPost<T = unknown>(
  dcklRoot: string,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  return apiRequest<T>(dcklRoot, "POST", path, { body });
}

async function apiGet<T = unknown>(dcklRoot: string, path: string): Promise<ApiResult<T>> {
  return apiRequest<T>(dcklRoot, "GET", path);
}

async function apiPatch<T = unknown>(
  dcklRoot: string,
  path: string,
  body: unknown,
  ifMatch: string,
): Promise<ApiResult<T>> {
  return apiRequest<T>(dcklRoot, "PATCH", path, { body, ifMatch });
}

async function apiRequest<T>(
  dcklRoot: string,
  method: string,
  path: string,
  opts: { body?: unknown; ifMatch?: string } = {},
): Promise<ApiResult<T>> {
  const portLock = readPortLock(join(dcklRoot, ".port"));
  if (!portLock) {
    return {
      ok: false,
      status: 0,
      error: ".dckl/.port missing",
      kind: "SERVER_DOWN",
    };
  }

  const headers: Record<string, string> = {
    "X-dckl-Token": portLock.token,
  };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.ifMatch) headers["If-Match"] = opts.ifMatch;

  try {
    const res = await fetch(`http://localhost:${portLock.port}${path}`, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const etag = res.headers.get("ETag") ?? undefined;
    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        status: res.status,
        error: text,
        etag,
        kind: "HTTP_ERROR",
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, status: res.status, data, etag };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Stale .port file (server crashed without releasing the lock) presents
    // as ECONNREFUSED / fetch failed — treat identically to a missing port.
    const looksLikeServerDown =
      msg.includes("ECONNREFUSED") || msg.includes("fetch failed");
    return {
      ok: false,
      status: 0,
      error: msg,
      kind: looksLikeServerDown ? "SERVER_DOWN" : "NETWORK_ERROR",
    };
  }
}

// ─── dckl check <task-id> <check-id> ──────────────────────────────────────

type ReminderEntry = { id: string; checked: boolean; notes?: string };
type TestEntry = { id: string; label: string; checked: boolean };
type TaskMetaShape = {
  security_checks: ReminderEntry[];
  test_criteria: TestEntry[];
  corrections: Array<{ id: string; text: string; open: boolean; target_sprint: null | string }>;
};
type TaskShape = { meta: TaskMetaShape & Record<string, unknown> };

export async function runCheck(taskId: string, checkId: string): Promise<void> {
  const dcklRoot = requiredcklRoot();
  const sprintId = findSprintForTask(dcklRoot, taskId);
  if (!sprintId) {
    console.error(`[dckl] task ${taskId} not found in any sprint`);
    process.exitCode = 1;
    return;
  }

  const got = await apiGet<TaskShape>(
    dcklRoot,
    `/api/sprints/${sprintId}/tasks/${taskId}`,
  );
  if (!got.ok || !got.data || !got.etag) {
    if (isServerDown(got)) {
      reportServerDown(`pnpm dckl check ${taskId} ${checkId}`);
    } else {
      console.error(`[dckl] failed to read ${taskId}: ${got.status} ${got.error}`);
    }
    process.exitCode = 1;
    return;
  }

  const meta = got.data.meta;
  const reminder = meta.security_checks.find((r) => r.id === checkId);
  const test = meta.test_criteria.find((t) => t.id === checkId);

  if (!reminder && !test) {
    const available = [
      ...meta.security_checks.map((r) => `  reminder · ${r.id}`),
      ...meta.test_criteria.map((t) => `  test     · ${t.id} — ${t.label}`),
    ];
    console.error(`[dckl] no check "${checkId}" on ${taskId}. Available:`);
    console.error(available.join("\n"));
    process.exitCode = 1;
    return;
  }

  let patch: Record<string, unknown>;
  let prev: boolean;
  if (reminder) {
    prev = reminder.checked;
    patch = {
      security_checks: meta.security_checks.map((r) =>
        r.id === checkId ? { ...r, checked: !r.checked } : r,
      ),
    };
  } else if (test) {
    prev = test.checked;
    patch = {
      test_criteria: meta.test_criteria.map((t) =>
        t.id === checkId ? { ...t, checked: !t.checked } : t,
      ),
    };
  } else {
    return;
  }

  const res = await apiPatch(
    dcklRoot,
    `/api/sprints/${sprintId}/tasks/${taskId}`,
    patch,
    got.etag,
  );
  if (!res.ok) {
    if (isServerDown(res)) {
      reportServerDown(`pnpm dckl check ${taskId} ${checkId}`);
    } else {
      console.error(`[dckl] check toggle failed: ${res.status} ${res.error}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `[dckl] ${taskId} ${reminder ? "reminder" : "test"} \`${checkId}\`: ${prev ? "checked → unchecked" : "unchecked → checked"}`,
  );
}

// ─── dckl correction add <task-id> "<text>" ───────────────────────────────

export async function runCorrectionAdd(taskId: string, text: string): Promise<void> {
  const dcklRoot = requiredcklRoot();
  const sprintId = findSprintForTask(dcklRoot, taskId);
  if (!sprintId) {
    console.error(`[dckl] task ${taskId} not found in any sprint`);
    process.exitCode = 1;
    return;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    console.error("[dckl] correction text must not be empty");
    process.exitCode = 1;
    return;
  }

  const got = await apiGet<TaskShape>(
    dcklRoot,
    `/api/sprints/${sprintId}/tasks/${taskId}`,
  );
  if (!got.ok || !got.data || !got.etag) {
    if (isServerDown(got)) {
      reportServerDown(`pnpm dckl correction add ${taskId} "${trimmed}"`);
    } else {
      console.error(`[dckl] failed to read ${taskId}: ${got.status} ${got.error}`);
    }
    process.exitCode = 1;
    return;
  }

  const existing = got.data.meta.corrections;
  const nextId = nextCorrectionId(existing);
  const correction = { id: nextId, text: trimmed, open: true, target_sprint: null };

  const res = await apiPatch(
    dcklRoot,
    `/api/sprints/${sprintId}/tasks/${taskId}`,
    { corrections: [...existing, correction] },
    got.etag,
  );
  if (!res.ok) {
    if (isServerDown(res)) {
      reportServerDown(`pnpm dckl correction add ${taskId} "${trimmed}"`);
    } else {
      console.error(`[dckl] correction add failed: ${res.status} ${res.error}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`[dckl] ${taskId} correction \`${nextId}\`: ${trimmed}`);
}

function nextCorrectionId(existing: Array<{ id: string }>): string {
  let max = 0;
  for (const c of existing) {
    const m = /^c(\d+)$/.exec(c.id);
    if (m?.[1]) max = Math.max(max, Number.parseInt(m[1], 10));
  }
  return `c${max + 1}`;
}
