import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn.js";

type Props = {
  icon: LucideIcon;
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * Drawer section: 14px icon + title + optional count-badge (monochrome ring)
 * + optional right-aligned action. Used for Reminders / Tests / Corrections.
 */
export function Section({ icon: Icon, title, count, action, children, className }: Props) {
  return (
    <section className={cn("space-y-4", className)}>
      <header className="flex items-center gap-3 text-text-secondary">
        <Icon size={16} strokeWidth={1.5} />
        <h3 className="text-label font-medium">{title}</h3>
        {count !== undefined && (
          <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full border border-border text-label text-text-tertiary tabular-nums">
            {count}
          </span>
        )}
        {action && <div className="ml-auto">{action}</div>}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
