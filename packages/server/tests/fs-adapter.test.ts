import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EtagMismatch, etag, readWithEtag, writeAtomic } from "../src/storage/index.js";

describe("etag", () => {
  it("produces stable, quoted SHA-256 prefix", () => {
    expect(etag("hello")).toBe(etag("hello"));
    expect(etag("hello")).not.toBe(etag("world"));
    expect(etag("hello")).toMatch(/^"[a-f0-9]{32}"$/);
  });
});

describe("writeAtomic + readWithEtag", () => {
  let tmp: string;
  let trashDir: string;
  let filePath: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "deckel-fs-"));
    trashDir = join(tmp, ".trash");
    filePath = join(tmp, "sprints", "sprint-01", "index.md");
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("writes a file and returns its ETag", async () => {
    const tag = await writeAtomic(filePath, "hello world", { trashDir });
    expect(tag).toMatch(/^"[a-f0-9]{32}"$/);
    expect(readFileSync(filePath, "utf8")).toBe("hello world");
  });

  it("round-trips: writeAtomic ETag matches readWithEtag ETag", async () => {
    const writeTag = await writeAtomic(filePath, "payload", { trashDir });
    const { content, etag: readTag } = await readWithEtag(filePath);
    expect(content).toBe("payload");
    expect(readTag).toBe(writeTag);
  });

  it("accepts write when ifMatch equals current ETag", async () => {
    const initial = await writeAtomic(filePath, "v1", { trashDir });
    const next = await writeAtomic(filePath, "v2", { trashDir, ifMatch: initial });
    expect(next).not.toBe(initial);
    expect(readFileSync(filePath, "utf8")).toBe("v2");
  });

  it("throws EtagMismatch when ifMatch is stale", async () => {
    await writeAtomic(filePath, "v1", { trashDir });
    await writeAtomic(filePath, "v2", { trashDir });
    await expect(
      writeAtomic(filePath, "v3", { trashDir, ifMatch: '"stale"' }),
    ).rejects.toBeInstanceOf(EtagMismatch);
    expect(readFileSync(filePath, "utf8")).toBe("v2");
  });

  it("creates a backup in .trash/ before overwriting", async () => {
    await writeAtomic(filePath, "v1", { trashDir });
    await writeAtomic(filePath, "v2", { trashDir });
    const { readdirSync } = await import("node:fs");
    const stamps = readdirSync(trashDir);
    expect(stamps.length).toBeGreaterThan(0);
  });
});
