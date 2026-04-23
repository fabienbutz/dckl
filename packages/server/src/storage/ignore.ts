import { existsSync, readFileSync } from "node:fs";

/**
 * Minimal .deckelignore matcher. Supports:
 *   - comment lines (#)
 *   - exact-name matches (node_modules)
 *   - simple globs with * (e.g. *.log)
 *   - directory suffixes (dist/)
 *
 * Not intended to be gitignore-compatible — just enough to let users exclude
 * build artifacts and generated files from inventory scans.
 */
export type IgnoreMatcher = (relativePath: string) => boolean;

const BUILTIN_IGNORES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  ".cache",
];

export function loadIgnoreMatcher(ignoreFilePath: string): IgnoreMatcher {
  const patterns = [...BUILTIN_IGNORES];
  if (existsSync(ignoreFilePath)) {
    const content = readFileSync(ignoreFilePath, "utf8");
    for (const raw of content.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      patterns.push(line.replace(/\/$/, ""));
    }
  }

  const regexes = patterns.map(globToRegex);
  return (relativePath) => {
    const segments = relativePath.split("/").filter(Boolean);
    for (const regex of regexes) {
      for (const segment of segments) {
        if (regex.test(segment)) return true;
      }
      if (regex.test(relativePath)) return true;
    }
    return false;
  };
}

function globToRegex(pattern: string): RegExp {
  // Escape regex specials, then convert * → [^/]*
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*");
  return new RegExp(`^${escaped}$`);
}
