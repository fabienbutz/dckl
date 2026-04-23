import { createHash } from "node:crypto";

/**
 * Content-addressed ETag for optimistic locking. A PATCH request must echo
 * the ETag it read; the server rejects writes whose If-Match header does not
 * match the current on-disk hash (409 Conflict).
 */
export function etag(content: string | Buffer): string {
  const hash = createHash("sha256").update(content).digest("hex");
  return `"${hash.slice(0, 32)}"`;
}
