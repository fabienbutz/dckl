import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Resolves the absolute path to the project's .deckel/ directory. The project
 * root is determined by walking up from the starting directory until a
 * .deckel/ folder is found, or a sentinel (.git, package.json) is hit.
 */
export function findDeckelRoot(startDir: string = process.cwd()): string | null {
  let current = resolve(startDir);
  while (true) {
    const candidate = resolve(current, ".deckel");
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parent = resolve(current, "..");
    if (parent === current) return null;
    current = parent;
  }
}

export type DeckelPaths = {
  root: string;
  config: string;
  templates: string;
  sprints: string;
  trash: string;
  ignoreFile: string;
  portFile: string;
};

export function deckelPaths(root: string): DeckelPaths {
  return {
    root,
    config: resolve(root, "config.yaml"),
    templates: resolve(root, "templates"),
    sprints: resolve(root, "sprints"),
    trash: resolve(root, ".trash"),
    ignoreFile: resolve(root, ".deckelignore"),
    portFile: resolve(root, ".port"),
  };
}

export function sprintDir(paths: DeckelPaths, sprintId: string): string {
  return resolve(paths.sprints, sprintId);
}

export function sprintIndexFile(paths: DeckelPaths, sprintId: string): string {
  return resolve(sprintDir(paths, sprintId), "index.md");
}

export function taskFile(paths: DeckelPaths, sprintId: string, taskId: string): string {
  return resolve(sprintDir(paths, sprintId), "tasks", `${taskId}.md`);
}
