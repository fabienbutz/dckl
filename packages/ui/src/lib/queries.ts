import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Task, TaskMeta } from "@dckl/server/schema";
import { ApiError, api, type WithEtag } from "./api.js";

const keys = {
  config: ["config"] as const,
  templates: ["templates", "security-checks"] as const,
  changelog: ["changelog"] as const,
  stack: ["stack"] as const,
  stackFile: (path: string) => ["stack", "file", path] as const,
  journeys: ["journeys"] as const,
  journey: (id: string) => ["journey", id] as const,
  sprints: ["sprints"] as const,
  sprint: (id: string) => ["sprint", id] as const,
  sprintCommits: (id: string) => ["sprint-commits", id] as const,
  task: (sprintId: string, taskId: string) => ["task", sprintId, taskId] as const,
};

export function useJourneys() {
  return useQuery({
    queryKey: keys.journeys,
    queryFn: api.getJourneys,
    select: (v) => v.data.journeys,
    staleTime: 10_000,
  });
}

export function useJourney(id: string | null) {
  return useQuery({
    queryKey: id ? keys.journey(id) : ["journey", "disabled"],
    queryFn: () => api.getJourney(id as string),
    enabled: Boolean(id),
    select: (v) => v.data,
    staleTime: 5_000,
  });
}

export function useStackInventory() {
  return useQuery({
    queryKey: keys.stack,
    queryFn: api.getStackInventory,
    select: (v) => v.data,
    staleTime: 10_000,
  });
}

export function useStackFile(path: string | null) {
  return useQuery({
    queryKey: path ? keys.stackFile(path) : ["stack", "file", "disabled"],
    queryFn: () => api.getStackFile(path as string),
    enabled: Boolean(path),
    select: (v) => v.text,
    staleTime: 30_000,
  });
}

export function useChangelog() {
  return useQuery({
    queryKey: keys.changelog,
    queryFn: api.getChangelog,
    select: (v: WithEtag<{ content: string }>) => v.data.content,
    refetchInterval: 60_000,
    staleTime: 2_000,
  });
}

export function useConfig() {
  return useQuery({
    queryKey: keys.config,
    queryFn: api.getConfig,
    retry: (failureCount, err) =>
      failureCount < 1 && (!(err instanceof ApiError) || err.status >= 500),
  });
}

export function useSecurityTemplates() {
  return useQuery({
    queryKey: keys.templates,
    queryFn: api.getSecurityTemplates,
    select: (v) => v.data.templates,
    staleTime: 60_000,
  });
}

export function useSprints() {
  return useQuery({
    queryKey: keys.sprints,
    queryFn: api.getSprints,
    select: (v) => v.data.sprints,
  });
}

export function useSprint(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? keys.sprint(id) : ["sprint", "disabled"],
    queryFn: () => api.getSprint(id as string),
    enabled: Boolean(id),
  });
}

export function useSprintCommits(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? keys.sprintCommits(id) : ["sprint-commits", "disabled"],
    queryFn: () => api.getSprintCommits(id as string),
    enabled: Boolean(id),
    select: (v) => v.data.commits,
    staleTime: 30_000,
    // git log is cheap but not free; refetch once a minute while idle.
    refetchInterval: 60_000,
  });
}

export function useTask(sprintId: string | null | undefined, taskId: string | null | undefined) {
  return useQuery({
    queryKey:
      sprintId && taskId ? keys.task(sprintId, taskId) : ["task", "disabled"],
    queryFn: () => api.getTask(sprintId as string, taskId as string),
    enabled: Boolean(sprintId && taskId),
    // Live updates via SSE (useLiveUpdates) invalidate on real events.
    // The 30s fallback catches any events missed during a reconnect gap.
    refetchInterval: 30_000,
    staleTime: 5_000,
  });
}

type PatchArgs = {
  sprintId: string;
  taskId: string;
  patch: Partial<TaskMeta>;
};

/**
 * Optimistic PATCH with rollback. Uses the cached ETag as If-Match; on 409,
 * invalidates the task query so the UI refetches the authoritative state
 * and the caller can decide whether to retry the patch against the fresh
 * ETag.
 */
export function usePatchTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ sprintId, taskId, patch }: PatchArgs) => {
      const cached = qc.getQueryData<WithEtag<Task>>(keys.task(sprintId, taskId));
      if (!cached) throw new Error("Task not in cache — load it first");
      return api.patchTask(sprintId, taskId, patch, cached.etag);
    },
    onMutate: async ({ sprintId, taskId, patch }) => {
      await qc.cancelQueries({ queryKey: keys.task(sprintId, taskId) });
      const prev = qc.getQueryData<WithEtag<Task>>(keys.task(sprintId, taskId));
      if (prev) {
        qc.setQueryData<WithEtag<Task>>(keys.task(sprintId, taskId), {
          ...prev,
          data: { ...prev.data, meta: { ...prev.data.meta, ...patch } },
        });
      }
      return { prev };
    },
    onError: (_err, { sprintId, taskId }, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.task(sprintId, taskId), ctx.prev);
    },
    onSuccess: (fresh, { sprintId, taskId }) => {
      qc.setQueryData(keys.task(sprintId, taskId), fresh);
    },
    onSettled: (_data, _err, { sprintId }) => {
      qc.invalidateQueries({ queryKey: keys.sprint(sprintId) });
      qc.invalidateQueries({ queryKey: keys.sprints });
    },
  });
}
