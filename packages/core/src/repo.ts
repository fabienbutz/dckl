import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ShellRunner } from "./auth.js";
import { RepoNotFoundError } from "./errors.js";
import type { RepoCoordinates } from "./types.js";

const execFileAsync = promisify(execFile);

const defaultRunner: ShellRunner = async (bin, args) => {
  const { stdout } = await execFileAsync(bin, args, {
    timeout: 5000,
    maxBuffer: 64 * 1024,
  });
  return stdout;
};

const SSH_RE = /^git@github\.com:([^/]+)\/(.+?)(?:\.git)?\/?$/;
const HTTPS_RE = /^https?:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?\/?$/;

export interface DetectRepoOptions {
  env?: NodeJS.ProcessEnv;
  runner?: ShellRunner;
}

const REPO_HINT =
  "Run from inside a cloned GitHub repo, or set the GH_REPO env var as 'owner/name'.";

function fromEnv(env: NodeJS.ProcessEnv): RepoCoordinates | null {
  const explicit = env.GH_REPO;
  if (!explicit || !explicit.includes("/")) return null;
  const [owner, repo] = explicit.split("/");
  if (!owner || !repo) return null;
  return { owner: owner.trim(), repo: repo.trim() };
}

async function fromGhCli(run: ShellRunner): Promise<RepoCoordinates | null> {
  try {
    const stdout = await run("gh", [
      "repo",
      "view",
      "--json",
      "nameWithOwner",
      "--jq",
      ".nameWithOwner",
    ]);
    const value = stdout.trim();
    if (!value.includes("/")) return null;
    const [owner, repo] = value.split("/");
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

async function fromGitRemote(run: ShellRunner): Promise<RepoCoordinates | null> {
  try {
    const stdout = await run("git", ["remote", "get-url", "origin"]);
    const url = stdout.trim();
    const ssh = SSH_RE.exec(url);
    if (ssh?.[1] && ssh[2]) return { owner: ssh[1], repo: ssh[2] };
    const https = HTTPS_RE.exec(url);
    if (https?.[1] && https[2]) return { owner: https[1], repo: https[2] };
    return null;
  } catch {
    return null;
  }
}

export async function detectRepo(options: DetectRepoOptions = {}): Promise<RepoCoordinates> {
  const env = options.env ?? process.env;
  const run = options.runner ?? defaultRunner;

  const envCoords = fromEnv(env);
  if (envCoords) return envCoords;

  const ghCoords = await fromGhCli(run);
  if (ghCoords) return ghCoords;

  const gitCoords = await fromGitRemote(run);
  if (gitCoords) return gitCoords;

  throw new RepoNotFoundError(
    "Could not detect a GitHub repository in the current directory.",
    REPO_HINT,
  );
}
