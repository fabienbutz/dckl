import type { TaskMeta } from "@dckl/server/schema";
import { useQueries } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo } from "react";
import { ChangelogView } from "./components/ChangelogView.js";
import { EmptyState } from "./components/EmptyState.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { JourneyView } from "./components/JourneyView.js";
import { PagesView } from "./components/PagesView.js";
import { Sidebar } from "./components/Sidebar.js";
import { SprintBoard } from "./components/SprintBoard.js";
import { SprintBriefingView } from "./components/SprintBriefingView.js";
import { StackView } from "./components/StackView.js";
import { TaskDrawer } from "./components/TaskDrawer.js";
import { ApiError } from "./lib/api.js";
import { api } from "./lib/api.js";
import { useConfig, usePatchTask, useSprints } from "./lib/queries.js";
import { useLiveUpdates } from "./lib/use-live-updates.js";
import { type Route, navigate, useRoute } from "./lib/use-route.js";
import { useSidebarState } from "./lib/use-sidebar-state.js";

export function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

function AppInner() {
  useLiveUpdates();
  const config = useConfig();
  const sprints = useSprints();
  const route = useRoute();
  const patch = usePatchTask();
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebarState();

  // Derive the "currently focused sprint" from the route. For sprint-
  // scoped routes (sprint, task, briefing) the answer is obvious; for
  // everything else (changelog, stack, pages, journey) we fall back to
  // the active sprint so the sidebar keeps its highlight and the task
  // cache stays warm.
  const fallbackSprintId = useMemo(() => {
    if (!sprints.data || sprints.data.length === 0) return null;
    return (
      sprints.data.find((s) => s.status === "active")?.id ??
      sprints.data[0]?.id ??
      null
    );
  }, [sprints.data]);

  const activeSprintId = routeSprintId(route) ?? fallbackSprintId;

  // Auto-redirect home → active sprint once sprints load. replaceState
  // so browser-back does not bounce between `#/` and `#/sprints/:id`.
  useEffect(() => {
    if (route.kind !== "home") return;
    if (!fallbackSprintId) return;
    navigate({ kind: "sprint", sprintId: fallbackSprintId }, { replace: true });
  }, [route, fallbackSprintId]);

  const taskQueries = useQueries({
    queries: useMemo(() => {
      if (!activeSprintId || !sprints.data) return [];
      const sprint = sprints.data.find((s) => s.id === activeSprintId);
      if (!sprint) return [];
      return sprint.task_ids.map((taskId) => ({
        queryKey: ["task", activeSprintId, taskId] as const,
        queryFn: () => api.getTask(activeSprintId, taskId),
        refetchInterval: 30_000,
        staleTime: 5_000,
      }));
    }, [activeSprintId, sprints.data]),
  });

  const tasks = taskQueries
    .map((q) => {
      const data = q.data?.data;
      if (!data) return null;
      return { ...data.meta, summary: data.summary ?? null };
    })
    .filter((t): t is TaskMeta & { summary: string | null } => Boolean(t));

  if (config.isError && config.error instanceof ApiError && config.error.status === 503) {
    return (
      <EmptyState
        title="No .dckl/ in this directory"
        description="Scaffold one so dckl knows where to read and write sprints and tasks."
        command="dckl init"
      />
    );
  }

  if (sprints.isLoading || config.isLoading) return null;

  if ((sprints.data ?? []).length === 0) {
    return (
      <EmptyState
        title="No sprints yet"
        description="Add a sprint folder under .dckl/sprints/ with an index.md to see it here."
      />
    );
  }

  const selectedTaskId = route.kind === "task" ? route.taskId : null;
  const showDrawer = Boolean(route.kind === "task" && activeSprintId && selectedTaskId);
  const activeJourneyId = route.kind === "journey" ? route.journeyId : null;
  const activeStackPath = route.kind === "stack" ? route.path : null;

  return (
    <div className="min-h-screen">
      <main className="flex h-screen relative">
        <Sidebar
          config={config.data?.data ?? null}
          sprints={sprints.data ?? []}
          activeSprintId={activeSprintId}
          onSelectSprint={(id) => navigate({ kind: "sprint", sprintId: id })}
          activeView={viewFromRoute(route)}
          onSelectView={(v) => {
            // `null` is a legacy "clear browse-view" side-effect from the
            // pre-router Sidebar — it fires alongside onSelectSprint(…)
            // on every sprint click. In URL mode the sprint navigate
            // already switches the view, so this must be a no-op; if we
            // navigated here too it would race the sprint click.
            if (v === "changelog") navigate({ kind: "changelog" });
            else if (v === "stack") navigate({ kind: "stack", path: null });
            else if (v === "pages") navigate({ kind: "pages" });
          }}
          activeJourneyId={activeJourneyId}
          onSelectJourney={(id) => navigate({ kind: "journey", journeyId: id })}
          collapsed={sidebarCollapsed}
        />
        <div className="flex-1 min-w-0">
          {route.kind === "changelog" ? (
            <ChangelogView />
          ) : route.kind === "stack" ? (
            <StackView
              activePath={activeStackPath}
              onSelectPath={(p) => navigate({ kind: "stack", path: p })}
            />
          ) : route.kind === "pages" ? (
            <PagesView
              onSelectFile={(file) => navigate({ kind: "stack", path: file })}
            />
          ) : route.kind === "sprint-briefing" ? (
            <SprintBriefingView
              sprintId={route.sprintId}
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={toggleSidebar}
            />
          ) : route.kind === "journey" && activeJourneyId ? (
            <JourneyView journeyId={activeJourneyId} />
          ) : (
            activeSprintId && (
              <SprintBoard
                sprintId={activeSprintId}
                selectedTaskId={selectedTaskId}
                onSelectTask={(id) =>
                  navigate({ kind: "task", sprintId: activeSprintId, taskId: id })
                }
                onStatusCycle={(task, next) =>
                  patch.mutate({
                    sprintId: activeSprintId,
                    taskId: task.id,
                    patch: { status: next },
                  })
                }
                tasks={tasks}
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={toggleSidebar}
              />
            )
          )}
        </div>
        <AnimatePresence initial={false}>
          {showDrawer && activeSprintId && selectedTaskId && (
            <motion.div
              key="drawer"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 780, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "tween", duration: 0.22, ease: [0.2, 0, 0.2, 1] }}
              className="absolute right-0 top-0 h-full z-20 overflow-hidden shadow-[-12px_0_32px_rgba(0,0,0,0.45)]"
            >
              <div className="w-[780px] h-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedTaskId}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    <TaskDrawer
                      sprintId={activeSprintId}
                      taskId={selectedTaskId}
                      onClose={() =>
                        navigate({ kind: "sprint", sprintId: activeSprintId })
                      }
                      onOpenDoc={(path) =>
                        navigate({ kind: "stack", path })
                      }
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function routeSprintId(route: Route): string | null {
  switch (route.kind) {
    case "sprint":
    case "task":
    case "sprint-briefing":
      return route.sprintId;
    default:
      return null;
  }
}

function viewFromRoute(route: Route): "changelog" | "stack" | "pages" | "journey" | null {
  switch (route.kind) {
    case "changelog":
      return "changelog";
    case "stack":
      return "stack";
    case "pages":
      return "pages";
    case "journey":
      return "journey";
    default:
      return null;
  }
}
