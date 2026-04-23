import { cn } from "../../lib/cn.js";

/**
 * Keyboard-hint badge. Rendered next to clickable affordances so shortcuts
 * are discoverable without needing a cheatsheet — per UX review, this tool
 * runs every few days, so shortcuts must be visible at the site of use.
 */
export function CommandKey({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center min-w-[16px] h-[16px] px-[3px] rounded-[3px] border border-border font-mono text-[10px] leading-none text-text-tertiary",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
