import type { TaskMeta } from "@dckl/server/schema";
import { cn } from "../lib/cn.js";
import { MarkdownInline } from "./MarkdownInline.js";
import { ProgressPill } from "./ProgressPill.js";
import { STATUS_CYCLE, STATUS_LABEL, StatusIcon } from "./StatusIcon.js";
import { TypeBadge } from "./TypeBadge.js";

export type TaskRowData = TaskMeta & { summary?: string | null };

type Props = {
  task: TaskRowData;
  selected: boolean;
  onSelect: () => void;
  onStatusCycle: (next: TaskMeta["status"]) => void;
};

export const ROW_GRID =
  "grid-cols-[32px_104px_1fr_80px_120px_100px_60px] gap-x-6";

export function TaskRow({ task, selected, onSelect, onStatusCycle }: Props) {
  const reminders = task.security_checks;
  const reminderDone = reminders.filter((r) => r.checked).length;
  const tests = task.test_criteria;
  const testDone = tests.filter((t) => t.checked).length;
  const openCorrections = task.corrections.filter((c) => c.open).length;
  const dim = task.status === "done";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "grid items-center h-[56px] px-8 w-full text-left border-l-2 transition-colors",
        ROW_GRID,
        selected
          ? "bg-surface-elevated border-accent"
          : "border-transparent hover:bg-surface-hover hover:border-border-strong",
        dim && "opacity-55",
      )}
      aria-label={`Task ${task.id}: ${task.title}`}
    >
      <StatusIcon
        status={task.status}
        claim={task.claim}
        onClick={() => onStatusCycle(STATUS_CYCLE[task.status])}
      />
      <div className="text-body text-text-secondary tabular-nums">{task.id}</div>
      <div className={cn("text-body truncate min-w-0", dim ? "line-through" : "text-text-primary")}>
        <MarkdownInline codeClassName="font-mono text-[0.92em] text-text-secondary px-[5px] py-0 rounded-[3px] bg-white/[0.12]">
          {task.title}
        </MarkdownInline>
      </div>
      <div>
        <TypeBadge type={task.type} />
      </div>
      <div>
        <ProgressPill done={reminderDone} total={reminders.length} />
      </div>
      <div>
        <ProgressPill done={testDone} total={tests.length} />
      </div>
      <div className="text-label text-text-tertiary tabular-nums text-right">
        {openCorrections > 0 ? `!${openCorrections}` : "—"}
      </div>
      <span className="sr-only">{STATUS_LABEL[task.status]}</span>
    </button>
  );
}
