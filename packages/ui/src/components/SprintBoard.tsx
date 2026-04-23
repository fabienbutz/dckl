import type { Sprint, TaskMeta } from "@deckel/server/schema";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "../lib/cn.js";
import { useSprint } from "../lib/queries.js";
import { ROW_GRID, TaskRow } from "./TaskRow.js";

type Props = {
  sprintId: string;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onStatusCycle: (task: TaskMeta, next: TaskMeta["status"]) => void;
  tasks: TaskMeta[];
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
};

const STATUS_LABEL: Record<Sprint["meta"]["status"], string> = {
  planning: "Planning",
  active: "Active",
  review: "Review",
  done: "Done",
};

export function SprintBoard({
  sprintId,
  selectedTaskId,
  onSelectTask,
  onStatusCycle,
  tasks,
  sidebarCollapsed,
  onToggleSidebar,
}: Props) {
  const sprint = useSprint(sprintId);

  if (sprint.isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-text-tertiary">
        <Loader2 className="animate-spin" size={14} strokeWidth={1.5} />
        <span className="ml-2 text-body">Loading sprint…</span>
      </div>
    );
  }

  if (sprint.isError) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary gap-2">
        <AlertTriangle size={14} strokeWidth={1.5} />
        <span className="text-body">Failed to load sprint.</span>
      </div>
    );
  }

  const meta = sprint.data?.data.meta;
  if (!meta) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="h-[64px] border-b border-border-subtle flex items-center px-6 gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 rounded-[4px] text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={`${sidebarCollapsed ? "Expand" : "Collapse"} sidebar (⌘\\)`}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen size={16} strokeWidth={1.5} />
          ) : (
            <PanelLeftClose size={16} strokeWidth={1.5} />
          )}
        </button>
        <div className="text-label text-text-tertiary tabular-nums">{meta.id}</div>
        <div className="text-text-muted">/</div>
        <div className="text-body text-text-primary font-medium truncate">{meta.name}</div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-label text-text-tertiary">{STATUS_LABEL[meta.status]}</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div
          className={cn(
            "grid items-center h-[44px] px-8 border-b border-border-subtle text-label text-text-tertiary",
            ROW_GRID,
          )}
        >
          <div />
          <div>ID</div>
          <div>Title</div>
          <div>Type</div>
          <div>Reminders</div>
          <div>Tests</div>
          <div className="text-right">Corr</div>
        </div>

        <div className="py-2">
          {tasks.length === 0 ? (
            <div className="px-8 py-12 text-body text-text-tertiary">
              No tasks in this sprint yet.
            </div>
          ) : (
            tasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.25, ease: "easeOut" }}
              >
                <TaskRow
                  task={task}
                  selected={task.id === selectedTaskId}
                  onSelect={() => onSelectTask(task.id)}
                  onStatusCycle={(next) => onStatusCycle(task, next)}
                />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
