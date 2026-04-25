import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Resolves the absolute path to the project's .dckl/ directory. The project
 * root is determined by walking up from the starting directory until a
 * .dckl/ folder is found, or a sentinel (.git, package.json) is hit.
 */
export function findDcklRoot(startDir: string = process.cwd()): string | null {
  let current = resolve(startDir);
  while (true) {
    const candidate = resolve(current, ".dckl");
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parent = resolve(current, "..");
    if (parent === current) return null;
    current = parent;
  }
}

export type DcklPaths = {
  root: string;
  config: string;
  templates: string;
  sprints: string;
  backlog: string;
  trash: string;
  ignoreFile: string;
  portFile: string;
  vision: string;
};

export function dcklPaths(root: string): DcklPaths {
  return {
    root,
    config: resolve(root, "config.yaml"),
    templates: resolve(root, "templates"),
    sprints: resolve(root, "sprints"),
    backlog: resolve(root, "backlog"),
    trash: resolve(root, ".trash"),
    ignoreFile: resolve(root, ".dcklignore"),
    portFile: resolve(root, ".port"),
    vision: resolve(root, "VISION.md"),
  };
}

export function sprintDir(paths: DcklPaths, sprintId: string): string {
  return resolve(paths.sprints, sprintId);
}

export function sprintIndexFile(paths: DcklPaths, sprintId: string): string {
  return resolve(sprintDir(paths, sprintId), "index.md");
}

export function taskFile(paths: DcklPaths, sprintId: string, taskId: string): string {
  return resolve(sprintDir(paths, sprintId), "tasks", `${taskId}.md`);
}

export function backlogTaskFile(paths: DcklPaths, taskId: string): string {
  return resolve(paths.backlog, `${taskId}.md`);
}
