import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import type { MiddlewareHandler } from "hono";

export type UiHandlerOptions = {
  uiDir: string;
  csrfToken: string;
};

/**
 * Serves static UI assets with two niceties:
 *   - index.html gets the CSRF token injected as a <meta> tag so the client
 *     can echo it on writes.
 *   - Unknown paths fall back to index.html so client-side routing works.
 */
export function uiHandler(options: UiHandlerOptions): MiddlewareHandler {
  const uiDir = resolve(options.uiDir);

  return async (c, next) => {
    if (c.req.path.startsWith("/api/")) return next();

    const url = new URL(c.req.url);
    const rawPath = normalize(decodeURIComponent(url.pathname)).replace(/^\/+/, "");
    const relative = rawPath === "" ? "index.html" : rawPath;
    const absolute = join(uiDir, relative);

    if (!absolute.startsWith(uiDir)) {
      return c.text("forbidden", 403);
    }

    if (absolute.endsWith("index.html") || !existsSync(absolute)) {
      return serveIndex(c, uiDir, options.csrfToken);
    }

    try {
      const content = await readFile(absolute);
      return c.body(content, 200, { "Content-Type": mimeType(absolute) });
    } catch {
      return serveIndex(c, uiDir, options.csrfToken);
    }
  };
}

async function serveIndex(c: Parameters<MiddlewareHandler>[0], uiDir: string, token: string) {
  const indexPath = join(uiDir, "index.html");
  if (!existsSync(indexPath)) {
    return c.text("UI not built — run `pnpm build` or ship with dist/ui/", 500);
  }
  const html = await readFile(indexPath, "utf8");
  return c.body(injectToken(html, token), 200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
}

function injectToken(html: string, token: string): string {
  const tag = `<meta name="deckel-token" content="${escapeAttr(token)}">`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>\n    ${tag}`);
  }
  return `${tag}\n${html}`;
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, "&quot;");
}

function mimeType(path: string): string {
  switch (extname(path)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
    case ".mjs":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
    case ".map":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".woff2":
      return "font/woff2";
    case ".woff":
      return "font/woff";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}
