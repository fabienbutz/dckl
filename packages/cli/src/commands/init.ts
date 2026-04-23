import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import {
  renderStarterSprint,
  renderStarterTask01,
  renderStarterTask02,
  renderStarterTask03,
} from "../starter-templates.js";
import { installClaudeIntegration } from "./claude-integration.js";

export type InitOptions = {
  name?: string;
  prefix?: string;
  yes?: boolean;
  cwd?: string;
  /** Skip the five-minute welcome sprint. Default: include it. */
  noDemo?: boolean;
};

const PREFIX_REGEX = /^[A-Z][A-Z0-9]*$/;

export async function runInit(options: InitOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const deckelDir = resolve(cwd, ".deckel");

  if (existsSync(deckelDir)) {
    console.error(`[deckel init] .deckel/ already exists at ${deckelDir}`);
    console.error("              Refusing to overwrite. Remove it first if you want to re-init.");
    process.exitCode = 1;
    return;
  }

  const defaultName = basename(resolve(cwd));
  const { name, prefix } = await resolveAnswers(options, defaultName);

  scaffold(deckelDir, { name, prefix });
  if (!options.noDemo) {
    scaffoldWelcomeSprint(deckelDir, prefix);
  }
  installClaudeIntegration(cwd);

  console.log(`[deckel init] Scaffolded ${deckelDir}`);
  console.log("              + CLAUDE.md managed block installed");
  console.log("              + .claude/skills/deckel/SKILL.md installed");
  console.log("              + .claude/settings.json heartbeat hook installed");
  if (!options.noDemo) {
    console.log("              + welcome sprint (3 teaching tasks) — delete anytime");
  }
  console.log("              Next: pnpm deckel (or npx @deckel/cli serve)");
}

async function resolveAnswers(
  options: InitOptions,
  defaultName: string,
): Promise<{ name: string; prefix: string }> {
  if (options.yes || (options.name && options.prefix)) {
    const prefix = (options.prefix ?? "TSK").toUpperCase();
    validatePrefix(prefix);
    return { name: options.name ?? defaultName, prefix };
  }

  const rl = createInterface({ input, output });
  try {
    let name = options.name;
    if (!name) {
      const answer = (await rl.question(`Project name [${defaultName}]: `)).trim();
      name = answer || defaultName;
    }

    let prefix = options.prefix;
    if (!prefix) {
      const answer = (await rl.question("Task-ID prefix [TSK]: ")).trim();
      prefix = (answer || "TSK").toUpperCase();
    }
    validatePrefix(prefix);
    return { name, prefix };
  } finally {
    rl.close();
  }
}

function validatePrefix(prefix: string): void {
  if (!PREFIX_REGEX.test(prefix)) {
    throw new Error(
      `Invalid prefix "${prefix}" — must be uppercase alphanumeric starting with a letter (e.g. TSK, DCK, ENG).`,
    );
  }
  if (prefix.length > 8) {
    throw new Error(`Prefix "${prefix}" is too long (max 8 characters).`);
  }
}

type ScaffoldOptions = { name: string; prefix: string };

function scaffold(deckelDir: string, { name, prefix }: ScaffoldOptions): void {
  mkdirSync(deckelDir, { recursive: true });
  mkdirSync(join(deckelDir, "sprints"), { recursive: true });
  mkdirSync(join(deckelDir, "templates"), { recursive: true });
  mkdirSync(join(deckelDir, ".trash"), { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  writeFileSync(join(deckelDir, "config.yaml"), renderConfigYaml(name, prefix, today));
  writeFileSync(join(deckelDir, "templates", "security-checks.yaml"), DEFAULT_SECURITY_TEMPLATE);
  writeFileSync(join(deckelDir, "templates", "test-categories.yaml"), DEFAULT_TEST_CATEGORIES);
  writeFileSync(join(deckelDir, ".deckelignore"), DEFAULT_IGNORE);
  writeFileSync(join(deckelDir, ".gitignore"), ".trash/\n.port\n.active-task\n");
}

function scaffoldWelcomeSprint(deckelDir: string, prefix: string): void {
  const sprintDir = join(deckelDir, "sprints", "sprint-00-welcome");
  const tasksDir = join(sprintDir, "tasks");
  mkdirSync(tasksDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  writeFileSync(join(sprintDir, "index.md"), renderStarterSprint(prefix, today, weekLater));
  writeFileSync(join(tasksDir, `${prefix}-01.md`), renderStarterTask01(prefix));
  writeFileSync(join(tasksDir, `${prefix}-02.md`), renderStarterTask02(prefix));
  writeFileSync(join(tasksDir, `${prefix}-03.md`), renderStarterTask03(prefix));
}

function renderConfigYaml(name: string, prefix: string, created: string): string {
  return `schema: 1
project:
  name: ${JSON.stringify(name)}
  created: ${created}
  version: 1
ui:
  port: 4321
  theme: dark
task_id_prefix: ${prefix}
defaults:
  security_check_template: default
  test_categories:
    - unit
    - integration
    - manual
    - security
`;
}

const DEFAULT_SECURITY_TEMPLATE = `# Reminders surfaced as acceptance criteria on each task. These are prompts
# for the implementer — checking them does NOT prove compliance, it only
# records that the implementer considered them.
templates:
  default:
    - id: gdpr-storage
      label: "DSGVO-conforming storage of personal data"
      category: gdpr
    - id: 2fa-available
      label: "2FA available on authenticated routes"
      category: auth
    - id: passkey-support
      label: "Passkey / WebAuthn Level 2 supported where relevant"
      category: auth
    - id: rate-limiting
      label: "Rate-limiting on sensitive endpoints"
      category: hardening
    - id: input-validation
      label: "Server-side input validation (schema + size limits)"
      category: hardening
    - id: secrets-not-committed
      label: "No secrets committed to the repo"
      category: ops
`;

const DEFAULT_TEST_CATEGORIES = `categories:
  - id: unit
    label: "Unit tests"
  - id: integration
    label: "Integration tests"
  - id: manual
    label: "Manual verification"
  - id: security
    label: "Security / threat modelling"
`;

const DEFAULT_IGNORE = `# Additional glob patterns to exclude from deckel's inventory scan.
# Built-ins (node_modules, .git, dist, build, coverage, .next, .turbo, .cache)
# are always ignored.
`;
