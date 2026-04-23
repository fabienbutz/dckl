import matter from "gray-matter";
import yaml from "js-yaml";
import * as v from "valibot";
import type { Journey } from "../schema/index.js";
import { JourneyMeta } from "../schema/index.js";

const GRAY_MATTER_OPTIONS = {
  engines: {
    yaml: (str: string): object =>
      (yaml.load(str, { schema: yaml.JSON_SCHEMA }) ?? {}) as object,
  },
};

/**
 * Parses a journey file (.deckel/journeys/<slug>.md). Throws on invalid
 * frontmatter — same philosophy as parseTask: the user will see a clear
 * error and can fix the file, rather than Deckel silently hiding a
 * malformed journey.
 */
export function parseJourney(content: string): Journey {
  const parsed = matter(content, GRAY_MATTER_OPTIONS);
  const meta = v.parse(JourneyMeta, parsed.data);
  return { meta, body: parsed.content.trimStart() };
}

export function stringifyJourney(journey: Journey): string {
  const body = journey.body.startsWith("\n") ? journey.body : `\n${journey.body}`;
  // js-yaml.dump refuses `undefined` values, but Valibot preserves optional
  // keys as explicit undefined when the input omitted them. Strip those
  // before handing the object to gray-matter.
  const cleaned = stripUndefined(journey.meta as Record<string, unknown>);
  const out = matter.stringify(body, cleaned);
  return out.replace(/\r\n/g, "\n");
}

function stripUndefined(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(meta)) {
    if (val !== undefined) out[k] = val;
  }
  return out;
}
