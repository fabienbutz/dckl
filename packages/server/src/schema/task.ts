import * as v from "valibot";
import { CURRENT_SCHEMA } from "./config.js";
import { Correction, ReminderInstance, TestCriterion } from "./shared.js";

export const TaskType = v.picklist(["feature", "bug", "chore", "refactor"]);
export type TaskType = v.InferOutput<typeof TaskType>;

export const TaskStatus = v.picklist(["todo", "in_progress", "done", "blocked"]);
export type TaskStatus = v.InferOutput<typeof TaskStatus>;

/**
 * Live-AI-work indicator. When present, the task is actively being worked
 * on by a named agent (typically "claude-code"). Stale claims (heartbeat
 * older than CLAIM_TTL_MS) are treated as idle in the UI, not removed —
 * kept so users can see "was live 12 min ago" instead of a silent gap.
 */
export const TaskClaim = v.object({
  by: v.pipe(v.string(), v.minLength(1), v.maxLength(64)),
  at: v.string(),
  heartbeat: v.string(),
});
export type TaskClaim = v.InferOutput<typeof TaskClaim>;

export const CLAIM_TTL_MS = 5 * 60 * 1000;

/**
 * Task frontmatter, stored at .dckl/sprints/<sprint-id>/tasks/<task-id>.md.
 * One file per task — the expert review flagged tasks-in-sprint-frontmatter as
 * the single biggest data-loss risk under parallel edits.
 */
export const TaskMeta = v.object({
  schema: v.literal(CURRENT_SCHEMA),
  id: v.pipe(v.string(), v.regex(/^[A-Z][A-Z0-9]*-\d+$/, "must be <PREFIX>-<N>")),
  // Optional: tasks living in `.dckl/backlog/` have no sprint until
  // promoted via `dckl task move <id> <sprint-id>`. All in-sprint
  // tasks retain the field — fully backwards-compatible.
  sprint_id: v.optional(v.pipe(v.string(), v.regex(/^sprint-[a-z0-9-]+$/i))),
  title: v.pipe(v.string(), v.minLength(1)),
  type: TaskType,
  status: TaskStatus,
  security_checks: v.optional(v.array(ReminderInstance), []),
  test_criteria: v.optional(v.array(TestCriterion), []),
  corrections: v.optional(v.array(Correction), []),
  // Chunk-shaped hints for AI execution — all optional, all additive. See
  // the SKILL.md "Creating a chunk" section for filling-in rules.
  context_files: v.optional(v.array(v.string())),
  depends_on: v.optional(v.array(v.string())),
  pre_flight: v.optional(v.array(v.string())),
  related_docs: v.optional(v.array(v.string())),
  claim: v.optional(TaskClaim),
  created: v.optional(v.string()),
  updated: v.optional(v.string()),
});
export type TaskMeta = v.InferOutput<typeof TaskMeta>;

export type Task = {
  meta: TaskMeta;
  body: string;
  /**
   * One-line auto-extracted summary for the sidebar — first prose block
   * after the title heading, markdown-stripped, truncated. Null when the
   * body has no prose content. Derived by `parseTask`, not persisted —
   * optional on hand-constructed fixtures.
   */
  summary?: string | null;
};

export function isClaimFresh(claim: TaskClaim | undefined, now: number = Date.now()): boolean {
  if (!claim) return false;
  const hb = Date.parse(claim.heartbeat);
  if (Number.isNaN(hb)) return false;
  return now - hb < CLAIM_TTL_MS;
}
