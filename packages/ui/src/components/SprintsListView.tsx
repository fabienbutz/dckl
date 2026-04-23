import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "../lib/cn.js";
import type { SprintListItem } from "../lib/api.js";
import { navigate } from "../lib/use-route.js";

type Props = {
  sprints: SprintListItem[];
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
};

/**
 * Tabular overview of every sprint — name, status, window, task-progress,
 * open corrections. Clicking a row opens that sprint's task board.
 */
export function SprintsListView({ sprints, sidebarCollapsed, onToggleSidebar }: Props) {
  const sorted = [...sprints].sort((a, b) => {
    const aLive = a.status === "active" || a.live === true;
    const bLive = b.status === "active" || b.live === true;
    if (aLive !== bLive) return aLive ? -1 : 1;
    return a.id.localeCompare(b.id);
  });

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
        <span className="text-body text-text-primary font-medium">Sprints</span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-body">
          <thead>
            <tr className="text-label text-text-tertiary border-b border-border-subtle">
              <th className="text-left font-normal px-6 py-3 w-[16px]" />
              <th className="text-left font-normal py-3">Name</th>
              <th className="text-left font-normal px-4 py-3 w-[110px]">Status</th>
              <th className="text-left font-normal px-4 py-3 w-[190px]">Window</th>
              <th className="text-right font-normal px-4 py-3 w-[110px] tabular-nums">Tasks</th>
              <th className="text-right font-normal px-4 py-3 w-[90px] tabular-nums">Corr</th>
              <th className="text-right font-normal px-6 py-3 w-[70px]">Live</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((sprint) => {
              const live = sprint.status === "active" || sprint.live === true;
              const total = sprint.tasks_total ?? sprint.task_ids.length;
              const done = sprint.tasks_done ?? 0;
              const open = sprint.corrections_open ?? 0;
              return (
                <tr
                  key={sprint.id}
                  onClick={() => navigate({ kind: "sprint", sprintId: sprint.id })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate({ kind: "sprint", sprintId: sprint.id });
                    }
                  }}
                  className={cn(
                    "cursor-pointer border-b border-border-subtle transition-colors",
                    "hover:bg-surface-hover",
                    sprint.status === "done" && "opacity-55",
                  )}
                  tabIndex={0}
                  aria-label={`Open sprint ${sprint.name}`}
                >
                  <td className="px-6 py-3">
                    <span
                      className={cn(
                        "inline-block w-[6px] h-[6px] rounded-full",
                        live ? "bg-accent" : "bg-text-muted",
                      )}
                    />
                  </td>
                  <td className="py-3 text-text-primary">
                    <div className="truncate max-w-[520px]">{sprint.name}</div>
                    <div className="text-label text-text-tertiary font-mono tabular-nums">
                      {sprint.id}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary capitalize">
                    {sprint.status}
                  </td>
                  <td className="px-4 py-3 text-text-tertiary tabular-nums">
                    {formatWindow(sprint.start, sprint.end)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-secondary">
                    {done}/{total}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right tabular-nums",
                      open > 0 ? "text-text-primary" : "text-text-tertiary",
                    )}
                  >
                    {open > 0 ? `!${open}` : "—"}
                  </td>
                  <td className="px-6 py-3 text-right text-label text-text-tertiary">
                    {live ? "●" : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatWindow(start?: string, end?: string): string {
  const s = fmt(start);
  const e = fmt(end);
  if (s && e) return `${s} → ${e}`;
  return s || e || "";
}

function fmt(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}
