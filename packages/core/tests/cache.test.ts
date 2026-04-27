import { describe, expect, it } from "vitest";
import { EtagCache } from "../src/cache.js";

describe("EtagCache", () => {
  it("stores and retrieves values within TTL", () => {
    let now = 1000;
    const cache = new EtagCache({ ttlMs: 1000, now: () => now });
    cache.set("/a", "etag-1", { x: 1 });
    expect(cache.get("/a")).toEqual({
      etag: "etag-1",
      data: { x: 1 },
      expiresAt: 2000,
    });

    now = 1500;
    expect(cache.get("/a")).toBeDefined();
  });

  it("evicts expired entries on read", () => {
    let now = 1000;
    const cache = new EtagCache({ ttlMs: 1000, now: () => now });
    cache.set("/a", "etag-1", "value");
    now = 2001;
    expect(cache.get("/a")).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it("returns undefined for unknown keys", () => {
    const cache = new EtagCache();
    expect(cache.get("/nope")).toBeUndefined();
  });

  it("invalidates by prefix", () => {
    const cache = new EtagCache();
    cache.set("/repos/a/b/issues/1", undefined, "i1");
    cache.set("/repos/a/b/issues/2", undefined, "i2");
    cache.set("/repos/a/b/milestones/1", undefined, "m1");
    cache.invalidate("/repos/a/b/issues");
    expect(cache.get("/repos/a/b/issues/1")).toBeUndefined();
    expect(cache.get("/repos/a/b/issues/2")).toBeUndefined();
    expect(cache.get("/repos/a/b/milestones/1")).toBeDefined();
  });

  it("invalidates everything when called with no prefix", () => {
    const cache = new EtagCache();
    cache.set("/a", undefined, 1);
    cache.set("/b", undefined, 2);
    cache.invalidate();
    expect(cache.size()).toBe(0);
  });

  it("supports undefined etag (uncached-but-stored payload)", () => {
    const cache = new EtagCache();
    cache.set("/a", undefined, "data");
    const entry = cache.get<string>("/a");
    expect(entry?.etag).toBeUndefined();
    expect(entry?.data).toBe("data");
  });

  it("default TTL is 30 seconds", () => {
    let now = 0;
    const cache = new EtagCache({ now: () => now });
    cache.set("/a", undefined, "v");
    now = 29_999;
    expect(cache.get("/a")).toBeDefined();
    now = 30_001;
    expect(cache.get("/a")).toBeUndefined();
  });
});
