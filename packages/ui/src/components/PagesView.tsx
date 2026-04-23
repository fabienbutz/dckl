import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FileCode, Loader2, Map as MapIcon } from "lucide-react";
import { api } from "../lib/api.js";
import type { WithEtag } from "../lib/api.js";

type RouteEntry = { route: string; file: string };
type ScanResult = {
  framework: "nextjs" | "custom" | "none";
  entries: RouteEntry[];
  scannedRoots: string[];
};

type Props = {
  onSelectFile?: (path: string) => void;
};

export function PagesView({ onSelectFile }: Props) {
  const q = useQuery({
    queryKey: ["pages"] as const,
    queryFn: () => api.getPages() as Promise<WithEtag<ScanResult>>,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 text-text-tertiary p-8">
        <Loader2 className="animate-spin" size={14} strokeWidth={1.5} />
        <span className="text-body">Scanning routes…</span>
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="flex items-center gap-2 text-text-secondary p-8">
        <AlertTriangle size={14} strokeWidth={1.5} />
        <span className="text-body">Failed to load pages.</span>
      </div>
    );
  }

  const { framework, entries, scannedRoots } = q.data.data;

  return (
    <div className="h-full overflow-auto px-8 py-8">
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-1">
          <MapIcon size={16} strokeWidth={1.5} className="text-text-tertiary" />
          <h1 className="text-heading font-medium text-text-primary">Pages</h1>
        </div>
        <p className="text-body text-text-tertiary mb-6">
          {framework === "none" ? (
            <>
              Kein Frontend-Framework erkannt. Setze <code>pages.roots</code> in{" "}
              <code>.dckl/config.yaml</code>, um einen Scanner zu konfigurieren.
            </>
          ) : (
            <>
              Framework: <strong>{framework}</strong> · Scan:{" "}
              <code>{scannedRoots.join(", ")}</code> · {entries.length} Routen
            </>
          )}
        </p>

        {entries.length > 0 && (
          <div className="border border-border-subtle rounded-[4px] bg-surface">
            <ul className="divide-y divide-border-subtle">
              {entries.map((entry) => (
                <li key={entry.file}>
                  <button
                    type="button"
                    onClick={() => onSelectFile?.(entry.file)}
                    disabled={!onSelectFile}
                    className={
                      onSelectFile
                        ? "w-full text-left flex items-center gap-4 px-4 py-2.5 hover:bg-surface-hover transition-colors cursor-pointer"
                        : "w-full text-left flex items-center gap-4 px-4 py-2.5"
                    }
                  >
                    <code className="font-mono text-[13px] text-text-primary flex-1 truncate">
                      {entry.route}
                    </code>
                    <span className="flex items-center gap-1.5 text-label text-text-tertiary shrink-0 font-mono">
                      <FileCode size={11} strokeWidth={1.5} />
                      <span className="truncate max-w-[380px]">{entry.file}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
