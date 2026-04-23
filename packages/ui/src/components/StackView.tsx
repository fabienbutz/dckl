import {
  BookOpen,
  BookText,
  Brain,
  Cog,
  FileCode,
  FileText,
  Settings,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { StackEntry } from "../lib/api.js";
import { cn } from "../lib/cn.js";
import { useStackInventory } from "../lib/queries.js";
import { MarkdownReader } from "./MarkdownReader.js";

type Props = {
  /** Controlled selected-path — lets the parent jump directly to a file
   *  (e.g. from TaskDrawer's related_docs). */
  activePath?: string | null;
  onSelectPath?: (path: string) => void;
};

const CATEGORY_ORDER: StackEntry["category"][] = [
  "claude-md",
  "rule",
  "skill",
  "command",
  "hook",
  "mcp",
  "doc",
  "memory",
];

const CATEGORY_LABEL: Record<StackEntry["category"], string> = {
  "claude-md": "CLAUDE.md",
  rule: "Rules",
  skill: "Skills",
  command: "Slash-commands",
  hook: "Hooks",
  mcp: "MCP",
  doc: "Docs",
  memory: "Memory",
};

const CATEGORY_ICON: Record<StackEntry["category"], LucideIcon> = {
  "claude-md": FileText,
  rule: BookText,
  skill: Wrench,
  command: FileCode,
  hook: Settings,
  mcp: Cog,
  doc: BookOpen,
  memory: Brain,
};

const MEMORY_COLLAPSED_KEY = "dckl.stack.memory-collapsed";

export function StackView({ activePath: controlledPath, onSelectPath }: Props = {}) {
  const q = useStackInventory();
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const [memoryCollapsed, setMemoryCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(MEMORY_COLLAPSED_KEY);
    // Default collapsed — privacy-first (screenshare-safe).
    return stored === null ? true : stored === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MEMORY_COLLAPSED_KEY, memoryCollapsed ? "1" : "0");
  }, [memoryCollapsed]);

  const entries = q.data?.entries ?? [];
  const grouped = new Map<StackEntry["category"], StackEntry[]>();
  for (const e of entries) {
    const existing = grouped.get(e.category) ?? [];
    existing.push(e);
    grouped.set(e.category, existing);
  }

  // Selection precedence: explicit parent-controlled path → internal
  // click-state → first entry (auto-select so the reader isn't empty).
  const firstPath = entries[0]?.path ?? null;
  const activePath = controlledPath ?? internalSelected ?? firstPath;

  // Mirror controlled path into internal state so follow-up clicks work
  // without the parent needing to re-emit the controlled value.
  useEffect(() => {
    if (controlledPath) setInternalSelected(controlledPath);
  }, [controlledPath]);

  const handleSelect = (path: string) => {
    setInternalSelected(path);
    onSelectPath?.(path);
  };

  return (
    <div className="h-full flex">
      <aside className="w-[280px] shrink-0 border-r border-border-subtle overflow-auto">
        <div className="h-[64px] px-6 flex items-center text-body font-medium text-text-primary">
          Stack
        </div>
        <nav className="px-3 pb-6 space-y-6">
          {CATEGORY_ORDER.filter((c) => grouped.has(c)).map((category) => {
            const Icon = CATEGORY_ICON[category];
            const items = grouped.get(category) ?? [];
            const isMemory = category === "memory";
            const collapsed = isMemory && memoryCollapsed;
            return (
              <div key={category}>
                <button
                  type="button"
                  onClick={() => {
                    if (isMemory) setMemoryCollapsed((c) => !c);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 mb-2 text-label text-text-tertiary",
                    isMemory ? "cursor-pointer hover:text-text-secondary" : "cursor-default",
                  )}
                  aria-expanded={!collapsed}
                >
                  <Icon size={13} strokeWidth={1.5} />
                  <span>{CATEGORY_LABEL[category]}</span>
                  {isMemory && (
                    <span className="text-label text-text-muted italic">
                      user-private · local only
                    </span>
                  )}
                  <span className="ml-auto tabular-nums">{items.length}</span>
                </button>
                {!collapsed && (
                  <ul className="space-y-0.5">
                    {items.map((entry) => (
                      <li key={entry.path}>
                        <button
                          type="button"
                          onClick={() => handleSelect(entry.path)}
                          className={cn(
                            "w-full text-left px-3 py-1.5 rounded-[4px] text-body truncate transition-colors",
                            entry.path === activePath
                              ? "bg-surface-elevated text-text-primary"
                              : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                          )}
                        >
                          {entry.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          {entries.length === 0 && (
            <div className="px-3 text-body text-text-tertiary">
              {q.isLoading ? "Scanning…" : "Nothing to show. Run `pnpm dckl init`."}
            </div>
          )}
        </nav>
      </aside>

      <div className="flex-1 min-w-0">
        {activePath ? (
          <MarkdownReader
            path={activePath}
            label={entries.find((e) => e.path === activePath)?.label}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-text-tertiary">
            <div className="text-body">Select a file.</div>
          </div>
        )}
      </div>
    </div>
  );
}
