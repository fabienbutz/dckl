import { cn } from "../lib/cn.js";

export type TaskType = "feature" | "bug" | "chore" | "refactor";

const BORDER_STYLE: Record<TaskType, string> = {
  feature: "border-solid",
  bug: "border-dashed",
  chore: "border-dotted",
  refactor: "border-double border-2",
};

const LABEL: Record<TaskType, string> = {
  feature: "Feature",
  bug: "Bug",
  chore: "Chore",
  refactor: "Refactor",
};

/**
 * Monochrome type badge. Differentiates categories via *border style*
 * (solid/dashed/dotted/double), never colour.
 */
export function TypeBadge({ type }: { type: TaskType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center h-[20px] px-2 rounded-[4px] border text-label text-text-secondary select-none",
        BORDER_STYLE[type],
      )}
    >
      {LABEL[type]}
    </span>
  );
}
