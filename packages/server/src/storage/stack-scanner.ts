import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { loadIgnoreMatcher } from "./ignore.js";

export type StackEntry = {
  category: "claude-md" | "skill" | "rule" | "command" | "hook" | "mcp" | "doc" | "memory";
  label: string;
  /** For project files: path relative to projectRoot. For memory files:
   *  `memory://<filename>` — the actual path lives in the user's home and
   *  is resolved server-side via resolveMemoryPath(). */
  path: string;
  /** Size in bytes. */
  size: number;
  /** Last-modified time (epoch ms). */
  mtime: number;
};

export type StackInventory = {
  /** Absolute project root — the directory containing .dckl/. */
  projectRoot: string;
  entries: StackEntry[];
};

/**
 * Walk the project's `.claude/` tree and the top-level CLAUDE.md. Returns
 * a flat list of stack files with their category. The list doubles as the
 * **allowlist** for `/api/stack/file?path=…` — requests for anything not
 * in this scan are rejected.
 */
export function scanStack(projectRoot: string): StackInventory {
  const entries: StackEntry[] = [];
  const claudeDir = join(projectRoot, ".claude");
  const ignoreMatcher = loadIgnoreMatcher(
    join(projectRoot, ".dckl", ".dcklignore"),
  );

  // Project CLAUDE.md (root).
  const topClaude = join(projectRoot, "CLAUDE.md");
  if (existsSync(topClaude)) {
    const st = statSync(topClaude);
    entries.push({
      category: "claude-md",
      label: "CLAUDE.md",
      path: "CLAUDE.md",
      size: st.size,
      mtime: st.mtimeMs,
    });
  }

  if (!existsSync(claudeDir)) {
    return { projectRoot, entries };
  }

  // .claude/skills/<name>/SKILL.md
  const skillsDir = join(claudeDir, "skills");
  if (existsSync(skillsDir) && statSync(skillsDir).isDirectory()) {
    for (const skillName of readdirSync(skillsDir)) {
      const skillFile = join(skillsDir, skillName, "SKILL.md");
      if (existsSync(skillFile) && statSync(skillFile).isFile()) {
        const st = statSync(skillFile);
        entries.push({
          category: "skill",
          label: skillName,
          path: relFromProject(projectRoot, skillFile),
          size: st.size,
          mtime: st.mtimeMs,
        });
      }
    }
  }

  // .claude/rules/*.md  (flat)
  walkDir(join(claudeDir, "rules"), projectRoot, (abs) => {
    if (!abs.endsWith(".md")) return;
    const st = statSync(abs);
    entries.push({
      category: "rule",
      label: basename(abs).replace(/\.md$/, ""),
      path: relFromProject(projectRoot, abs),
      size: st.size,
      mtime: st.mtimeMs,
    });
  });

  // .claude/commands/*.md  (flat, namespaced plugins nested one level deep)
  walkDir(join(claudeDir, "commands"), projectRoot, (abs) => {
    if (!abs.endsWith(".md")) return;
    const st = statSync(abs);
    entries.push({
      category: "command",
      label: basename(abs).replace(/\.md$/, ""),
      path: relFromProject(projectRoot, abs),
      size: st.size,
      mtime: st.mtimeMs,
    });
  });

  // .claude/settings.json (hooks)
  const settingsFile = join(claudeDir, "settings.json");
  if (existsSync(settingsFile)) {
    const st = statSync(settingsFile);
    entries.push({
      category: "hook",
      label: "settings.json",
      path: relFromProject(projectRoot, settingsFile),
      size: st.size,
      mtime: st.mtimeMs,
    });
  }

  // .mcp.json (if present at repo root)
  const mcpFile = join(projectRoot, ".mcp.json");
  if (existsSync(mcpFile)) {
    const st = statSync(mcpFile);
    entries.push({
      category: "mcp",
      label: ".mcp.json",
      path: relFromProject(projectRoot, mcpFile),
      size: st.size,
      mtime: st.mtimeMs,
    });
  }

  // docs/**/*.md — respect .dcklignore + built-ins.
  const docsDir = join(projectRoot, "docs");
  if (existsSync(docsDir) && statSync(docsDir).isDirectory()) {
    walkDir(docsDir, projectRoot, (abs) => {
      if (!abs.endsWith(".md")) return;
      const rel = relFromProject(projectRoot, abs);
      if (ignoreMatcher(rel)) return;
      const st = statSync(abs);
      entries.push({
        category: "doc",
        label: rel.replace(/^docs\//, "").replace(/\.md$/, ""),
        path: rel,
        size: st.size,
        mtime: st.mtimeMs,
      });
    });
  }

  // Sort: categories in canonical order, within category by label —
  // EXCEPT docs, which sort by mtime DESC (newest first) so the freshest
  // notes surface at the top.
  const categoryOrder: StackEntry["category"][] = [
    "claude-md",
    "rule",
    "skill",
    "command",
    "hook",
    "mcp",
    "doc",
  ];
  entries.sort((a, b) => {
    const oa = categoryOrder.indexOf(a.category);
    const ob = categoryOrder.indexOf(b.category);
    if (oa !== ob) return oa - ob;
    if (a.category === "doc") return b.mtime - a.mtime;
    return a.label.localeCompare(b.label);
  });

  return { projectRoot, entries };
}

/**
 * Check whether a requested path is in the allowlist (i.e. was found by
 * the scanner). Also guards against path traversal: the resolved absolute
 * must stay inside `projectRoot`.
 */
export function isStackFileAllowed(
  inventory: StackInventory,
  requestedRelPath: string,
): string | null {
  const normalized = requestedRelPath.replace(/\\+/g, "/");
  if (normalized.includes("..")) return null;

  const match = inventory.entries.find((e) => e.path === normalized);
  if (!match) return null;

  const absolute = resolve(inventory.projectRoot, match.path);
  if (!absolute.startsWith(inventory.projectRoot + sep) && absolute !== inventory.projectRoot) {
    return null;
  }
  return absolute;
}

function relFromProject(projectRoot: string, abs: string): string {
  const prefix = `${projectRoot}${sep}`;
  if (!abs.startsWith(prefix)) return abs;
  return abs.slice(prefix.length).replace(/\\+/g, "/");
}

function basename(p: string): string {
  const idx = p.lastIndexOf(sep);
  return idx >= 0 ? p.slice(idx + 1) : p;
}

function walkDir(
  dir: string,
  projectRoot: string,
  visit: (abs: string) => void,
): void {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return;
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) {
      walkDir(abs, projectRoot, visit);
    } else if (st.isFile()) {
      visit(abs);
    }
  }
  // silence unused
  void dirname;
}
