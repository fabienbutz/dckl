import { Command } from "commander";
import { runDoctor } from "./commands/doctor.js";
import { runInit } from "./commands/init.js";
import { runStatus } from "./commands/status.js";

const program = new Command();

program
  .name("dckl")
  .description("dckl: discipline layer over GitHub Issues. No calendar, by design.")
  .version("0.1.0");

program
  .command("init")
  .description("Wire dckl into the current repo: .mcp.json entry, skill, issue templates, labels.")
  .option("--yes", "Skip confirmation prompts; apply all steps non-interactively.")
  .option("--print-only", "Print the .mcp.json snippet only; do not write any files.")
  .option("--update-skill", "Refresh .claude/skills/dckl/SKILL.md only; skip every other step.")
  .action(async (opts) => {
    await runInit({
      yes: Boolean(opts.yes),
      printOnly: Boolean(opts.printOnly),
      updateSkill: Boolean(opts.updateSkill),
    });
  });

program
  .command("status")
  .description("Print a human-readable summary of the active sprint and in-flight tasks.")
  .option("--json", "Output as JSON instead of Markdown.")
  .action(async (opts) => {
    await runStatus({ json: Boolean(opts.json) });
  });

program
  .command("doctor")
  .description("Audit the repo for dckl-schema drift. Read-only; never mutates state.")
  .option("--json", "Output as JSON instead of Markdown.")
  .action(async (opts) => {
    await runDoctor({ json: Boolean(opts.json) });
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`dckl: ${message}\n`);
  process.exit(1);
});
