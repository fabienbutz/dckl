#!/usr/bin/env node
import { existsSync } from "node:fs";
// Copies bundleable assets into the published cli/dist tree.
//
// - skill.md            : the canonical dckl Skill (loaded into user's
//                         .claude/skills/dckl/ by `dckl init`)
// - templates/*.yml     : GitHub Issue templates (Phase 5 will create them)
//
// Missing source files are skipped silently — `dckl init` falls back to
// printing a snippet when an asset is unavailable.
import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cliDir = dirname(here);
const repoRoot = dirname(dirname(cliDir));

const distAssets = join(cliDir, "dist", "assets");
await mkdir(distAssets, { recursive: true });

async function copyIfExists(src, dest) {
  if (!existsSync(src)) {
    console.log(`[copy-assets] skipped (missing): ${src}`);
    return false;
  }
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(src, dest);
  console.log(`[copy-assets] copied: ${src} -> ${dest}`);
  return true;
}

await copyIfExists(
  join(repoRoot, ".claude", "skills", "dckl", "SKILL.md"),
  join(distAssets, "skill.md"),
);

const tmplSrc = join(repoRoot, ".github", "ISSUE_TEMPLATE");
if (existsSync(tmplSrc)) {
  const entries = await readdir(tmplSrc);
  for (const name of entries) {
    if (!name.startsWith("dckl-")) continue;
    const lower = name.toLowerCase();
    if (!lower.endsWith(".yml") && !lower.endsWith(".yaml") && !lower.endsWith(".md")) {
      continue;
    }
    const s = await stat(join(tmplSrc, name));
    if (!s.isFile()) continue;
    await copyIfExists(join(tmplSrc, name), join(distAssets, "templates", name));
  }
} else {
  console.log("[copy-assets] no .github/ISSUE_TEMPLATE/ — skipping templates");
}
