import { retry } from "@octokit/plugin-retry";
import { throttling } from "@octokit/plugin-throttling";
import { Octokit } from "@octokit/rest";

// Throttling + retry plugins add request hooks only — no public method
// surface. We expose `Octokit` as the consumer-facing type so the emitted
// `.d.ts` does not pull in deeply nested pnpm paths from the plugins.
const ExtendedOctokit = Octokit.plugin(throttling, retry);

export type DcklOctokit = Octokit;

export interface CreateClientOptions {
  token: string;
  userAgent?: string;
}

export function createClient(options: CreateClientOptions): DcklOctokit {
  const instance = new ExtendedOctokit({
    auth: options.token,
    userAgent: options.userAgent ?? "dckl/0.1",
    throttle: {
      onRateLimit: (_retryAfter, request, _octokit, retryCount) => {
        return retryCount < 1 && request.method === "GET";
      },
      onSecondaryRateLimit: (_retryAfter, request, octokit) => {
        octokit.log.warn(
          `Secondary rate limit hit for ${request.method} ${request.url} — backing off.`,
        );
        return false;
      },
    },
    retry: {
      doNotRetry: [400, 401, 403, 404, 422],
    },
  });

  // Warn when the rate-limit budget gets thin. Logs once per request to
  // stderr; the MCP layer can surface this in a tool envelope later.
  instance.hook.after("request", (response) => {
    const remaining = response.headers["x-ratelimit-remaining"];
    if (typeof remaining === "string") {
      const n = Number(remaining);
      if (!Number.isNaN(n) && n < 100) {
        instance.log.warn(`GitHub rate-limit remaining: ${n}.`);
      }
    }
  });

  return instance as Octokit;
}
