/**
 * Tiny in-memory event bus for fan-out of state changes from Store writes
 * to SSE subscribers. No persistence, no replay — if a client misses an
 * event, their next refetch (on reconnect or window-focus) catches up.
 */
export type DeckelEvent =
  | { kind: "task.updated"; sprint_id: string; task_id: string }
  | { kind: "sprint.updated"; sprint_id: string }
  | { kind: "config.updated" };

export type Listener = (event: DeckelEvent) => void;

export class EventBus {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(event: DeckelEvent): void {
    for (const l of this.listeners) {
      try {
        l(event);
      } catch (err) {
        console.warn("[deckel event bus] listener threw:", err);
      }
    }
  }

  size(): number {
    return this.listeners.size;
  }
}
