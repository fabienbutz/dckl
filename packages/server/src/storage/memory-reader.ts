import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { StackEntry } from "./stack-scanner.js";

/**
 * Claude Code stores its per-project memory at
 *   ~/.claude/projects/<cwd-slashes-to-dashes>/memory/
 * For a project at /Users/fabi/code/foo the escaped form is
 *   -Users-fabi-code-foo
 * (leading dash, every slash replaced). The `memory/` sub-directory
 * holds MEMORY.md (index) and user_*.md / feedback_*.md / project_*.md /
 * reference_*.md (individual memories), each with YAML frontmatter.
 */
export function deriveMemoryDir(projectRoot: string): string {
  const escaped = projectRoot.replace(/\//g, "-");
  return join(homedir(), ".claude", "projects", escaped, "memory");
}

/**
 * Lists memory files as StackEntry tuples, tagged `category: "memory"` and
 * using a `memory://<filename>` path convention so they coexist with
 * project-relative paths in the same inventory without leaking the actual
 * home-directory path to the client.
 */
export function scanMemory(projectRoot: string): StackEntry[] {
  const dir = deriveMemoryDir(projectRoot);
  if (!existsSync(dir)) return [];
  const entries: StackEntry[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".md")) continue;
    // Path-traversal guard: readdir could in theory return something weird;
    // reject anything with slashes or .. sequences.
    if (file.includes("/") || file.includes("..") || file.includes("\\")) continue;
    const abs = join(dir, file);
    try {
      const st = statSync(abs);
      if (!st.isFile()) continue;
      const label = file.replace(/\.md$/, "");
      entries.push({
        category: "memory",
        label,
        path: `memory://${file}`,
        size: st.size,
        mtime: st.mtimeMs,
      });
    } catch {
      // Symlink loops, permission errors → skip silently.
    }
  }
  entries.sort((a, b) => {
    // MEMORY.md first (it's the index), then alpha.
    if (a.label === "MEMORY") return -1;
    if (b.label === "MEMORY") return 1;
    return a.label.localeCompare(b.label);
  });
  return entries;
}

/**
 * Resolves a `memory://<filename>` URI to an absolute filesystem path
 * inside the derived memory dir. Returns null for any path that would
 * escape the memory dir (traversal, absolute, etc.) — the guard must
 * reject before touching disk.
 */
export function resolveMemoryPath(projectRoot: string, memoryUri: string): string | null {
  if (!memoryUri.startsWith("memory://")) return null;
  const filename = memoryUri.slice("memory://".length);
  if (!filename || filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    return null;
  }
  if (!filename.endsWith(".md")) return null;
  const dir = deriveMemoryDir(projectRoot);
  const abs = join(dir, filename);
  // Final safety check: abs must be a direct child of the memory dir.
  if (!abs.startsWith(`${dir}/`) && !abs.startsWith(`${dir}\\`)) return null;
  return abs;
}
