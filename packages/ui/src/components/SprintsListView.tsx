import type { SprintStatus } from "@dckl/server/schema";
import { PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { useState } from "react";
import type { SprintListItem } from "../lib/api.js";
import { cn } from "../lib/cn.js";
import { navigate } from "../lib/use-route.js";

type StatusFilter = "all" | "live" | SprintStatus;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "active", label: "Active" },
  { id: "planning", label: "Planning" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const q = query.trim().toLowerCase();
  const filtered = sprints.filter((s) => {
    if (q && !s.name.toLowerCase().includes(q) && !s.goal.toLowerCase().includes(q)) {
      return false;
    }
    if (filter === "live") {
      return s.status === "active" || s.live === true;
    }
    if (filter !== "all" && s.status !== filter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
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

      <FilterBar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search sprints by name or goal…"
        filter={filter}
        onFilterChange={setFilter}
        resultCount={sorted.length}
        totalCount={sprints.length}
      />

      <div className="flex-1 overflow-auto">
        <table className="w-full text-body">
          <thead>
            <tr className="text-label text-text-tertiary border-b border-border-subtle">
              <th className="text-left font-normal px-6 py-3 w-[16px]" />
              <th className="text-left font-normal py-3">Name</th>
              <th className="text-left font-normal px-4 py-3 w-[110px]">Status</th>
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
                  </td>
                  <td className="px-4 py-3 text-text-secondary capitalize">
                    {sprint.status}
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
        {sorted.length === 0 && sprints.length > 0 && (
          <div className="px-8 py-12 text-body text-text-tertiary">
            No sprints match this filter.
          </div>
        )}
      </div>
    </div>
  );
}

function FilterBar({
  query,
  onQueryChange,
  placeholder,
  filter,
  onFilterChange,
  resultCount,
  totalCount,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  placeholder: string;
  filter: StatusFilter;
  onFilterChange: (f: StatusFilter) => void;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <div className="border-b border-border-subtle px-6 py-3 flex items-center gap-4">
      <label className="flex items-center gap-2 min-w-0 flex-1 max-w-[360px]">
        <Search size={14} strokeWidth={1.5} className="text-text-tertiary shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-0 outline-none text-body text-text-primary placeholder:text-text-tertiary focus-visible:ring-0"
        />
      </label>
      <div className="flex items-center gap-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilterChange(f.id)}
            className={cn(
              "px-2.5 py-1 rounded-[4px] text-label transition-colors",
              filter === f.id
                ? "bg-surface-elevated text-text-primary"
                : "text-text-tertiary hover:text-text-primary hover:bg-surface-hover",
            )}
            aria-pressed={filter === f.id}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="ml-auto text-label text-text-tertiary tabular-nums">
        {resultCount}
        {resultCount !== totalCount ? ` / ${totalCount}` : ""}
      </div>
    </div>
  );
}

