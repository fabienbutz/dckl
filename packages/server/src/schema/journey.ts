import * as v from "valibot";
import { CURRENT_SCHEMA } from "./config.js";
import { Slug } from "./shared.js";

export const JourneyStepStatus = v.picklist(["todo", "done", "broken"]);
export type JourneyStepStatus = v.InferOutput<typeof JourneyStepStatus>;

/**
 * One step in a user flow — a single route plus its current state. The
 * `route` is free-form so it can be an HTTP path (`/signup`), a named
 * route (`auth.signup`), or anything that identifies a destination.
 */
export const JourneyStep = v.object({
  id: Slug,
  label: v.pipe(v.string(), v.minLength(1)),
  route: v.pipe(v.string(), v.minLength(1)),
  status: JourneyStepStatus,
  related_tasks: v.optional(v.array(v.string())),
});
export type JourneyStep = v.InferOutput<typeof JourneyStep>;

/**
 * A journey = an ordered list of steps a user traverses to reach a goal.
 * Cross-cuts sprints and tasks (one task may implement one step; one step
 * may be implemented by several tasks across sprints).
 */
export const JourneyMeta = v.object({
  schema: v.literal(CURRENT_SCHEMA),
  id: Slug,
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.optional(v.string()),
  steps: v.array(JourneyStep),
  updated: v.optional(v.string()),
});
export type JourneyMeta = v.InferOutput<typeof JourneyMeta>;

export type Journey = {
  meta: JourneyMeta;
  body: string;
};
