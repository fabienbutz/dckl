import type { TaskMeta } from "@deckel/server/schema";
import { useQueries } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ChangelogView } from "./components/ChangelogView.js";
import { EmptyState } from "./components/EmptyState.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { JourneyView } from "./components/JourneyView.js";
import { type BrowseView, Sidebar } from "./components/Sidebar.js";
import { SprintBoard } from "./components/SprintBoard.js";
import { StackView } from "./components/StackView.js";
import { TaskDrawer } from "./components/TaskDrawer.js";
import { ApiError } from "./lib/api.js";
import { api } from "./lib/api.js";
import { useConfig, usePatchTask, useSprints } from "./lib/queries.js";
import { useLiveUpdates } from "./lib/use-live-updates.js";
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
  const [activeSprintId, setActiveSprintId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<BrowseView | null>(null);
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null);
  const [activeStackPath, setActiveStackPath] = useState<string | null>(null);
  const patch = usePatchTask();
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebarState();

  // Auto-select the first sprint whose status is active; fall back to the
  // first sprint in the list.
  useEffect(() => {
    if (activeSprintId || !sprints.data) return;
    const active = sprints.data.find((s) => s.status === "active") ?? sprints.data[0];
    if (active) setActiveSprintId(active.id);
  }, [sprints.data, activeSprintId]);

  const taskQueries = useQueries({
    queries: useMemo(() => {
      if (!activeSprintId || !sprints.data) return [];
      const sprint = sprints.data.find((s) => s.id === activeSprintId);
      if (!sprint) return [];
      return sprint.task_ids.map((taskId) => ({
        queryKey: ["task", activeSprintId, taskId] as const,
        queryFn: () => api.getTask(activeSprintId, taskId),
        // Live updates via SSE (useLiveUpdates) invalidate on real events.
        // A longer stale-time reduces noise; the 30s fallback is a safety
        // net in case a reconnect misses an event.
        refetchInterval: 30_000,
        staleTime: 5_000,
      }));
    }, [activeSprintId, sprints.data]),
  });

  const tasks: TaskMeta[] = taskQueries
    .map((q) => q.data?.data.meta)
    .filter((m): m is TaskMeta => Boolean(m));

  if (config.isError && config.error instanceof ApiError && config.error.status === 503) {
    return (
      <EmptyState
        title="No .deckel/ in this directory"
        description="Scaffold one so Deckel knows where to read and write sprints and tasks."
        command="pnpm deckel init"
      />
    );
  }

  if (sprints.isLoading || config.isLoading) return null;

  if ((sprints.data ?? []).length === 0) {
    return (
      <EmptyState
        title="No sprints yet"
        description="Add a sprint folder under .deckel/sprints/ with an index.md to see it here. Sprint creation from the UI lands in Sprint 3."
      />
    );
  }

  const showDrawer = Boolean(activeSprintId && selectedTaskId);

  return (
    <div className="min-h-screen">
      <main className="flex h-screen">
        <Sidebar
          config={config.data?.data ?? null}
          sprints={sprints.data ?? []}
          activeSprintId={activeSprintId}
          onSelectSprint={(id) => {
            setActiveSprintId(id);
            setSelectedTaskId(null);
            setActiveView(null);
          }}
          activeView={activeView}
          onSelectView={(v) => {
            setActiveView(v);
            if (v !== "journey") setActiveJourneyId(null);
          }}
          activeJourneyId={activeJourneyId}
          onSelectJourney={(id) => {
            setActiveJourneyId(id);
            setActiveView("journey");
          }}
          collapsed={sidebarCollapsed}
        />
        <div className="flex-1 min-w-0">
          {activeView === "changelog" ? (
            <ChangelogView />
          ) : activeView === "stack" ? (
            <StackView
              activePath={activeStackPath}
              onSelectPath={setActiveStackPath}
            />
          ) : activeView === "journey" && activeJourneyId ? (
            <JourneyView journeyId={activeJourneyId} />
          ) : (
            activeSprintId && (
              <SprintBoard
                sprintId={activeSprintId}
                selectedTaskId={selectedTaskId}
                onSelectTask={(id) => setSelectedTaskId(id)}
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
              animate={{ width: 420, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "tween", duration: 0.22, ease: [0.2, 0, 0.2, 1] }}
              className="overflow-hidden shrink-0"
            >
              <div className="w-[420px] h-full">
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
                      onClose={() => setSelectedTaskId(null)}
                      onOpenDoc={(path) => {
                        setActiveStackPath(path);
                        setActiveView("stack");
                        setSelectedTaskId(null);
                      }}
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
