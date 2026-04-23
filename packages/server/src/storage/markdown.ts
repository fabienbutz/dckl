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
    yaml: (str: string) => yaml.load(str, { schema: yaml.JSON_SCHEMA }),
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
  return { meta, body: parsed.content.trimStart() };
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
