import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { findDcklRoot, scanRoutes } from "@dckl/server/storage";

export type PagesCmdOptions = { json?: boolean };

export async function runPages(opts: PagesCmdOptions = {}): Promise<void> {
  const dcklRoot = findDcklRoot(process.cwd());
  if (!dcklRoot) {
    console.error("[dckl] no .dckl/ found — run `dckl init` first");
    process.exit(1);
  }
  const projectRoot = resolve(dcklRoot, "..");

  const { roots, pageFile } = readPagesConfig(dcklRoot);
  const result = scanRoutes({ projectRoot, roots, pageFile });

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.entries.length === 0) {
    if (result.framework === "none") {
      console.log(
        "[dckl] no frontend framework detected and no `pages.roots` in config.yaml.",
      );
      console.log("        Set `pages.roots: [<dir>]` explicitly if you want a scan here.");
    } else {
      console.log(`[dckl] ${result.framework}: no page files found.`);
    }
    return;
  }

  console.log(`# Pages — ${result.framework} (${result.scannedRoots.join(", ")})`);
  console.log("");
  for (const e of result.entries) {
    console.log(`- \`${e.route}\`  ${e.file}`);
  }
}

type PagesConfigShape = { pages?: { roots?: unknown; page_file?: unknown } };

function readPagesConfig(dcklRoot: string): {
  roots?: string[];
  pageFile?: string[];
} {
  const path = join(dcklRoot, "config.yaml");
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, "utf8");
  // Tiny hand-parser for the `pages:` section. We don't want to pull in
  // a full YAML loader for one optional block; the CLI is latency-
  // sensitive.
  const block = extractBlock(raw, "pages");
  if (!block) return {};
  const cfg: PagesConfigShape = { pages: {} };
  for (const line of block) {
    const m = /^\s*(roots|page_file):\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1] as "roots" | "page_file";
    const rest = (m[2] ?? "").trim();
    if (rest.startsWith("[") && rest.endsWith("]")) {
      cfg.pages = cfg.pages ?? {};
      cfg.pages[key] = parseInlineList(rest);
    }
  }
  return {
    roots: toStringArray(cfg.pages?.roots),
    pageFile: toStringArray(cfg.pages?.page_file),
  };
}

function extractBlock(raw: string, key: string): string[] | null {
  const lines = raw.split("\n");
  const startIdx = lines.findIndex((l) => new RegExp(`^${key}:\\s*$|^${key}:\\s*$`).test(l));
  if (startIdx === -1) return null;
  const block: string[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^\S/.test(line) && line.trim() !== "") break;
    block.push(line);
  }
  return block;
}

function parseInlineList(s: string): string[] {
  return s
    .slice(1, -1)
    .split(",")
    .map((t) => t.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

function toStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === "string");
  return out.length > 0 ? out : undefined;
}
