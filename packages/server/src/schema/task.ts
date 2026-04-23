import * as v from "valibot";
import { CURRENT_SCHEMA } from "./config.js";
import { Correction, ReminderInstance, TestCriterion } from "./shared.js";

export const TaskType = v.picklist(["feature", "bug", "chore", "refactor"]);
export type TaskType = v.InferOutput<typeof TaskType>;

export const TaskStatus = v.picklist(["todo", "in_progress", "done", "blocked"]);
export type TaskStatus = v.InferOutput<typeof TaskStatus>;

/**
 * Task frontmatter, stored at .deckel/sprints/<sprint-id>/tasks/<task-id>.md.
 * One file per task — the expert review flagged tasks-in-sprint-frontmatter as
 * the single biggest data-loss risk under parallel edits.
 */
export const TaskMeta = v.object({
  schema: v.literal(CURRENT_SCHEMA),
  id: v.pipe(v.string(), v.regex(/^[A-Z][A-Z0-9]*-\d+$/, "must be <PREFIX>-<N>")),
  sprint_id: v.pipe(v.string(), v.regex(/^sprint-[a-z0-9-]+$/i)),
  title: v.pipe(v.string(), v.minLength(1)),
  type: TaskType,
  status: TaskStatus,
  security_checks: v.array(ReminderInstance),
  test_criteria: v.array(TestCriterion),
  corrections: v.array(Correction),
  created: v.optional(v.string()),
  updated: v.optional(v.string()),
});
export type TaskMeta = v.InferOutput<typeof TaskMeta>;

export type Task = {
  meta: TaskMeta;
  body: string;
};
