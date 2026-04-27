// Date-bearing fields that GitHub's REST API exposes. Stripped before
// any payload reaches the agent — see README "Why" for the design.
const TIME_FIELDS = new Set([
  "created_at",
  "updated_at",
  "closed_at",
  "due_on",
  "merged_at",
  "submitted_at",
  "started_at",
  "completed_at",
  "pushed_at",
  "last_edited_at",
]);

export function stripTime<T>(input: T): T {
  if (input === null || input === undefined) return input;

  if (Array.isArray(input)) {
    return input.map((item) => stripTime(item)) as unknown as T;
  }

  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (TIME_FIELDS.has(key)) continue;
      out[key] = stripTime(value);
    }
    return out as T;
  }

  return input;
}

export function stripTimeFromArray<T>(arr: readonly T[]): T[] {
  return arr.map((item) => stripTime(item));
}
