import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cliRoot = resolve(here, "..");
const uiDistSrc = resolve(cliRoot, "..", "ui", "dist");
const uiDistDst = resolve(cliRoot, "dist", "ui");

if (!existsSync(uiDistSrc)) {
  console.error(`[copy-ui] UI dist not found at ${uiDistSrc}`);
  console.error("[copy-ui] Build @dckl/ui first (pnpm --filter @dckl/ui build)");
  process.exit(1);
}

if (existsSync(uiDistDst)) {
  rmSync(uiDistDst, { recursive: true, force: true });
}

cpSync(uiDistSrc, uiDistDst, { recursive: true });
console.log(`[copy-ui] Copied ${uiDistSrc} → ${uiDistDst}`);
