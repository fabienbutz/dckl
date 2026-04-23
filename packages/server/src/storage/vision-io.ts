import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import matter from "gray-matter";
import yaml from "js-yaml";
import * as v from "valibot";
import type { Vision } from "../schema/index.js";
import { VisionMeta } from "../schema/index.js";

const GRAY_MATTER_OPTIONS = {
  engines: {
    yaml: (str: string): object =>
      (yaml.load(str, { schema: yaml.JSON_SCHEMA }) ?? {}) as object,
  },
};

export async function readVisionIfPresent(path: string): Promise<Vision | null> {
  if (!existsSync(path)) return null;
  const content = await readFile(path, "utf8");
  const parsed = matter(content, GRAY_MATTER_OPTIONS);
  const meta = v.parse(VisionMeta, parsed.data);
  return { meta, body: parsed.content.trimStart() };
}
