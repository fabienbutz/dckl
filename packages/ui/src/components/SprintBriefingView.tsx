import { AlertTriangle, Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "../lib/cn.js";
import { useSprint } from "../lib/queries.js";
import { navigate } from "../lib/use-route.js";
import { MarkdownBody } from "./MarkdownBody.js";

type Props = {
  sprintId: string;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
};

export function SprintBriefingView({ sprintId, sidebarCollapsed, onToggleSidebar }: Props) {
  const q = useSprint(sprintId);

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 text-text-tertiary p-8">
        <Loader2 className="animate-spin" size={14} strokeWidth={1.5} />
        <span className="text-body">Loading briefing…</span>
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="flex items-center gap-2 text-text-secondary p-8">
        <AlertTriangle size={14} strokeWidth={1.5} />
        <span className="text-body">Failed to load sprint.</span>
      </div>
    );
  }

  const { meta, body } = q.data.data;
  const hasBody = body.trim().length > 0;

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
        <nav className="ml-4 flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate({ kind: "sprint", sprintId: meta.id })}
            className="px-3 py-1 rounded-[4px] text-label text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            Tasks
          </button>
          <button
            type="button"
            className={cn(
              "px-3 py-1 rounded-[4px] text-label",
              "bg-surface-elevated text-text-primary",
            )}
            aria-pressed
          >
            Briefing
          </button>
        </nav>
      </div>

      <div className="flex-1 overflow-auto px-12 py-10">
        <div className="max-w-3xl">
        <div className="flex items-baseline gap-3 flex-wrap mb-2">
          <span className="text-label text-text-tertiary tabular-nums">
            {meta.id}
          </span>
          <span className="text-text-muted">/</span>
          <h1 className="text-[22px] leading-[32px] font-medium text-text-primary">
            {meta.name}
          </h1>
        </div>
        {meta.goal && (
          <p className="text-body text-text-secondary leading-relaxed mb-6">
            {meta.goal}
          </p>
        )}
        <dl className="grid grid-cols-[100px_1fr] gap-y-2 gap-x-4 mb-8 text-body">
          <dt className="text-text-tertiary font-mono text-label">status</dt>
          <dd className="text-text-primary capitalize">{meta.status}</dd>
          {(meta.start || meta.end) && (
            <>
              <dt className="text-text-tertiary font-mono text-label">window</dt>
              <dd className="text-text-primary tabular-nums">
                {formatDate(meta.start)} → {formatDate(meta.end)}
              </dd>
            </>
          )}
          {meta.based_on && (
            <>
              <dt className="text-text-tertiary font-mono text-label">based on</dt>
              <dd className="text-text-primary font-mono">{meta.based_on}</dd>
            </>
          )}
          <dt className="text-text-tertiary font-mono text-label">tasks</dt>
          <dd className="text-text-primary tabular-nums">{meta.task_ids.length}</dd>
        </dl>

        {hasBody ? (
          <article className="prose-dckl">
            <MarkdownBody>{body}</MarkdownBody>
          </article>
        ) : (
          <div className="border border-border-subtle rounded-[4px] p-6 text-body text-text-tertiary">
            Kein Briefing gepflegt. Schreib einen für das Team in{" "}
            <code className="font-mono text-text-secondary">
              .dckl/sprints/{meta.id}/index.md
            </code>{" "}
            — alles unterhalb des Frontmatters landet hier.
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function formatDate(v: unknown): string {
  if (!v) return "?";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}
