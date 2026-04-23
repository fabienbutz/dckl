import type { Sprint } from "@dckl/server/schema";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "../lib/cn.js";
import { MarkdownBody } from "./MarkdownBody.js";

type Props = {
  sprint: Sprint;
};

const STORAGE_KEY = "dckl.sprint-briefing.collapsed";

/**
 * Renders the sprint's `index.md` body as a collapsible briefing card
 * above the task list. The body is written as a briefing for the team,
 * not as task spec — see SKILL.md "Creating a sprint" for the shape we
 * expect. Falls back to goal-only when the body is empty.
 */
export function SprintBriefing({ sprint }: Props) {
  const { meta, body } = sprint;
  const hasBody = body.trim().length > 0;

  const [collapsed, setCollapsed] = useState<boolean>(() => readCollapsed(meta.id));
  useEffect(() => {
    setCollapsed(readCollapsed(meta.id));
  }, [meta.id]);
  useEffect(() => {
    writeCollapsed(meta.id, collapsed);
  }, [meta.id, collapsed]);

  return (
    <section className="border-b border-border-subtle">
      <button
        type="button"
        onClick={() => hasBody && setCollapsed((c) => !c)}
        disabled={!hasBody}
        className={cn(
          "w-full text-left flex items-start gap-3 px-8 py-3",
          hasBody
            ? "hover:bg-surface-hover transition-colors cursor-pointer"
            : "cursor-default",
        )}
        aria-expanded={hasBody ? !collapsed : undefined}
        aria-controls={hasBody ? `briefing-${meta.id}` : undefined}
      >
        <span className="shrink-0 mt-[3px] text-text-tertiary">
          {hasBody ? (
            collapsed ? (
              <ChevronRight size={14} strokeWidth={1.5} />
            ) : (
              <ChevronDown size={14} strokeWidth={1.5} />
            )
          ) : (
            <span className="inline-block w-[14px]" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-body text-text-primary font-medium">
              {meta.name}
            </span>
            <StatusBadge status={meta.status} />
            {meta.start || meta.end ? (
              <span className="text-label text-text-tertiary tabular-nums">
                {formatWindow(meta.start, meta.end)}
              </span>
            ) : null}
          </div>
          {meta.goal && (
            <div className="text-body text-text-secondary leading-relaxed mt-[2px]">
              {meta.goal}
            </div>
          )}
        </div>
      </button>
      {hasBody && !collapsed && (
        <div id={`briefing-${meta.id}`} className="px-8 pb-4">
          <MarkdownBody>{body}</MarkdownBody>
        </div>
      )}
    </section>
  );
}

function readCollapsed(sprintId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(`${STORAGE_KEY}.${sprintId}`) === "1";
}

function writeCollapsed(sprintId: string, collapsed: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${STORAGE_KEY}.${sprintId}`, collapsed ? "1" : "0");
}

function StatusBadge({ status }: { status: Sprint["meta"]["status"] }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={cn(
        "px-[6px] py-[1px] rounded-[3px] text-label font-mono",
        status === "active"
          ? "text-accent bg-white/[0.05] border border-accent/30"
          : "text-text-tertiary bg-white/[0.05] border border-border-subtle",
      )}
    >
      {label}
    </span>
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
