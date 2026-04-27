import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import {
  DCKL_LABELS,
  type DcklOctokit,
  Runtime,
  type RepoCoordinates,
} from "@dckl/core";

export interface InitOptions {
  yes: boolean;
  printOnly: boolean;
  updateSkill: boolean;
}

const MCP_SNIPPET = {
  command: "npx",
  args: ["-y", "@dckl/mcp@latest"],
};

const LABEL_DEFS: Record<
  (typeof DCKL_LABELS)[number],
  { color: string; description: string }
> = {
  "status:todo": { color: "ededed", description: "dckl: not started" },
  "status:in-progress": { color: "fbca04", description: "dckl: actively claimed" },
  "status:review": { color: "0e8a16", description: "dckl: needs review" },
  "status:done": { color: "5319e7", description: "dckl: shipped" },
  "priority:must": { color: "b60205", description: "dckl: must ship this sprint" },
  "priority:should": { color: "d93f0b", description: "dckl: should ship if time" },
  "priority:could": { color: "1d76db", description: "dckl: nice to have" },
  "type:feat": { color: "0e8a16", description: "dckl: new feature" },
  "type:bug": { color: "d73a4a", description: "dckl: bug fix" },
  "type:chore": { color: "cfd3d7", description: "dckl: maintenance" },
  "type:refactor": { color: "5319e7", description: "dckl: refactor" },
};

function log(line: string): void {
  process.stdout.write(`${line}\n`);
}

async function confirm(question: string, opts: InitOptions, def = true): Promise<boolean> {
  if (opts.yes) return true;
  const rl = createInterface({ input, output });
  try {
    const ans = await rl.question(`${question} [${def ? "Y/n" : "y/N"}] `);
    const trimmed = ans.trim();
    if (!trimmed) return def;
    return /^y(es)?$/i.test(trimmed);
  } finally {
    rl.close();
  }
}

function assetPath(...parts: string[]): string {
  return fileURLToPath(new URL(`./assets/${parts.join("/")}`, import.meta.url));
}

function readJsonSafe(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

interface McpJson {
  mcpServers?: Record<string, unknown>;
  [key: string]: unknown;
}

async function patchMcpJson(opts: InitOptions): Promise<void> {
  const path = resolve(process.cwd(), ".mcp.json");
  const snippet = { mcpServers: { dckl: MCP_SNIPPET } };

  if (opts.printOnly) {
    log("\nAdd this to your .mcp.json:");
    log(JSON.stringify(snippet, null, 2));
    return;
  }

  const existing = readJsonSafe(path) as McpJson | null;
  if (!existing) {
    if (await confirm("Create .mcp.json with the dckl entry?", opts)) {
      writeFileSync(path, `${JSON.stringify(snippet, null, 2)}\n`, "utf-8");
      log(`✓ wrote ${path}`);
    } else {
      log("- skipped .mcp.json");
    }
    return;
  }

  const servers = (existing.mcpServers ?? {}) as Record<string, unknown>;
  if (servers.dckl) {
    if (
      !(await confirm(
        "An existing .mcp.json already has a 'dckl' entry. Overwrite?",
        opts,
        false,
      ))
    ) {
      log("- kept existing .mcp.json dckl entry");
      return;
    }
  }
  const merged: McpJson = {
    ...existing,
    mcpServers: { ...servers, dckl: MCP_SNIPPET },
  };
  writeFileSync(path, `${JSON.stringify(merged, null, 2)}\n`, "utf-8");
  log(`✓ updated ${path}`);
}

async function copySkill(opts: InitOptions): Promise<void> {
  const src = assetPath("skill.md");
  const dest = resolve(process.cwd(), ".claude", "skills", "dckl", "SKILL.md");

  if (!existsSync(src)) {
    log(`- skill asset missing in this build (${src}); skipping`);
    return;
  }

  const exists = existsSync(dest);
  const promptText = exists
    ? "Overwrite .claude/skills/dckl/SKILL.md with the bundled version?"
    : "Install dckl skill at .claude/skills/dckl/SKILL.md?";
  if (!(await confirm(promptText, opts, true))) {
    log(`- skipped skill install (${dest})`);
    return;
  }
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(src, dest);
  log(`✓ ${exists ? "updated" : "installed"} ${dest}`);
}

async function copyTemplates(opts: InitOptions): Promise<void> {
  const tmplDir = assetPath("templates");
  const candidates = [
    `${tmplDir}/dckl-task.md`,
    `${tmplDir}/dckl-task.yml`,
    `${tmplDir}/dckl-correction.md`,
    `${tmplDir}/dckl-correction.yml`,
  ].filter((p) => existsSync(p));

  if (candidates.length === 0) {
    log("- no issue templates bundled in this build; skipping");
    return;
  }

  if (!(await confirm("Install dckl issue templates into .github/ISSUE_TEMPLATE/?", opts))) {
    log("- skipped issue templates");
    return;
  }
  const targetDir = resolve(process.cwd(), ".github", "ISSUE_TEMPLATE");
  await mkdir(targetDir, { recursive: true });
  for (const src of candidates) {
    const name = src.split("/").pop() ?? "unknown";
    const dest = `${targetDir}/${name}`;
    await copyFile(src, dest);
    log(`✓ wrote ${dest}`);
  }
}

async function ensureLabels(
  client: DcklOctokit,
  repo: RepoCoordinates,
  opts: InitOptions,
): Promise<void> {
  if (
    !(await confirm(
      `Create the 11 dckl labels in ${repo.owner}/${repo.repo}?`,
      opts,
    ))
  ) {
    log("- skipped label creation");
    return;
  }
  let created = 0;
  let existed = 0;
  for (const name of DCKL_LABELS) {
    const def = LABEL_DEFS[name];
    try {
      await client.rest.issues.createLabel({
        owner: repo.owner,
        repo: repo.repo,
        name,
        color: def.color,
        description: def.description,
      });
      created++;
    } catch (err: unknown) {
      const status =
        err && typeof err === "object" && "status" in err
          ? (err as { status: number }).status
          : 0;
      if (status === 422) {
        existed++;
        continue;
      }
      log(`! failed to create label "${name}": ${(err as Error).message ?? "unknown"}`);
    }
  }
  log(`✓ labels: ${created} created, ${existed} already existed`);
}

export async function runInit(opts: InitOptions): Promise<void> {
  log("dckl init — wiring this repo for the temporal-sterile MCP layer.\n");

  if (opts.updateSkill) {
    await copySkill({ ...opts, yes: true });
    return;
  }

  if (opts.printOnly) {
    await patchMcpJson(opts);
    log("\n(--print-only: no files written, no labels created)");
    return;
  }

  // .mcp.json — no GitHub call needed
  await patchMcpJson(opts);

  // Skill + templates — local file copies only
  await copySkill(opts);
  await copyTemplates(opts);

  // Labels — needs gh auth + repo detection
  try {
    const runtime = new Runtime();
    const [client, repo] = await Promise.all([runtime.getClient(), runtime.getRepo()]);
    await ensureLabels(client, repo, opts);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log(`! label step skipped: ${message}`);
    log("  (set GH_TOKEN or run \`gh auth login\`, then \`dckl init --yes\`)");
  }

  log("\ndone. Restart Claude Code, then ask: \"dckl status?\"");
}
