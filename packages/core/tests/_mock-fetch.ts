import { Octokit } from "@octokit/rest";

interface MockResponse {
  status?: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface Matcher {
  method: string;
  path: string | RegExp;
  query?: Record<string, string>;
  response: MockResponse;
}

export interface CapturedCall {
  url: string;
  method: string;
  body: unknown;
}

export type CallObserver = (call: CapturedCall) => void;

/**
 * Builds a `fetch`-shaped mock that consumes matchers in order. Matches by
 * method + path (string or regex) and optional query params. Each matcher
 * is single-use. Pass `onCall` to inspect request bodies in assertions.
 */
export function createMockFetch(matchers: Matcher[], onCall?: CallObserver): typeof fetch {
  const remaining: Matcher[] = matchers.map((m) => ({ ...m }));
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;
    const method = (init?.method ?? "GET").toUpperCase();
    const u = new URL(url);

    if (onCall) {
      let parsedBody: unknown = null;
      if (init?.body !== undefined && init.body !== null) {
        const raw = typeof init.body === "string" ? init.body : String(init.body);
        try {
          parsedBody = raw.length > 0 ? JSON.parse(raw) : null;
        } catch {
          parsedBody = raw;
        }
      }
      onCall({ url, method, body: parsedBody });
    }

    const idx = remaining.findIndex((m) => {
      if (m.method.toUpperCase() !== method) return false;
      if (typeof m.path === "string") {
        if (u.pathname !== m.path) return false;
      } else if (!m.path.test(u.pathname)) {
        return false;
      }
      if (m.query) {
        for (const [k, v] of Object.entries(m.query)) {
          if (u.searchParams.get(k) !== v) return false;
        }
      }
      return true;
    });

    if (idx === -1) {
      throw new Error(`No mock matcher for ${method} ${u.pathname}${u.search}`);
    }
    const matcher = remaining[idx];
    if (!matcher) throw new Error("internal: matcher disappeared");
    remaining.splice(idx, 1);

    const status = matcher.response.status ?? 200;
    const body = matcher.response.body;
    return new Response(body === undefined ? "" : JSON.stringify(body), {
      status,
      headers: {
        "content-type": "application/json",
        ...matcher.response.headers,
      },
    });
  }) as typeof fetch;
  return fn;
}

export function createTestClient(matchers: Matcher[], onCall?: CallObserver): Octokit {
  return new Octokit({
    auth: "test-token",
    request: { fetch: createMockFetch(matchers, onCall) },
  });
}
