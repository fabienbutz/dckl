import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CLAUDE_MD_START = "<!-- dckl:start (auto-managed, do not edit between markers) -->";
const CLAUDE_MD_END = "<!-- dckl:end -->";

/**
 * Resolves a bundled asset. In a built dist the layout is
 * `dist/cli.js` + `dist/assets/*.md`; in src (tests, ts-node) it is
 * `src/commands/claude-integration.ts` + `src/assets/*.md`. Try both.
 */
function loadAsset(name: string): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "assets", name),            // dist layout
    resolve(here, "..", "assets", name),      // src layout
  ];
  for (const p of candidates) {
    if (existsSync(p)) return readFileSync(p, "utf8");
  }
  throw new Error(
    `[dckl] asset "${name}" missing — expected one of: ${candidates.join(", ")}`,
  );
}

/**
 * Installs three integration touchpoints for Claude Code:
 *   1. CLAUDE.md managed block (short primer with working-commands table)
 *   2. .claude/skills/dckl/SKILL.md (state-driven, exec-ready protocols)
 *   3. .claude/settings.json PostToolUse hook (auto-heartbeat)
 *
 * Idempotent. Never touches user content outside the managed block.
 */
export function installClaudeIntegration(cwd: string): void {
  installClaudeMd(cwd);
  installSkill(cwd);
  installHook(cwd);
}

function installClaudeMd(cwd: string): void {
  const path = resolve(cwd, "CLAUDE.md");
  const block = loadAsset("claude-block.md").trim();
  const wrapped = `${CLAUDE_MD_START}\n${block}\n${CLAUDE_MD_END}`;

  if (!existsSync(path)) {
    writeFileSync(path, `# Project\n\n${wrapped}\n`, "utf8");
    return;
  }

  const current = readFileSync(path, "utf8");
  const startIdx = current.indexOf(CLAUDE_MD_START);
  const endIdx = current.indexOf(CLAUDE_MD_END);

  if (startIdx >= 0 && endIdx > startIdx) {
    const before = current.slice(0, startIdx);
    const after = current.slice(endIdx + CLAUDE_MD_END.length);
    writeFileSync(path, `${before}${wrapped}${after}`, "utf8");
  } else {
    const sep = current.endsWith("\n") ? "\n" : "\n\n";
    writeFileSync(path, `${current}${sep}${wrapped}\n`, "utf8");
  }
}

function installSkill(cwd: string): void {
  const path = resolve(cwd, ".claude", "skills", "dckl", "SKILL.md");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, loadAsset("skill.md"), "utf8");
}

function installHook(cwd: string): void {
  const path = resolve(cwd, ".claude", "settings.json");
  mkdirSync(dirname(path), { recursive: true });

  type HookEntry = { type: string; command: string };
  type HookMatcher = { matcher?: string; hooks: HookEntry[] };
  type Settings = { hooks?: { PostToolUse?: HookMatcher[] }; [k: string]: unknown };

  let settings: Settings = {};
  if (existsSync(path)) {
    try {
      settings = JSON.parse(readFileSync(path, "utf8")) as Settings;
    } catch {
      console.warn(`[dckl init] ${path} is not valid JSON; skipping hook install`);
      return;
    }
  }

  const DCKL_HOOK: HookEntry = {
    type: "command",
    command: "pnpm dckl heartbeat --silent",
  };
  const MATCHER = "Write|Edit|Bash|NotebookEdit";

  settings.hooks ??= {};
  settings.hooks.PostToolUse ??= [];

  const existing = settings.hooks.PostToolUse.find((m) => m.matcher === MATCHER);
  if (existing) {
    const already = existing.hooks.some((h) => h.command === DCKL_HOOK.command);
    if (!already) existing.hooks.push(DCKL_HOOK);
  } else {
    settings.hooks.PostToolUse.push({
      matcher: MATCHER,
      hooks: [DCKL_HOOK],
    });
  }

  writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

