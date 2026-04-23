import type { SecurityCheckTemplateEntry, Task, TaskMeta } from "@deckel/server/schema";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FlaskConical,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useMemo } from "react";
import { cn } from "../lib/cn.js";
import type { WithEtag } from "../lib/api.js";
import {
  useConfig,
  usePatchTask,
  useSecurityTemplates,
  useTask,
} from "../lib/queries.js";
import { Checkbox } from "./Checkbox.js";
import { ProgressPill } from "./ProgressPill.js";
import { Section } from "./Section.js";
import { classifyClaim } from "./StatusIcon.js";
import { TypeBadge } from "./TypeBadge.js";

type Props = {
  sprintId: string;
  taskId: string;
  onClose: () => void;
  onOpenDoc?: (path: string) => void;
};

export function TaskDrawer({ sprintId, taskId, onClose, onOpenDoc }: Props) {
  const task = useTask(sprintId, taskId);
  const config = useConfig();
  const templates = useSecurityTemplates();
  const patch = usePatchTask();
  const qc = useQueryClient();

  const templateKey = config.data?.data.defaults.security_check_template ?? "default";
  const templateEntries: SecurityCheckTemplateEntry[] =
    templates.data?.[templateKey] ?? [];

  const labels = useMemo(() => {
    const map = new Map<string, SecurityCheckTemplateEntry>();
    for (const entry of templateEntries) map.set(entry.id, entry);
    return map;
  }, [templateEntries]);

  const meta: TaskMeta | undefined = task.data?.data.meta;
  const claimState = classifyClaim(meta?.claim);
  const isLive = claimState === "fresh";

  // Read the freshest cache state inside the handler so rapid successive
  // clicks on different checks don't overwrite each other. Component
  // closure's `meta` can be stale between a click and React's next render.
  const latestChecks = (): { security_checks: TaskMeta["security_checks"]; test_criteria: TaskMeta["test_criteria"] } | null => {
    const cached = qc.getQueryData<WithEtag<Task>>(["task", sprintId, taskId]);
    if (!cached) return null;
    return {
      security_checks: cached.data.meta.security_checks,
      test_criteria: cached.data.meta.test_criteria,
    };
  };

  const onToggleReminder = (reminderId: string, next: boolean) => {
    const snap = latestChecks();
    if (!snap) return;
    const nextChecks = snap.security_checks.map((r) =>
      r.id === reminderId ? { ...r, checked: next } : r,
    );
    patch.mutate({ sprintId, taskId, patch: { security_checks: nextChecks } });
  };

  const onToggleTest = (testId: string, next: boolean) => {
    const snap = latestChecks();
    if (!snap) return;
    const nextTests = snap.test_criteria.map((t) =>
      t.id === testId ? { ...t, checked: next } : t,
    );
    patch.mutate({ sprintId, taskId, patch: { test_criteria: nextTests } });
  };

  return (
    <aside className="h-full flex flex-col border-l border-border-subtle bg-bg">
      <div
        className={cn(
          "h-[64px] border-b flex items-center px-8 gap-4 transition-colors",
          isLive ? "border-accent/60" : "border-border-subtle",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="Close drawer"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
        {isLive && (
          <motion.span
            animate={{ opacity: [1, 0.5, 1], scale: [1, 1.2, 1] }}
            transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="inline-block w-[8px] h-[8px] rounded-full bg-accent"
            aria-label="live — agent working"
          />
        )}
        <div className="text-label text-text-tertiary tabular-nums">{meta?.id ?? "…"}</div>
        {isLive && meta?.claim && (
          <span className="text-label text-accent">{meta.claim.by}</span>
        )}
        <div className="ml-auto">{meta && <TypeBadge type={meta.type} />}</div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-8 space-y-10">
        {task.isLoading && <DrawerLoading />}
        {task.isError && <DrawerError />}
        {meta && (
          <>
            <h2 className="text-heading-lg font-medium text-text-primary leading-snug">
              {meta.title}
            </h2>

            <Section
              icon={ShieldCheck}
              title="Reminders"
              count={meta.security_checks.length}
              action={
                <ProgressPill
                  done={meta.security_checks.filter((r) => r.checked).length}
                  total={meta.security_checks.length}
                />
              }
            >
              {meta.security_checks.length === 0 ? (
                <Empty>No reminders on this task.</Empty>
              ) : (
                meta.security_checks.map((reminder) => (
                  <Checkbox
                    key={reminder.id}
                    checked={reminder.checked}
                    onChange={(next) => onToggleReminder(reminder.id, next)}
                    label={labels.get(reminder.id)?.label ?? reminder.id}
                  />
                ))
              )}
            </Section>

            <Section
              icon={FlaskConical}
              title="Test criteria"
              count={meta.test_criteria.length}
              action={
                <ProgressPill
                  done={meta.test_criteria.filter((t) => t.checked).length}
                  total={meta.test_criteria.length}
                />
              }
            >
              {meta.test_criteria.length === 0 ? (
                <Empty>No test criteria defined.</Empty>
              ) : (
                meta.test_criteria.map((test) => (
                  <Checkbox
                    key={test.id}
                    checked={test.checked}
                    onChange={(next) => onToggleTest(test.id, next)}
                    label={test.label}
                  />
                ))
              )}
            </Section>

            <Section
              icon={CheckCircle2}
              title="Corrections"
              count={meta.corrections.filter((c) => c.open).length}
            >
              {meta.corrections.length === 0 ? (
                <Empty>No open corrections.</Empty>
              ) : (
                meta.corrections.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      "text-body px-3 py-2.5 rounded-[4px] border border-border-subtle",
                      c.open ? "text-text-primary" : "text-text-tertiary line-through",
                    )}
                  >
                    {c.text}
                  </div>
                ))
              )}
            </Section>

            {meta.related_docs && meta.related_docs.length > 0 && (
              <Section
                icon={BookOpen}
                title="Related docs"
                count={meta.related_docs.length}
              >
                {meta.related_docs.map((path) => (
                  <button
                    key={path}
                    type="button"
                    onClick={() => onOpenDoc?.(path)}
                    disabled={!onOpenDoc}
                    className={cn(
                      "w-full text-left flex items-center gap-2 px-3 py-2 rounded-[4px] border border-border-subtle font-mono text-label",
                      onOpenDoc
                        ? "text-text-primary hover:bg-surface-hover hover:border-border-strong transition-colors cursor-pointer"
                        : "text-text-tertiary cursor-default",
                    )}
                    title={onOpenDoc ? "Open in Stack view" : undefined}
                  >
                    <BookOpen size={12} strokeWidth={1.5} className="shrink-0" />
                    <span className="truncate">{path}</span>
                  </button>
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-body text-text-tertiary">{children}</div>;
}

function DrawerLoading() {
  return (
    <div className="flex items-center gap-2 text-text-tertiary">
      <Loader2 className="animate-spin" size={14} strokeWidth={1.5} />
      <span className="text-body">Loading task…</span>
    </div>
  );
}

function DrawerError() {
  return (
    <div className="flex items-center gap-2 text-text-secondary">
      <AlertTriangle size={14} strokeWidth={1.5} />
      <span className="text-body">Failed to load task.</span>
    </div>
  );
}
