import { useSyncExternalStore } from "react";

/**
 * Typed route shape for dckl. Hash-based — no React Router, no server
 * needed. Unknown paths fall back to `home`, which the app resolves to
 * the active sprint once sprints load.
 */
export type Route =
  | { kind: "home" }
  | { kind: "sprint"; sprintId: string }
  | { kind: "sprint-briefing"; sprintId: string }
  | { kind: "task"; sprintId: string; taskId: string }
  | { kind: "journey"; journeyId: string }
  | { kind: "pages" }
  | { kind: "stack"; path: string | null }
  | { kind: "changelog" };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, "").replace(/\/+$/, "");
  if (!raw) return { kind: "home" };

  const parts = raw.split("/").map((p) => {
    try {
      return decodeURIComponent(p);
    } catch {
      return p;
    }
  });

  if (parts[0] === "sprints" && parts[1]) {
    const sprintId = parts[1];
    if (parts[2] === "tasks" && parts[3]) {
      return { kind: "task", sprintId, taskId: parts[3] };
    }
    if (parts[2] === "briefing") {
      return { kind: "sprint-briefing", sprintId };
    }
    return { kind: "sprint", sprintId };
  }
  if (parts[0] === "journeys" && parts[1]) {
    return { kind: "journey", journeyId: parts[1] };
  }
  if (parts[0] === "pages") return { kind: "pages" };
  if (parts[0] === "stack") {
    // Stack paths may contain slashes; preserve them encoded.
    const rest = parts.slice(1);
    const path = rest.length > 0 ? rest.join("/") : null;
    return { kind: "stack", path };
  }
  if (parts[0] === "changelog") return { kind: "changelog" };
  return { kind: "home" };
}

export function toHash(route: Route): string {
  switch (route.kind) {
    case "home":
      return "#/";
    case "sprint":
      return `#/sprints/${encodeURIComponent(route.sprintId)}`;
    case "sprint-briefing":
      return `#/sprints/${encodeURIComponent(route.sprintId)}/briefing`;
    case "task":
      return `#/sprints/${encodeURIComponent(route.sprintId)}/tasks/${encodeURIComponent(route.taskId)}`;
    case "journey":
      return `#/journeys/${encodeURIComponent(route.journeyId)}`;
    case "pages":
      return "#/pages";
    case "stack":
      return route.path
        ? `#/stack/${route.path.split("/").map(encodeURIComponent).join("/")}`
        : "#/stack";
    case "changelog":
      return "#/changelog";
  }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function getSnapshot(): string {
  return typeof window !== "undefined" ? window.location.hash : "";
}

function getServerSnapshot(): string {
  return "";
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return parseHash(hash);
}

/**
 * Navigate to a route. By default pushes a new history entry so the
 * back button works. Use `replace: true` for silent redirects (e.g.
 * `home → sprint` once sprints load).
 */
export function navigate(route: Route, opts: { replace?: boolean } = {}): void {
  if (typeof window === "undefined") return;
  const next = toHash(route);
  const current = window.location.hash || "#/";
  if (next === current) return;
  if (opts.replace) {
    const url = `${window.location.pathname}${window.location.search}${next}`;
    window.history.replaceState(null, "", url);
    // replaceState doesn't fire hashchange — dispatch manually so
    // useSyncExternalStore notifies subscribers.
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = next;
  }
}
