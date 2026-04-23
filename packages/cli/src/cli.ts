import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runServe } from "./commands/serve.js";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(here, "..", "package.json"), "utf8")) as {
  version: string;
};

const program = new Command();

program
  .name("deckel")
  .description("Local in-repo sprint & security cockpit for AI-assisted development")
  .version(pkg.version, "-v, --version", "Output the current version");

program
  .command("serve", { isDefault: true })
  .description("Start the Deckel UI + API server on localhost")
  .option("-p, --port <port>", "Port to listen on (default 4321)", (value) =>
    Number.parseInt(value, 10),
  )
  .action(async (opts: { port?: number }) => {
    await runServe({ port: opts.port });
  });

program
  .command("init")
  .description("Scaffold a .deckel/ directory in the current project")
  .option("-n, --name <name>", "Project name (default: current directory name)")
  .option("-p, --prefix <prefix>", "Task-ID prefix (default: TSK)")
  .option("-y, --yes", "Non-interactive — accept all defaults")
  .action(async (opts: { name?: string; prefix?: string; yes?: boolean }) => {
    await runInit(opts);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
