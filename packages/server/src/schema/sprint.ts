import * as v from "valibot";
import { CURRENT_SCHEMA } from "./config.js";
import { DateString } from "./shared.js";

export const SprintStatus = v.picklist(["planning", "active", "review", "done"]);
export type SprintStatus = v.InferOutput<typeof SprintStatus>;

/**
 * Sprint frontmatter, stored at .deckel/sprints/<sprint-id>/index.md.
 * Task IDs are referenced by name; tasks live in tasks/<task-id>.md (one file
 * per task) to keep diffs granular and parallel edits safe.
 */
export const SprintMeta = v.object({
  schema: v.literal(CURRENT_SCHEMA),
  id: v.pipe(v.string(), v.regex(/^sprint-[a-z0-9-]+$/i)),
  name: v.pipe(v.string(), v.minLength(1)),
  goal: v.string(),
  status: SprintStatus,
  start: DateString,
  end: DateString,
  based_on: v.nullable(v.string()),
  task_ids: v.array(v.string()),
});
export type SprintMeta = v.InferOutput<typeof SprintMeta>;

/** A parsed sprint — frontmatter + markdown body. */
export type Sprint = {
  meta: SprintMeta;
  body: string;
};
