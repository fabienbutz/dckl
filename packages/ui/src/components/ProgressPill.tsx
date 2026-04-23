import { cn } from "../lib/cn.js";

type Props = {
  done: number;
  total: number;
  label?: string;
  className?: string;
};

/**
 * Monochrome progress pill. Two states:
 *   - in progress: white fill on black track, counter text on right
 *   - complete   : inverted (black fill on white pill) — the payoff state
 */
export function ProgressPill({ done, total, label, className }: Props) {
  if (total === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center h-[18px] px-2 rounded-full border border-border-subtle text-label font-mono text-text-tertiary",
          className,
        )}
      >
        {label ? `${label} —` : "—"}
      </span>
    );
  }

  const complete = done === total;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-[18px] pl-1 pr-2 rounded-full border font-mono text-label transition-colors",
        complete
          ? "bg-surface-inverted border-border-inverted text-text-inverted"
          : "border-border text-text-secondary",
        className,
      )}
    >
      <span
        className={cn(
          "relative inline-block h-[10px] w-[10px] rounded-full overflow-hidden",
          complete ? "bg-text-inverted" : "bg-surface",
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "absolute inset-0 origin-left transition-transform duration-300 ease-out",
            complete ? "bg-text-inverted" : "bg-text-primary",
          )}
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </span>
      <span>
        {done}/{total}
      </span>
    </span>
  );
}
