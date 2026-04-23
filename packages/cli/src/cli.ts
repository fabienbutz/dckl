import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runServe } from "./commands/serve.js";
import { runDoctor } from "./commands/doctor.js";
import { runExport } from "./commands/export.js";
import { runJourneyList, runJourneyNew } from "./commands/journey.js";
import { runSprintClose } from "./commands/sprint.js";
import { runSyncCommits } from "./commands/sync-commits.js";
import { runStatus } from "./commands/status.js";
import { runStop } from "./commands/stop.js";
import { type VisionInitOptions, runVisionInit } from "./commands/vision.js";
import {
  runCheck,
  runCorrectionAdd,
  runCorrectionResolve,
  runHeartbeat,
  runTaskClaim,
  runTaskClose,
  runTaskRelease,
} from "./commands/task.js";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(here, "..", "package.json"), "utf8")) as {
  version: string;
};

const program = new Command();

program
  .name("dckl")
  .description("Local in-repo sprint & security cockpit for AI-assisted development")
  .version(pkg.version, "-v, --version", "Output the current version");

program
  .command("serve", { isDefault: true })
  .description("Start the dckl UI + API server on localhost")
  .option("-p, --port <port>", "Port to listen on (default 4321)", (value) =>
    Number.parseInt(value, 10),
  )
  .option(
    "--no-memory",
    "Disable the Claude Code memory scanner (screenshare/demo-safe)",
  )
  .action(async (opts: { port?: number; memory?: boolean }) => {
    await runServe({ port: opts.port, noMemory: opts.memory === false });
  });

program
  .command("stop")
  .description("Gracefully stop the running dckl server (reads .dckl/.port)")
  .option("--force", "Escalate to SIGKILL if SIGTERM does not land within the timeout")
  .option("--timeout <ms>", "How long to wait for graceful exit (default 2000)", (v) =>
    Number.parseInt(v, 10),
  )
  .action(async (opts: { force?: boolean; timeout?: number }) => {
    await runStop({ force: opts.force, timeoutMs: opts.timeout });
  });

program
  .command("init")
  .description("Scaffold a .dckl/ directory in the current project")
  .option("-n, --name <name>", "Project name (default: current directory name)")
  .option("-p, --prefix <prefix>", "Task-ID prefix (default: TSK)")
  .option("-y, --yes", "Non-interactive — accept all defaults")
  .option("--no-demo", "Skip the five-minute welcome sprint (default: include it)")
  .action(async (opts: { name?: string; prefix?: string; yes?: boolean; demo?: boolean }) => {
    // commander translates --no-demo to { demo: false }
    await runInit({ ...opts, noDemo: opts.demo === false });
  });

const taskCmd = program
  .command("task")
  .description("Task operations (claim / release — used by AI agents and CLI tooling)");

taskCmd
  .command("claim <id>")
  .description("Mark a task as actively worked on (writes .dckl/.active-task)")
  .option("--by <agent>", "Agent name (default: claude-code)")
  .action(async (id: string, opts: { by?: string }) => {
    await runTaskClaim(id, opts);
  });

taskCmd
  .command("release <id>")
  .description("Release an active task claim")
  .action(async (id: string) => {
    await runTaskRelease(id);
  });

taskCmd
  .command("close <id>")
  .description("Mark a task as done (atomic PATCH + claim release)")
  .option("--force", "Close even if reminders (security_checks) are still open")
  .action(async (id: string, opts: { force?: boolean }) => {
    await runTaskClose(id, opts);
  });

program
  .command("heartbeat")
  .description("Emit a heartbeat for the currently active task (silent by default)")
  .option("--silent", "Suppress all output even on error")
  .action(async (opts: { silent?: boolean }) => {
    await runHeartbeat(opts);
  });

program
  .command("check <task-id> <check-id>")
  .description("Toggle a reminder or test check on a task (finds it by ID)")
  .action(async (taskId: string, checkId: string) => {
    await runCheck(taskId, checkId);
  });

const correctionCmd = program
  .command("correction")
  .description("Correction operations (notes surfaced during implementation)");

correctionCmd
  .command("add <task-id> <text>")
  .description("Append a correction (a new issue discovered while working)")
  .action(async (taskId: string, text: string) => {
    await runCorrectionAdd(taskId, text);
  });

correctionCmd
  .command("resolve <task-id> <cid>")
  .description("Mark a correction as resolved (sets open: false)")
  .option("--target-sprint <slug>", "Forward the correction to a future sprint")
  .action(async (taskId: string, cid: string, opts: { targetSprint?: string }) => {
    await runCorrectionResolve(taskId, cid, opts);
  });

program
  .command("status")
  .description("Print a project status report (vision, active sprint, gaps, recent commits)")
  .option("--git-days <n>", "How many days of git history to include (default 14)", (v) =>
    Number.parseInt(v, 10),
  )
  .option("--json", "Output JSON instead of Markdown")
  .action(async (opts: { gitDays?: number; json?: boolean }) => {
    await runStatus(opts);
  });

program
  .command("export <task-id>")
  .description("Print a structured Claude prompt with all context for a task")
  .action(async (taskId: string) => {
    await runExport(taskId);
  });

program
  .command("sync-commits [sprint-id]")
  .description("Print every commit referencing a task id in the given (or active) sprint")
  .option("--json", "Output JSON instead of Markdown")
  .action(async (sprintId: string | undefined, opts: { json?: boolean }) => {
    await runSyncCommits({ sprintId, json: opts.json });
  });

program
  .command("doctor")
  .description("Audit .dckl/ and Claude integration for consistency issues")
  .option("--json", "Output JSON instead of Markdown")
  .option("--fix", "Auto-clear safely-fixable issues (e.g. orphan `.active-task`)")
  .action(async (opts: { json?: boolean; fix?: boolean }) => {
    const { code } = await runDoctor(opts);
    process.exit(code);
  });

const sprintCmd = program
  .command("sprint")
  .description("Sprint operations (archive, close — sprint creation is manual for now)");

sprintCmd
  .command("close <id>")
  .description("Archive a sprint: write SUMMARY.md, set status=done, move to .archive/")
  .option("--force", "Close even if non-done tasks remain")
  .option("--dry-run", "Print the plan without writing anything")
  .action(async (id: string, opts: { force?: boolean; dryRun?: boolean }) => {
    await runSprintClose(id, opts);
  });

const journeyCmd = program
  .command("journey")
  .description("Journey operations (ordered route flows that cross sprints)");

journeyCmd
  .command("new <slug>")
  .description("Scaffold a new journey at .dckl/journeys/<slug>.md")
  .option("-n, --name <name>", "Human-readable name (default: derived from the slug)")
  .option("-d, --description <text>", "One-line description")
  .action(async (slug: string, opts: { name?: string; description?: string }) => {
    await runJourneyNew(slug, opts);
  });

journeyCmd
  .command("list")
  .description("List journeys with their done/broken step counts")
  .action(async () => {
    await runJourneyList();
  });

const visionCmd = program.command("vision").description("Project vision operations");

visionCmd
  .command("init")
  .description("Scaffold .dckl/VISION.md (the project's north-star anchor)")
  .option("-n, --north-star <text>", "North star — one sentence, the eventual state")
  .option("-a, --audience <text>", "Who this is for, specifically")
  .option("-g, --non-goals <csv>", "Things we deliberately don't do (comma-separated)")
  .option("-p, --phase <slug>", "Current phase (e.g. 'mvp', 'hardening')")
  .option("-y, --yes", "Non-interactive — requires --north-star")
  .option("--force", "Overwrite an existing VISION.md")
  .action(async (opts: VisionInitOptions) => {
    await runVisionInit(opts);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
