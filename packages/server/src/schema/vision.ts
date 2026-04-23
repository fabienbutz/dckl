import * as v from "valibot";
import { CURRENT_SCHEMA } from "./config.js";

/**
 * Project vision metadata — the anchor every sprint and chunk points back
 * to. Optional by design; projects can live without one. When present, it's
 * included in `dckl status` and `dckl export` so every Claude session
 * starts with the project's north star in its context.
 */
export const VisionMeta = v.object({
  schema: v.literal(CURRENT_SCHEMA),
  north_star: v.pipe(v.string(), v.minLength(1)),
  audience: v.optional(v.string()),
  non_goals: v.optional(v.array(v.string())),
  current_phase: v.optional(v.string()),
  updated: v.optional(v.string()),
});
export type VisionMeta = v.InferOutput<typeof VisionMeta>;

export type Vision = {
  meta: VisionMeta;
  body: string;
};
