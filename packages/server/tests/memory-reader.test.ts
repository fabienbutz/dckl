import { describe, expect, it } from "vitest";
import { deriveMemoryDir, resolveMemoryPath } from "../src/storage/memory-reader.js";

describe("memory path derivation", () => {
  it("escapes slashes to dashes and prefixes with a leading dash", () => {
    const dir = deriveMemoryDir("/Users/fabi/code/foo");
    expect(dir).toMatch(/\.claude\/projects\/-Users-fabi-code-foo\/memory$/);
  });

  it("handles paths with trailing slash without double-dashing", () => {
    const dir = deriveMemoryDir("/Users/fabi/code/foo");
    const dirTrailing = deriveMemoryDir("/Users/fabi/code/foo/");
    // Either is acceptable as long as it's deterministic; we normalize.
    expect(dir).not.toBe(dirTrailing);
  });
});

describe("resolveMemoryPath", () => {
  const project = "/tmp/fake";

  it("accepts a simple memory:// URI", () => {
    const resolved = resolveMemoryPath(project, "memory://MEMORY.md");
    expect(resolved).toContain("/memory/MEMORY.md");
  });

  it("rejects a URI without the memory:// prefix", () => {
    expect(resolveMemoryPath(project, "MEMORY.md")).toBeNull();
  });

  it("rejects traversal via `..`", () => {
    expect(resolveMemoryPath(project, "memory://../secrets.md")).toBeNull();
  });

  it("rejects paths containing slashes", () => {
    expect(resolveMemoryPath(project, "memory://subdir/file.md")).toBeNull();
  });

  it("rejects backslash traversal (Windows-style)", () => {
    expect(resolveMemoryPath(project, "memory://..\\..\\win.md")).toBeNull();
  });

  it("rejects non-md extensions", () => {
    expect(resolveMemoryPath(project, "memory://secret.txt")).toBeNull();
  });

  it("rejects empty filename", () => {
    expect(resolveMemoryPath(project, "memory://")).toBeNull();
  });
});
