import * as v from "valibot";
import { DateString, Slug } from "./shared.js";

// Bumped when the on-disk file format changes in an incompatible way. Every
// file we write carries a `schema` field so we can migrate later.
export const CURRENT_SCHEMA = 1;

export const Config = v.object({
  schema: v.literal(CURRENT_SCHEMA),
  project: v.object({
    name: v.pipe(v.string(), v.minLength(1)),
    created: DateString,
    version: v.number(),
  }),
  ui: v.object({
    port: v.pipe(v.number(), v.integer(), v.minValue(1024), v.maxValue(65535)),
    theme: v.picklist(["dark", "light"]),
  }),
  task_id_prefix: v.pipe(
    v.string(),
    v.minLength(1),
    v.maxLength(8),
    v.regex(/^[A-Z][A-Z0-9]*$/, "must be uppercase alphanumeric, starting with a letter"),
  ),
  defaults: v.object({
    security_check_template: Slug,
    test_categories: v.array(v.string()),
  }),
  // Frontend-Sitemap-Scanner overrides. Optional — auto-detection
  // (Next.js at repo root) handles most projects; monorepos and
  // non-standard layouts set `roots` + `page_file` explicitly.
  pages: v.optional(
    v.object({
      roots: v.optional(v.array(v.string())),
      page_file: v.optional(v.array(v.string())),
    }),
  ),
});
export type Config = v.InferOutput<typeof Config>;

export const SecurityCheckTemplateEntry = v.object({
  id: Slug,
  label: v.pipe(v.string(), v.minLength(1)),
  category: v.string(),
});
export type SecurityCheckTemplateEntry = v.InferOutput<typeof SecurityCheckTemplateEntry>;

export const SecurityCheckTemplates = v.object({
  templates: v.record(Slug, v.array(SecurityCheckTemplateEntry)),
});
export type SecurityCheckTemplates = v.InferOutput<typeof SecurityCheckTemplates>;
