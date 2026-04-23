import { AlertTriangle, History, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { useChangelog } from "../lib/queries.js";

type Section = { date: string; entries: string[] };

function parse(content: string): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const line of content.split("\n")) {
    const dayMatch = /^##\s+(\d{4}-\d{2}-\d{2})\s*$/.exec(line);
    if (dayMatch?.[1]) {
      current = { date: dayMatch[1], entries: [] };
      sections.push(current);
      continue;
    }
    if (current && line.startsWith("- ")) {
      current.entries.push(line.slice(2));
    }
  }
  return sections;
}

// Minimal inline markdown renderer — supports **bold** and `code` only.
// Anything else is rendered as-is. Keeps us off react-markdown (bundle cost)
// since the changelog format is known and narrow.
function InlineText({ text }: { text: string }): ReactNode {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  const pattern = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex-exec idiom
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }
    if (match[1] !== undefined) {
      nodes.push(
        <strong key={key++} className="text-text-primary font-medium">
          {match[1]}
        </strong>,
      );
    } else if (match[2] !== undefined) {
      nodes.push(
        <code
          key={key++}
          className="font-mono text-label text-text-primary px-1 py-0.5 rounded-[3px] bg-surface-hover"
        >
          {match[2]}
        </code>,
      );
    }
    cursor = pattern.lastIndex;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

export function ChangelogView() {
  const q = useChangelog();

  return (
    <div className="h-full flex flex-col">
      <div className="h-[64px] border-b border-border-subtle flex items-center px-8 gap-3">
        <History size={16} strokeWidth={1.5} className="text-text-secondary" />
        <div className="text-body text-text-primary font-medium">Changelog</div>
        <div className="ml-auto text-label text-text-tertiary">
          .deckel/CHANGELOG.md
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-8">
        {q.isLoading && (
          <div className="flex items-center gap-2 text-text-tertiary">
            <Loader2 className="animate-spin" size={14} strokeWidth={1.5} />
            <span className="text-body">Loading changelog…</span>
          </div>
        )}

        {q.isError && (
          <div className="flex items-center gap-2 text-text-secondary">
            <AlertTriangle size={14} strokeWidth={1.5} />
            <span className="text-body">Failed to load changelog.</span>
          </div>
        )}

        {q.data !== undefined && <ChangelogBody content={q.data} />}
      </div>
    </div>
  );
}

function ChangelogBody({ content }: { content: string }) {
  const sections = parse(content);

  if (sections.length === 0) {
    return (
      <div className="max-w-xl space-y-3 text-text-secondary">
        <div className="text-body">
          No changelog entries yet. Every status flip, check toggle, or
          correction via <code className="font-mono text-label">deckel check</code> /{" "}
          <code className="font-mono text-label">deckel correction add</code> will
          append here.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-2xl">
      {sections.map((section) => (
        <section key={section.date}>
          <div className="flex items-baseline gap-3 mb-3 pb-2 border-b border-border-subtle">
            <h2 className="text-heading font-medium text-text-primary tabular-nums">
              {section.date}
            </h2>
            <span className="text-label text-text-tertiary">
              {section.entries.length} event{section.entries.length === 1 ? "" : "s"}
            </span>
          </div>
          <ul className="space-y-1.5">
            {section.entries.map((entry, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: entries are stable within a section snapshot
                key={i}
                className={cn(
                  "text-body text-text-secondary leading-relaxed pl-3 border-l border-border-subtle",
                )}
              >
                <InlineText text={entry} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
