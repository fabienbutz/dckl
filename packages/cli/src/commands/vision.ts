import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { findDeckelRoot } from "@deckel/server/storage";

export type VisionInitOptions = {
  northStar?: string;
  audience?: string;
  nonGoals?: string;
  phase?: string;
  yes?: boolean;
  force?: boolean;
};

export async function runVisionInit(options: VisionInitOptions = {}): Promise<void> {
  const deckelRoot = findDeckelRoot(process.cwd());
  if (!deckelRoot) {
    console.error("[deckel] no .deckel/ found — run `deckel init` first");
    process.exitCode = 1;
    return;
  }

  const visionPath = join(deckelRoot, "VISION.md");
  if (existsSync(visionPath) && !options.force) {
    console.error(
      `[deckel vision] ${visionPath} already exists. Use --force to overwrite.`,
    );
    process.exitCode = 1;
    return;
  }

  const answers = await resolveAnswers(options);
  const today = new Date().toISOString().slice(0, 10);
  const content = renderVision({ ...answers, updated: today });
  writeFileSync(visionPath, content, "utf8");

  console.log(`[deckel vision] Wrote ${visionPath}`);
  console.log("              Run `pnpm deckel status` to see it surfaced.");
}

type Answers = {
  northStar: string;
  audience?: string;
  nonGoals: string[];
  phase?: string;
};

async function resolveAnswers(options: VisionInitOptions): Promise<Answers> {
  const nonGoalsFromFlag = parseNonGoals(options.nonGoals);

  if (options.yes || (options.northStar && options.audience)) {
    if (!options.northStar) {
      throw new Error("--north-star is required with --yes");
    }
    return {
      northStar: options.northStar,
      audience: options.audience,
      nonGoals: nonGoalsFromFlag,
      phase: options.phase,
    };
  }

  const rl = createInterface({ input, output });
  try {
    const northStar =
      options.northStar ||
      (await rl.question("North star (one sentence, the eventual state): ")).trim();
    if (!northStar) throw new Error("north star is required");

    const audience =
      options.audience ||
      (await rl.question("Audience (who this is for, one sentence): ")).trim() ||
      undefined;

    const nonGoalsRaw =
      options.nonGoals ||
      (await rl.question(
        "Non-goals (comma-separated; things we deliberately DON'T do): ",
      )).trim();
    const nonGoals = parseNonGoals(nonGoalsRaw);

    const phase =
      options.phase ||
      (await rl.question("Current phase (one slug, e.g. 'mvp' or 'hardening'): ")).trim() ||
      undefined;

    return { northStar, audience, nonGoals, phase };
  } finally {
    rl.close();
  }
}

function parseNonGoals(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function renderVision(a: Answers & { updated: string }): string {
  const parts: string[] = [];
  parts.push("---");
  parts.push("schema: 1");
  parts.push(`north_star: ${JSON.stringify(a.northStar)}`);
  if (a.audience) parts.push(`audience: ${JSON.stringify(a.audience)}`);
  if (a.nonGoals.length > 0) {
    parts.push("non_goals:");
    for (const g of a.nonGoals) parts.push(`  - ${JSON.stringify(g)}`);
  }
  if (a.phase) parts.push(`current_phase: ${a.phase}`);
  parts.push(`updated: ${a.updated}`);
  parts.push("---");
  parts.push("");
  parts.push("## Full Vision");
  parts.push("");
  parts.push(
    "Add longer prose here — the frontmatter is what `deckel status` and",
  );
  parts.push(
    "`deckel export` surface; the body is for humans reading the file directly.",
  );
  parts.push("");
  parts.push(
    "_Reviewed / refreshed: " +
      a.updated +
      ". Stale after ~60 days — `deckel status` will flag it._",
  );
  parts.push("");
  return parts.join("\n");
}
