import matter from "gray-matter";
import yaml from "js-yaml";
import * as v from "valibot";
import type { Sprint, Task } from "../schema/index.js";
import { SprintMeta, TaskMeta } from "../schema/index.js";

// Force gray-matter to use the JSON subset when loading YAML frontmatter.
// Otherwise `start: 2026-04-22` parses as a JS Date, not a string — our
// schemas treat all dates as ISO strings.
const GRAY_MATTER_OPTIONS = {
  engines: {
    yaml: (str: string): object =>
      (yaml.load(str, { schema: yaml.JSON_SCHEMA }) ?? {}) as object,
  },
};

/**
 * Parses an on-disk markdown file (Sprint index or Task) into a validated
 * domain object. Throws if the frontmatter does not satisfy the schema — the
 * file has been hand-edited into an invalid state and the user must fix it.
 */
export function parseSprint(content: string): Sprint {
  const parsed = matter(content, GRAY_MATTER_OPTIONS);
  const meta = v.parse(SprintMeta, parsed.data);
  return { meta, body: parsed.content.trimStart() };
}

export function parseTask(content: string): Task {
  const parsed = matter(content, GRAY_MATTER_OPTIONS);
  const meta = v.parse(TaskMeta, parsed.data);
  const body = parsed.content.trimStart();
  return { meta, body, summary: extractSummary(body) };
}

/**
 * Extracts a one-line summary from a task body. Skips leading `##` headings
 * (the task title/intro), walks through any immediately-following `###`
 * sub-headings, and grabs the first prose block. Returns null when the body
 * is empty or only contains headings. Strips basic markdown inline
 * formatting so the sidebar is readable at a glance.
 */
export function extractSummary(body: string, maxChars = 160): string | null {
  const lines = body.split("\n");
  const prose: string[] = [];
  let i = 0;

  // Skip a leading `##` heading (task title line) if present.
  while (i < lines.length && (lines[i] ?? "").trim() === "") i++;
  if (i < lines.length && /^##\s+/.test((lines[i] ?? "").trim())) i++;

  while (i < lines.length) {
    const line = (lines[i] ?? "").trim();
    if (!line) {
      if (prose.length > 0) break;
      i++;
      continue;
    }
    if (/^#{1,6}\s+/.test(line)) {
      if (prose.length > 0) break;
      i++;
      continue;
    }
    prose.push(line);
    i++;
  }

  if (prose.length === 0) return null;

  let summary = prose.join(" ").replace(/\s+/g, " ").trim();
  summary = summary
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  if (summary.length > maxChars) {
    summary = `${summary.slice(0, maxChars - 1).trimEnd()}…`;
  }
  return summary;
}

export function stringifySprint(sprint: Sprint): string {
  return stringifyFrontmatter(sprint.meta, sprint.body);
}

export function stringifyTask(task: Task): string {
  return stringifyFrontmatter(task.meta, task.body);
}

function stringifyFrontmatter(meta: unknown, body: string): string {
  // gray-matter.stringify emits block-style YAML with a trailing newline.
  // We force LF line endings to keep diffs stable across platforms.
  const bodyWithLeadingNewline = body.startsWith("\n") ? body : `\n${body}`;
  const out = matter.stringify(bodyWithLeadingNewline, meta as Record<string, unknown>);
  return out.replace(/\r\n/g, "\n");
}
