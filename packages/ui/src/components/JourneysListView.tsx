import type { JourneyMeta } from "@dckl/server/schema";
import { AlertTriangle, Loader2, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/cn.js";
import { useJourneys } from "../lib/queries.js";
import { navigate } from "../lib/use-route.js";

type JourneyFilter = "all" | "broken";

const JOURNEY_FILTERS: { id: JourneyFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "broken", label: "Broken only" },
];

type Props = {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
};

export function JourneysListView({ sidebarCollapsed, onToggleSidebar }: Props) {
  const journeys = useJourneys();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<JourneyFilter>("all");

  const all = journeys.data ?? [];
  const q = query.trim().toLowerCase();
  const filtered = all.filter((j) => {
    if (q) {
      const hay = `${j.name} ${j.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filter === "broken") {
      return j.steps.some((s) => s.status === "broken");
    }
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="h-[64px] border-b border-border-subtle flex items-center px-6 gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 rounded-[4px] text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={`${sidebarCollapsed ? "Expand" : "Collapse"} sidebar (⌘\\)`}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen size={16} strokeWidth={1.5} />
          ) : (
            <PanelLeftClose size={16} strokeWidth={1.5} />
          )}
        </button>
        <span className="text-body text-text-primary font-medium">Journeys</span>
      </div>

      {!journeys.isLoading && !journeys.isError && all.length > 0 && (
        <div className="border-b border-border-subtle px-6 py-3 flex items-center gap-4">
          <label className="flex items-center gap-2 min-w-0 flex-1 max-w-[360px]">
            <Search size={14} strokeWidth={1.5} className="text-text-tertiary shrink-0" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search journeys by name or description…"
              className="flex-1 bg-transparent border-0 outline-none text-body text-text-primary placeholder:text-text-tertiary focus-visible:ring-0"
            />
          </label>
          <div className="flex items-center gap-1">
            {JOURNEY_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "px-2.5 py-1 rounded-[4px] text-label transition-colors",
                  filter === f.id
                    ? "bg-surface-elevated text-text-primary"
                    : "text-text-tertiary hover:text-text-primary hover:bg-surface-hover",
                )}
                aria-pressed={filter === f.id}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="ml-auto text-label text-text-tertiary tabular-nums">
            {filtered.length}
            {filtered.length !== all.length ? ` / ${all.length}` : ""}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {journeys.isLoading ? (
          <div className="flex items-center gap-2 text-text-tertiary p-8">
            <Loader2 className="animate-spin" size={14} strokeWidth={1.5} />
            <span className="text-body">Loading…</span>
          </div>
        ) : journeys.isError ? (
          <div className="flex items-center gap-2 text-text-secondary p-8">
            <AlertTriangle size={14} strokeWidth={1.5} />
            <span className="text-body">Failed to load journeys.</span>
          </div>
        ) : all.length === 0 ? (
          <div className="px-8 py-12 text-body text-text-tertiary">
            No journeys yet. Create one with{" "}
            <code className="font-mono text-text-secondary">dckl journey new &lt;slug&gt;</code>.
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-8 py-12 text-body text-text-tertiary">
            No journeys match this filter.
          </div>
        ) : (
          <table className="w-full text-body">
            <thead>
              <tr className="text-label text-text-tertiary border-b border-border-subtle">
                <th className="text-left font-normal px-6 py-3 w-[16px]" />
                <th className="text-left font-normal py-3">Name</th>
                <th className="text-left font-normal px-4 py-3">Description</th>
                <th className="text-right font-normal px-4 py-3 w-[110px] tabular-nums">Steps</th>
                <th className="text-right font-normal px-6 py-3 w-[80px] tabular-nums">Broken</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((journey) => (
                <JourneyRow key={journey.id} journey={journey} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function JourneyRow({ journey }: { journey: JourneyMeta }) {
  const done = journey.steps.filter((s) => s.status === "done").length;
  const broken = journey.steps.filter((s) => s.status === "broken").length;
  const total = journey.steps.length;
  return (
    <tr
      onClick={() => navigate({ kind: "journey", journeyId: journey.id })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate({ kind: "journey", journeyId: journey.id });
        }
      }}
      className="cursor-pointer border-b border-border-subtle hover:bg-surface-hover transition-colors"
      tabIndex={0}
      aria-label={`Open journey ${journey.name}`}
    >
      <td className="px-6 py-3">
        <span
          className={cn(
            "inline-block w-[6px] h-[6px] rounded-full",
            broken > 0 ? "bg-accent" : "bg-text-muted",
          )}
        />
      </td>
      <td className="py-3 text-text-primary truncate max-w-[300px]">{journey.name}</td>
      <td className="px-4 py-3 text-text-secondary truncate max-w-[480px]">
        {journey.description}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-text-secondary">
        {done}/{total}
      </td>
      <td
        className={cn(
          "px-6 py-3 text-right tabular-nums",
          broken > 0 ? "text-text-primary" : "text-text-tertiary",
        )}
      >
        {broken > 0 ? `!${broken}` : "—"}
      </td>
    </tr>
  );
}
