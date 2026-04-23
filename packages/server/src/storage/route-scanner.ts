import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

export type RouteEntry = {
  route: string;
  file: string; // project-relative
};

export type ScanResult = {
  framework: "nextjs" | "custom" | "none";
  entries: RouteEntry[];
  scannedRoots: string[];
};

/**
 * Scan a project for frontend route files and derive route paths.
 *
 * Today: Next.js only (both `app/` App Router and `pages/` Pages Router).
 * Override via `scanOptions.roots` / `scanOptions.pageFile`, which runs
 * the raw scanner on arbitrary directories + filenames — useful for
 * custom layouts without touching the adapter code.
 */
export type ScanOptions = {
  /** Absolute path to the project root. */
  projectRoot: string;
  /** Override root directories relative to projectRoot. */
  roots?: string[];
  /** Override allowed page basenames (e.g. ["page.tsx", "page.ts"]). */
  pageFile?: string[];
};

const NEXTJS_APP_PAGE_FILES = ["page.tsx", "page.ts", "page.jsx", "page.js"];
const NEXTJS_PAGES_EXTS = [".tsx", ".ts", ".jsx", ".js"];
const NEXTJS_PAGES_IGNORE = /^_(app|document|error|middleware)\b/;

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  "dist",
  "build",
  "out",
  "coverage",
]);

export function scanRoutes(opts: ScanOptions): ScanResult {
  if (opts.roots && opts.roots.length > 0) {
    return customScan(opts);
  }

  const isNextJs = detectNextJs(opts.projectRoot);
  if (isNextJs) return scanNextJs(opts.projectRoot);

  return { framework: "none", entries: [], scannedRoots: [] };
}

function detectNextJs(projectRoot: string): boolean {
  for (const f of ["next.config.js", "next.config.mjs", "next.config.ts", "next.config.cjs"]) {
    if (existsSync(join(projectRoot, f))) return true;
  }
  return false;
}

function scanNextJs(projectRoot: string): ScanResult {
  const entries: RouteEntry[] = [];
  const scannedRoots: string[] = [];

  // App Router.
  const appDir = join(projectRoot, "app");
  if (existsSync(appDir) && statSync(appDir).isDirectory()) {
    scannedRoots.push("app");
    walkApp(appDir, appDir, projectRoot, entries);
  }
  // Legacy Pages Router.
  const pagesDir = join(projectRoot, "pages");
  if (existsSync(pagesDir) && statSync(pagesDir).isDirectory()) {
    scannedRoots.push("pages");
    walkPages(pagesDir, pagesDir, projectRoot, entries);
  }
  // Nested `src/app` or `src/pages` — common in larger repos.
  const srcApp = join(projectRoot, "src", "app");
  if (existsSync(srcApp) && statSync(srcApp).isDirectory()) {
    scannedRoots.push("src/app");
    walkApp(srcApp, srcApp, projectRoot, entries);
  }
  const srcPages = join(projectRoot, "src", "pages");
  if (existsSync(srcPages) && statSync(srcPages).isDirectory()) {
    scannedRoots.push("src/pages");
    walkPages(srcPages, srcPages, projectRoot, entries);
  }

  entries.sort((a, b) => a.route.localeCompare(b.route));
  return { framework: "nextjs", entries, scannedRoots };
}

function walkApp(
  baseDir: string,
  currentDir: string,
  projectRoot: string,
  out: RouteEntry[],
): void {
  let children: string[];
  try {
    children = readdirSync(currentDir);
  } catch {
    return;
  }
  for (const name of children) {
    if (IGNORED_DIRS.has(name)) continue;
    const full = join(currentDir, name);
    let st: ReturnType<typeof statSync>;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walkApp(baseDir, full, projectRoot, out);
      continue;
    }
    if (!NEXTJS_APP_PAGE_FILES.includes(name)) continue;
    const rel = relative(baseDir, currentDir);
    const route = appRelToRoute(rel);
    out.push({ route, file: relative(projectRoot, full).split(sep).join("/") });
  }
}

function walkPages(
  baseDir: string,
  currentDir: string,
  projectRoot: string,
  out: RouteEntry[],
): void {
  let children: string[];
  try {
    children = readdirSync(currentDir);
  } catch {
    return;
  }
  for (const name of children) {
    if (IGNORED_DIRS.has(name) || name.startsWith(".")) continue;
    const full = join(currentDir, name);
    let st: ReturnType<typeof statSync>;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (name === "api") continue; // Pages Router API routes — not UI pages.
      walkPages(baseDir, full, projectRoot, out);
      continue;
    }
    const ext = name.slice(name.lastIndexOf("."));
    if (!NEXTJS_PAGES_EXTS.includes(ext)) continue;
    const stem = name.slice(0, -ext.length);
    if (NEXTJS_PAGES_IGNORE.test(stem)) continue;
    const relDir = relative(baseDir, currentDir);
    const route = pagesRelToRoute(relDir, stem);
    out.push({ route, file: relative(projectRoot, full).split(sep).join("/") });
  }
}

function appRelToRoute(relDir: string): string {
  if (!relDir || relDir === ".") return "/";
  const parts = relDir.split(sep).filter((seg) => {
    if (!seg) return false;
    if (seg.startsWith("(") && seg.endsWith(")")) return false; // route group
    if (seg.startsWith("@")) return false; // parallel route
    return true;
  });
  return parts.length > 0 ? `/${parts.join("/")}` : "/";
}

function pagesRelToRoute(relDir: string, stem: string): string {
  const parts = relDir ? relDir.split(sep).filter(Boolean) : [];
  const segments = [...parts];
  if (stem !== "index") segments.push(stem);
  return segments.length > 0 ? `/${segments.join("/")}` : "/";
}

function customScan(opts: ScanOptions): ScanResult {
  const entries: RouteEntry[] = [];
  const scannedRoots: string[] = [];
  const pageFiles = opts.pageFile;
  for (const rel of opts.roots ?? []) {
    const abs = join(opts.projectRoot, rel);
    if (!existsSync(abs) || !statSync(abs).isDirectory()) continue;
    scannedRoots.push(rel);
    walkCustom(abs, abs, opts.projectRoot, entries, pageFiles);
  }
  entries.sort((a, b) => a.route.localeCompare(b.route));
  return { framework: "custom", entries, scannedRoots };
}

function walkCustom(
  baseDir: string,
  currentDir: string,
  projectRoot: string,
  out: RouteEntry[],
  pageFiles?: string[],
): void {
  let children: string[];
  try {
    children = readdirSync(currentDir);
  } catch {
    return;
  }
  for (const name of children) {
    if (IGNORED_DIRS.has(name) || name.startsWith(".")) continue;
    const full = join(currentDir, name);
    let st: ReturnType<typeof statSync>;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walkCustom(baseDir, full, projectRoot, out, pageFiles);
      continue;
    }
    if (pageFiles && !pageFiles.includes(name)) continue;
    const rel = relative(baseDir, currentDir);
    const route = appRelToRoute(rel);
    out.push({ route, file: relative(projectRoot, full).split(sep).join("/") });
  }
}
