import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AuthError } from "./errors.js";

const execFileAsync = promisify(execFile);

export type ShellRunner = (bin: string, args: string[]) => Promise<string>;

const defaultRunner: ShellRunner = async (bin, args) => {
  const { stdout } = await execFileAsync(bin, args, {
    timeout: 5000,
    maxBuffer: 64 * 1024,
  });
  return stdout;
};

export interface ResolveAuthOptions {
  env?: NodeJS.ProcessEnv;
  ghBinary?: string;
  runner?: ShellRunner;
}

const AUTH_HINT =
  "Set the GH_TOKEN env var, or run `gh auth login` to authenticate the gh CLI.";

export async function resolveAuth(options: ResolveAuthOptions = {}): Promise<string> {
  const env = options.env ?? process.env;
  const ghBin = options.ghBinary ?? "gh";
  const run = options.runner ?? defaultRunner;

  const fromEnv = env.GH_TOKEN ?? env.GITHUB_TOKEN;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }

  let stdout: string;
  try {
    stdout = await run(ghBin, ["auth", "token"]);
  } catch {
    throw new AuthError("GitHub authentication failed.", AUTH_HINT);
  }

  const token = stdout.trim();
  if (token.length === 0) {
    throw new AuthError("GitHub authentication returned an empty token.", AUTH_HINT);
  }
  return token;
}
