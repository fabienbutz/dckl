import type { Config } from "@dckl/server/schema";
import { motion } from "framer-motion";
import { History, Inbox, Layers, Map, Route as RouteIcon, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SprintListItem } from "../lib/api.js";
import { cn } from "../lib/cn.js";
import { useBacklog, useJourneys } from "../lib/queries.js";
import type { Route } from "../lib/use-route.js";
import { navigate } from "../lib/use-route.js";

type Props = {
  config: Config | null;
  sprints: SprintListItem[];
  route: Route;
  collapsed: boolean;
};

export function Sidebar({ config, sprints, route, collapsed }: Props) {
  const journeys = useJourneys();
  const backlog = useBacklog();
  const projectName = config?.project.name ?? "dckl";

  const liveSprints = sprints.filter(
    (s) => s.status === "active" || s.live === true,
  ).length;
  const brokenJourneys = (journeys.data ?? []).reduce(
    (n, j) => n + j.steps.filter((s) => s.status === "broken").length,
    0,
  );
  const backlogCount = backlog.data?.length ?? 0;

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 0 : 240 }}
      transition={{ type: "tween", duration: 0.2, ease: [0.2, 0, 0.2, 1] }}
      className="shrink-0 h-full overflow-hidden border-r border-border-subtle bg-bg"
      aria-hidden={collapsed}
    >
      <div className="w-[240px] h-full flex flex-col">
        <div className="h-[64px] px-6 flex items-center">
          <div className="font-medium text-body text-text-primary truncate">{projectName}</div>
        </div>

        <nav className="flex-1 overflow-auto px-3 py-4 space-y-0.5">
          <NavItem
            icon={RouteIcon}
            label="Sprints"
            badge={liveSprints > 0 ? String(liveSprints) : null}
            badgeLive={liveSprints > 0}
            active={isSprintActive(route)}
            onClick={() => navigate({ kind: "sprints-list" })}
          />
          <NavItem
            icon={Workflow}
            label="Journeys"
            badge={brokenJourneys > 0 ? `!${brokenJourneys}` : null}
            active={route.kind === "journeys-list" || route.kind === "journey"}
            onClick={() => navigate({ kind: "journeys-list" })}
          />
          <NavItem
            icon={Inbox}
            label="Backlog"
            badge={backlogCount > 0 ? String(backlogCount) : null}
            active={route.kind === "backlog"}
            onClick={() => navigate({ kind: "backlog" })}
          />
          <NavItem
            icon={Map}
            label="Pages"
            active={route.kind === "pages"}
            onClick={() => navigate({ kind: "pages" })}
          />
          <NavItem
            icon={Layers}
            label="Stack"
            active={route.kind === "stack"}
            onClick={() => navigate({ kind: "stack", path: null })}
          />
          <NavItem
            icon={History}
            label="Changelog"
            active={route.kind === "changelog"}
            onClick={() => navigate({ kind: "changelog" })}
          />
        </nav>

        <div className="h-[40px] px-6 flex items-center">
          <span className="text-label text-text-tertiary">dckl · v0.1.0</span>
        </div>
      </div>
    </motion.aside>
  );
}

function isSprintActive(route: Route): boolean {
  return (
    route.kind === "sprints-list" ||
    route.kind === "sprint" ||
    route.kind === "task" ||
    route.kind === "sprint-briefing" ||
    route.kind === "home"
  );
}

function NavItem({
  icon: Icon,
  label,
  badge,
  badgeLive,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  badge?: string | null;
  badgeLive?: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-1.5 rounded-[4px] text-left text-body transition-colors",
        active
          ? "bg-surface-elevated text-text-primary"
          : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
      )}
    >
      <Icon size={14} strokeWidth={1.5} className="shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span
          className={cn(
            "text-label tabular-nums",
            badgeLive ? "text-accent" : "text-text-tertiary",
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
