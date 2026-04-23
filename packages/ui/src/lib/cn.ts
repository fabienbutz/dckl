type ClassValue = string | number | false | null | undefined;

/** Minimal classnames helper — no extra dependency. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
