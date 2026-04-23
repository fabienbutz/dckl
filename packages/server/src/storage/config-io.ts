import { readFile } from "node:fs/promises";
import yaml from "js-yaml";
import * as v from "valibot";
import type { Config, SecurityCheckTemplates } from "../schema/index.js";
import {
  Config as ConfigSchema,
  SecurityCheckTemplates as TemplatesSchema,
} from "../schema/index.js";
import { etag } from "./etag.js";

// JSON_SCHEMA restricts YAML tags to the JSON subset (null/bool/int/float/
// string). Critically: it does NOT auto-convert `2026-04-22` into a JS Date
// object. Our schema layer treats all dates as ISO strings — keep that
// invariant at the parser level, not in validation.
const LOAD_OPTIONS = { schema: yaml.JSON_SCHEMA };

export async function readConfig(path: string): Promise<{ config: Config; etag: string }> {
  const content = await readFile(path, "utf8");
  const raw = yaml.load(content, LOAD_OPTIONS);
  const config = v.parse(ConfigSchema, raw);
  return { config, etag: etag(content) };
}

export async function readSecurityTemplates(path: string): Promise<SecurityCheckTemplates> {
  const content = await readFile(path, "utf8");
  const raw = yaml.load(content, LOAD_OPTIONS);
  return v.parse(TemplatesSchema, raw);
}

export function stringifyConfig(config: Config): string {
  return yaml.dump(config, {
    indent: 2,
    lineWidth: 100,
    noRefs: true,
    schema: yaml.JSON_SCHEMA,
  });
}
