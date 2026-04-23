import * as v from "valibot";

// ISO date string in YYYY-MM-DD form. Liberal on parse, strict on write.
export const DateString = v.pipe(
  v.string(),
  v.regex(/^\d{4}-\d{2}-\d{2}$/, "must be ISO date (YYYY-MM-DD)"),
);

// A slugged identifier. Used for reminder IDs, correction IDs, etc.
export const Slug = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(64),
  v.regex(/^[a-z0-9][a-z0-9-_]*$/i, "must start with alphanumeric"),
);

/**
 * Task-level reminder instance. References a template entry via `id`. The
 * human-readable label lives in `templates/security-checks.yaml` and is not
 * duplicated here — instances only track state.
 *
 * UI label: "Reminders". Internal key: `security_checks` (kept for stability
 * and to make the compliance-theatre risk visible in the file format itself).
 */
export const ReminderInstance = v.object({
  id: Slug,
  checked: v.boolean(),
  notes: v.optional(v.string()),
});
export type ReminderInstance = v.InferOutput<typeof ReminderInstance>;

export const TestCriterion = v.object({
  id: Slug,
  label: v.pipe(v.string(), v.minLength(1)),
  checked: v.boolean(),
});
export type TestCriterion = v.InferOutput<typeof TestCriterion>;

export const Correction = v.object({
  id: Slug,
  text: v.pipe(v.string(), v.minLength(1)),
  open: v.boolean(),
  target_sprint: v.nullable(v.string()),
});
export type Correction = v.InferOutput<typeof Correction>;
