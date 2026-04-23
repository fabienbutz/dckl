import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

type TaskUpdatedEvent = { kind: "task.updated"; sprint_id: string; task_id: string };
type SprintUpdatedEvent = { kind: "sprint.updated"; sprint_id: string };
type ConfigUpdatedEvent = { kind: "config.updated" };
type dcklEvent = TaskUpdatedEvent | SprintUpdatedEvent | ConfigUpdatedEvent;

/**
 * Subscribes to the server's SSE stream and invalidates the affected
 * TanStack Query keys when events arrive. Replaces the 5-second polling
 * with push-based freshness: a CLI `dckl check TSK-01 …` shows up in
 * the UI within the network round-trip (sub-100ms on localhost).
 */
export function useLiveUpdates(): void {
  const qc = useQueryClient();

  useEffect(() => {
    const source = new EventSource("/api/events");

    const handleTask = (raw: MessageEvent) => {
      try {
        const event = JSON.parse(raw.data as string) as TaskUpdatedEvent;
        qc.invalidateQueries({ queryKey: ["task", event.sprint_id, event.task_id] });
        qc.invalidateQueries({ queryKey: ["sprint", event.sprint_id] });
        qc.invalidateQueries({ queryKey: ["sprints"] });
        // Every task update appends to the changelog, so the changelog view
        // must refetch too.
        qc.invalidateQueries({ queryKey: ["changelog"] });
      } catch {
        // ignore malformed payloads
      }
    };

    const handleSprint = (raw: MessageEvent) => {
      try {
        const event = JSON.parse(raw.data as string) as SprintUpdatedEvent;
        qc.invalidateQueries({ queryKey: ["sprint", event.sprint_id] });
        qc.invalidateQueries({ queryKey: ["sprints"] });
      } catch {
        // ignore
      }
    };

    const handleConfig = () => {
      qc.invalidateQueries({ queryKey: ["config"] });
    };

    source.addEventListener("task.updated", handleTask);
    source.addEventListener("sprint.updated", handleSprint);
    source.addEventListener("config.updated", handleConfig);

    // Debug-friendly: log "hello" and "ping" only at trace level in dev.
    // We don't invalidate on them — they exist to prove the stream is open.

    source.onerror = () => {
      // EventSource auto-reconnects. On reconnect, also force a refetch so
      // we catch any events missed during the gap.
      qc.invalidateQueries();
    };

    return () => {
      source.removeEventListener("task.updated", handleTask as EventListener);
      source.removeEventListener("sprint.updated", handleSprint as EventListener);
      source.removeEventListener("config.updated", handleConfig as EventListener);
      source.close();
    };
  }, [qc]);

  // No return: this hook is installed at the app root as a side-effect and
  // simply keeps the query cache in sync.
  return;
}

// Export the event type so consumers can typecheck custom handlers if
// needed later.
export type { dcklEvent };
