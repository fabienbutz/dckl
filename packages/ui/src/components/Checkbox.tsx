import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../lib/cn.js";

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

/**
 * Monochrome checkbox. Checked state inverts (white fill, black check)
 * so that the "completed" moment reads as inversion — the same visual
 * language as ProgressPill at 100%.
 */
export function Checkbox({ checked, onChange, disabled, label, className }: Props) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 select-none py-1",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only peer"
      />
      <motion.span
        whileTap={{ scale: 0.88 }}
        transition={{ type: "spring", stiffness: 500, damping: 22 }}
        className={cn(
          "relative inline-flex items-center justify-center w-[16px] h-[16px] mt-0.5 rounded-[4px] border transition-colors duration-150 shrink-0",
          checked
            ? "bg-surface-inverted border-border-inverted"
            : "border-border-strong hover:border-text-secondary bg-transparent",
        )}
      >
        <AnimatePresence initial={false}>
          {checked && (
            <motion.svg
              key="check"
              initial={{ scale: 0, rotate: -30, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 600, damping: 22 }}
              width="11"
              height="11"
              viewBox="0 0 10 10"
              aria-hidden="true"
              className="text-text-inverted"
            >
              <title>checked</title>
              <path
                d="M2 5.2 L4.2 7.4 L8 2.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.span>
      {label && (
        <span
          className={cn(
            "text-body leading-relaxed transition-all duration-150",
            checked ? "line-through text-text-tertiary" : "text-text-primary",
          )}
        >
          {label}
        </span>
      )}
    </label>
  );
}
