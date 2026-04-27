export interface CachedResponse<T> {
  etag: string | undefined;
  data: T;
  expiresAt: number;
}

export interface EtagCacheOptions {
  ttlMs?: number;
  now?: () => number;
}

/**
 * In-memory cache for GitHub responses keyed by request URL. Stores both
 * the response body and the ETag so a subsequent request can issue a
 * conditional `If-None-Match`. TTL trims the cache; ETag handles freshness.
 */
export class EtagCache {
  private readonly map = new Map<string, CachedResponse<unknown>>();
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(options: EtagCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 30_000;
    this.now = options.now ?? Date.now;
  }

  get<T>(key: string): CachedResponse<T> | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < this.now()) {
      this.map.delete(key);
      return undefined;
    }
    return entry as CachedResponse<T>;
  }

  set<T>(key: string, etag: string | undefined, data: T): void {
    this.map.set(key, {
      etag,
      data,
      expiresAt: this.now() + this.ttlMs,
    });
  }

  /**
   * Drop entries. With no prefix: clear all. With a prefix: drop matching keys
   * (e.g. `/repos/foo/bar/issues` to invalidate after a write).
   */
  invalidate(prefix?: string): void {
    if (!prefix) {
      this.map.clear();
      return;
    }
    for (const key of [...this.map.keys()]) {
      if (key.startsWith(prefix)) this.map.delete(key);
    }
  }

  size(): number {
    return this.map.size;
  }
}
