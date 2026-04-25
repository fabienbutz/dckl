import type { Task } from "@dckl/server/schema";
import { AlertTriangle, Inbox, Loader2, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/cn.js";
import { useBacklog } from "../lib/queries.js";
import { MarkdownInline } from "./MarkdownInline.js";
import { TypeBadge } from "./TypeBadge.js";

type Props = {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
};

export function BacklogView({ sidebarCollapsed, onToggleSidebar }: Props) {
  const q = useBacklog();
  const [query, setQuery] = useState("");

  const all: Task[] = q.data ?? [];
  const term = query.trim().toLowerCase();
  const filtered: Task[] = term
    ? all.filter(
        (t) =>
          t.meta.title.toLowerCase().includes(term) ||
          t.body.toLowerCase().includes(term),
      )
    : all;

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
        <span className="text-body text-text-primary font-medium">Backlog</span>
      </div>

      {!q.isLoading && !q.isError && all.length > 0 && (
        <div className="border-b border-border-subtle px-6 py-3 flex items-center gap-4">
          <label className="flex items-center gap-2 min-w-0 flex-1 max-w-[360px]">
            <Search size={14} strokeWidth={1.5} className="text-text-tertiary shrink-0" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search backlog by title or body…"
              className="flex-1 bg-transparent border-0 outline-none text-body text-text-primary placeholder:text-text-tertiary focus-visible:ring-0"
            />
          </label>
          <div className="ml-auto text-label text-text-tertiary tabular-nums">
            {filtered.length}
            {filtered.length !== all.length ? ` / ${all.length}` : ""}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {q.isLoading ? (
          <div className="flex items-center gap-2 text-text-tertiary p-8">
            <Loader2 className="animate-spin" size={14} strokeWidth={1.5} />
            <span className="text-body">Loading…</span>
          </div>
        ) : q.isError ? (
          <div className="flex items-center gap-2 text-text-secondary p-8">
            <AlertTriangle size={14} strokeWidth={1.5} />
            <span className="text-body">Failed to load backlog.</span>
          </div>
        ) : all.length === 0 ? (
          <div className="px-8 py-12 max-w-2xl">
            <div className="flex items-start gap-3 text-text-tertiary">
              <Inbox size={16} strokeWidth={1.5} className="shrink-0 mt-1" />
              <div className="text-body leading-relaxed">
                <div className="text-text-primary mb-2">Backlog is empty.</div>
                <div>
                  Park task ideas here that don&rsquo;t fit any current sprint:
                </div>
                <pre className="mt-3 text-label font-mono text-text-secondary">
                  dckl backlog add &quot;your idea&quot;
                </pre>
                <div className="mt-3">
                  When ready, promote a task into a sprint:
                </div>
                <pre className="mt-2 text-label font-mono text-text-secondary">
                  dckl task move &lt;id&gt; &lt;sprint-id&gt;
                </pre>
              </div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-8 py-12 text-body text-text-tertiary">
            No backlog items match this search.
          </div>
        ) : (
          <table className="w-full text-body">
            <thead>
              <tr className="text-label text-text-tertiary border-b border-border-subtle">
                <th className="text-left font-normal px-6 py-3 w-[110px]">ID</th>
                <th className="text-left font-normal py-3">Title</th>
                <th className="text-left font-normal px-4 py-3 w-[100px]">Type</th>
                <th className="text-right font-normal px-6 py-3 w-[140px] tabular-nums">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <tr
                  key={task.meta.id}
                  className={cn(
                    "border-b border-border-subtle transition-colors",
                    "hover:bg-surface-hover",
                  )}
                >
                  <td className="px-6 py-3 font-mono text-label text-text-tertiary tabular-nums">
                    {task.meta.id}
                  </td>
                  <td className="py-3 text-text-primary truncate max-w-[640px]">
                    <MarkdownInline codeClassName="font-mono text-[0.92em] text-text-secondary px-[5px] py-0 rounded-[3px] bg-white/[0.12]">
                      {task.meta.title}
                    </MarkdownInline>
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={task.meta.type} />
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-text-tertiary text-label">
                    {formatDate(task.meta.created)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function formatDate(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}
