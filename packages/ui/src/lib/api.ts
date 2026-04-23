import type {
  Config,
  Journey,
  JourneyMeta,
  SecurityCheckTemplates,
  Sprint,
  SprintMeta,
  Task,
  TaskMeta,
} from "@dckl/server/schema";

export type WithEtag<T> = { data: T; etag: string };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API ${status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
    this.name = "ApiError";
  }
}

// ─── CSRF token resolution ──────────────────────────────────────────────────
// In production (UI served by the dckl CLI), the token is injected as a
// meta tag in index.html. In dev (Vite on :5173 proxying to the CLI), no
// injection happens — we fetch /api/token once and cache the result.

let cachedToken: string | null = null;
let inflight: Promise<string> | null = null;

async function getCsrfToken(): Promise<string> {
  if (cachedToken !== null) return cachedToken;

  // Prod path: meta tag injected by Hono's uiHandler.
  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="dckl-token"]');
    const val = meta?.getAttribute("content");
    if (val) {
      cachedToken = val;
      return val;
    }
  }

  // Dev path: fetch once, dedupe concurrent callers.
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/token");
      if (!res.ok) return "";
      const body = (await res.json()) as { token: string };
      cachedToken = body.token;
      return body.token;
    } catch {
      return "";
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { ifMatch?: string } = {},
): Promise<WithEtag<T>> {
  const { ifMatch, headers, ...rest } = init;
  const token = await getCsrfToken();
  const res = await fetch(path, {
    ...rest,
    headers: {
      "X-dckl-Token": token,
      ...(ifMatch ? { "If-Match": ifMatch } : {}),
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...(headers ?? {}),
    },
  });

  const body = await parseBody(res);
  if (!res.ok) throw new ApiError(res.status, body);

  return { data: body as T, etag: res.headers.get("ETag") ?? "" };
}

export type StackEntry = {
  category: "claude-md" | "skill" | "rule" | "command" | "hook" | "mcp" | "doc" | "memory";
  label: string;
  path: string;
  size: number;
  mtime: number;
};

async function requestText(path: string): Promise<{ text: string; etag: string }> {
  const token = await getCsrfToken();
  const res = await fetch(path, { headers: { "X-dckl-Token": token } });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return { text: await res.text(), etag: res.headers.get("ETag") ?? "" };
}

export const api = {
  getConfig: () => request<Config>("/api/config"),
  getChangelog: () => request<{ content: string }>("/api/changelog"),
  getStackInventory: () =>
    request<{ projectRoot: string; entries: StackEntry[] }>("/api/stack"),
  getStackFile: (path: string) =>
    requestText(`/api/stack/file?path=${encodeURIComponent(path)}`),
  getJourneys: () => request<{ journeys: JourneyMeta[] }>("/api/journeys"),
  getJourney: (id: string) => request<Journey>(`/api/journeys/${encodeURIComponent(id)}`),
  getSecurityTemplates: () =>
    request<SecurityCheckTemplates>("/api/templates/security-checks"),
  getSprints: () => request<{ sprints: SprintMeta[] }>("/api/sprints"),
  getSprint: (id: string) => request<Sprint>(`/api/sprints/${encodeURIComponent(id)}`),
  getTask: (sprintId: string, taskId: string) =>
    request<Task>(
      `/api/sprints/${encodeURIComponent(sprintId)}/tasks/${encodeURIComponent(taskId)}`,
    ),
  patchTask: (sprintId: string, taskId: string, patch: Partial<TaskMeta>, ifMatch: string) =>
    request<Task>(
      `/api/sprints/${encodeURIComponent(sprintId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(patch),
        ifMatch,
      },
    ),
};
