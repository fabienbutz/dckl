import { randomBytes } from "node:crypto";
import type { MiddlewareHandler } from "hono";

export function generateCsrfToken(): string {
  return randomBytes(24).toString("base64url");
}

const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const TOKEN_HEADER = "x-deckel-token";

/**
 * Double-defence against CSRF from arbitrary localhost tabs:
 *   1. A per-start random token, injected into the UI's index.html at serve
 *      time, must be echoed back in the X-Deckel-Token header on writes.
 *   2. The Origin header (when present) must point at the server's own
 *      host:port. Missing Origin is allowed — CLI companions (curl, deckel
 *      check) have no origin and still need to write.
 *
 * Read-only requests (GET/HEAD) are unguarded: an attacker knowing the port
 * can at worst read sprint data, which is already on disk in plain text.
 */
export function csrfMiddleware(token: string): MiddlewareHandler {
  return async (c, next) => {
    if (!WRITE_METHODS.has(c.req.method)) {
      return next();
    }

    const headerToken = c.req.header(TOKEN_HEADER);
    if (!headerToken || !timingSafeEqual(headerToken, token)) {
      return c.json({ error: "missing or invalid X-Deckel-Token" }, 403);
    }

    const origin = c.req.header("origin");
    if (origin && !isLocalOrigin(origin)) {
      return c.json({ error: `forbidden origin: ${origin}` }, 403);
    }

    return next();
  };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function isLocalOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  } catch {
    return false;
  }
}
