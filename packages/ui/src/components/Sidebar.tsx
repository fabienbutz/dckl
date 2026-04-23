import type { Config, JourneyMeta, SprintMeta } from "@dckl/server/schema";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ChevronRight,
  History,
  Layers,
  Route,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "../lib/cn.js";
import { useJourneys, useStackInventory } from "../lib/queries.js";

export type BrowseView = "changelog" | "stack" | "journey";

type Props = {
  config: Config | null;
  sprints: SprintMeta[];
  activeSprintId: string | null;
  onSelectSprint: (id: string) => void;
  activeView: BrowseView | null;
  onSelectView: (view: BrowseView | null) => void;
  activeJourneyId: string | null;
  onSelectJourney: (id: string) => void;
  collapsed: boolean;
};

const STATUS_ORDER: Record<SprintMeta["status"], number> = {
  active: 0,
  planning: 1,
  review: 2,
  done: 3,
};

export function Sidebar({
  config,
  sprints,
  activeSprintId,
  onSelectSprint,
  activeView,
  onSelectView,
  activeJourneyId,
  onSelectJourney,
  collapsed,
}: Props) {
  const journeys = useJourneys();
  const stack = useStackInventory();
  const sorted = [...sprints].sort((a, b) => {
    const diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (diff !== 0) return diff;
    return b.id.localeCompare(a.id);
  });

  const projectName = config?.project.name ?? "dckl";

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 0 : 320 }}
      transition={{ type: "tween", duration: 0.2, ease: [0.2, 0, 0.2, 1] }}
      className="shrink-0 h-full overflow-hidden border-r border-border-subtle bg-bg"
      aria-hidden={collapsed}
    >
      <div className="w-[320px] h-full flex flex-col">
        <div className="h-[64px] px-6 flex items-center">
          <div className="font-medium text-body text-text-primary truncate">{projectName}</div>
        </div>

      <nav className="flex-1 overflow-auto px-4 py-6 space-y-7">
        <Section label="Sprints" storageKey="sprints">
          <ul className="space-y-0.5">
            {sorted.map((sprint) => (
              <li key={sprint.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectSprint(sprint.id);
                    onSelectView(null);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-1.5 rounded-[4px] text-left text-body transition-colors",
                    sprint.id === activeSprintId && activeView === null
                      ? "bg-surface-elevated text-text-primary"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                  )}
                >
                  <StatusDot status={sprint.status} />
                  <span className="flex-1 truncate">{sprint.name}</span>
                  {sprint.status === "active" && (
                    <span className="text-label text-text-tertiary">Active</span>
                  )}
                </button>
              </li>
            ))}
            <li>
              <DisabledItem label="New sprint" hint="Sprint 3" />
            </li>
          </ul>
        </Section>

        <Section label="Journeys" storageKey="journeys">
          <ul className="space-y-0.5">
            {(journeys.data ?? []).map((j) => (
              <JourneyItem
                key={j.id}
                journey={j}
                active={activeView === "journey" && activeJourneyId === j.id}
                onClick={() => onSelectJourney(j.id)}
              />
            ))}
            {(journeys.data ?? []).length === 0 && !journeys.isLoading && (
              <li className="px-3 py-1.5 text-label text-text-tertiary">
                No journeys yet.
              </li>
            )}
            <li>
              <DisabledItem
                label="New journey"
                hint={"CLI: dckl journey new"}
              />
            </li>
          </ul>
        </Section>

        <Section label="Browse" storageKey="browse">
          <ul className="space-y-0.5">
            <li>
              <button
                type="button"
                onClick={() => onSelectView("changelog")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-1.5 rounded-[4px] text-left text-body transition-colors",
                  activeView === "changelog"
                    ? "bg-surface-elevated text-text-primary"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                )}
              >
                <History size={14} strokeWidth={1.5} />
                <span className="flex-1 truncate">Changelog</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onSelectView("stack")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-1.5 rounded-[4px] text-left text-body transition-colors",
                  activeView === "stack"
                    ? "bg-surface-elevated text-text-primary"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                )}
              >
                <Layers size={14} strokeWidth={1.5} />
                <span className="flex-1 truncate">Stack</span>
                {stack.data?.entries && stack.data.entries.length > 0 && (
                  <span className="text-label text-text-tertiary tabular-nums">
                    {stack.data.entries.length}
                  </span>
                )}
              </button>
            </li>
            <li>
              <DisabledItem icon={BookOpen} label="Docs" hint="Sprint 3.5" />
            </li>
            <li>
              <DisabledItem icon={Settings} label="Settings" hint="Sprint 5" />
            </li>
          </ul>
        </Section>
      </nav>

        <div className="h-[40px] px-6 flex items-center">
          <span className="text-label text-text-tertiary">dckl · v0.1.0</span>
        </div>
      </div>
    </motion.aside>
  );
}

function JourneyItem({
  journey,
  active,
  onClick,
}: {
  journey: JourneyMeta;
  active: boolean;
  onClick: () => void;
}) {
  const done = journey.steps.filter((s) => s.status === "done").length;
  const broken = journey.steps.filter((s) => s.status === "broken").length;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-1.5 rounded-[4px] text-left text-body transition-colors",
          active
            ? "bg-surface-elevated text-text-primary"
            : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
        )}
        title={journey.description}
      >
        <Route size={14} strokeWidth={1.5} />
        <span className="flex-1 truncate">{journey.name}</span>
        <span className="text-label text-text-tertiary tabular-nums">
          {done}/{journey.steps.length}
          {broken > 0 ? " ·!" : ""}
        </span>
      </button>
    </li>
  );
}

function Section({
  label,
  storageKey,
  children,
}: {
  label: string;
  storageKey: string;
  children: React.ReactNode;
}) {
  const key = `dckl.sidebar.section.${storageKey}`;
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(key) !== "0";
  });

  useEffect(() => {
    window.localStorage.setItem(key, open ? "1" : "0");
  }, [key, open]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 mb-2 text-label text-text-tertiary font-medium hover:text-text-secondary transition-colors"
        aria-expanded={open}
      >
        <span>{label}</span>
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="inline-flex"
        >
          <ChevronRight size={11} strokeWidth={2} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DisabledItem({
  icon: Icon,
  label,
  hint,
}: {
  icon?: LucideIcon;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      disabled
      className="w-full flex items-center gap-3 px-3 py-1.5 rounded-[4px] text-body text-text-muted cursor-not-allowed"
      aria-disabled="true"
    >
      {Icon ? (
        <Icon size={14} strokeWidth={1.5} />
      ) : (
        <span className="inline-block w-[14px] text-center text-text-muted">+</span>
      )}
      <span className="flex-1 text-left truncate">{label}</span>
      {hint && <span className="text-label text-text-muted">{hint}</span>}
    </button>
  );
}

function StatusDot({ status }: { status: SprintMeta["status"] }) {
  // Monochrome: status encoded via shape and fill, not colour.
  switch (status) {
    case "active":
      return <span className="w-[6px] h-[6px] rounded-full bg-text-primary shrink-0" />;
    case "planning":
      return (
        <span className="w-[6px] h-[6px] rounded-full border border-text-tertiary shrink-0" />
      );
    case "review":
      return (
        <span className="w-[6px] h-[6px] rounded-full border border-text-secondary border-dashed shrink-0" />
      );
    case "done":
      return <span className="w-[6px] h-[6px] rounded-full bg-text-muted shrink-0" />;
  }
}
