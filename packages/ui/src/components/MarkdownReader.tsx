import { AlertTriangle, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../lib/cn.js";
import { useStackFile } from "../lib/queries.js";
import { MD_COMPONENTS } from "./MarkdownBody.js";

// Note: we deliberately do NOT import gray-matter into the UI bundle.
// Parsing frontmatter client-side is a single regex — see splitFrontmatter
// below. gray-matter would add ~50 KB to the bundle for no gain here.

type FrontmatterResult = {
  meta: Record<string, unknown>;
  body: string;
};

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

function splitFrontmatter(content: string): FrontmatterResult {
  const match = FRONTMATTER_RE.exec(content);
  if (!match?.[1]) return { meta: {}, body: content };
  const meta = parseSimpleYaml(match[1]);
  return { meta, body: content.slice(match[0].length).trimStart() };
}

/**
 * Ultra-small YAML parser for the single use case of rendering frontmatter
 * as a metadata header. Supports: `key: value`, `key: "quoted"`, and
 * one-level-deep lists as `- item`. Anything fancier is rendered as a
 * plain string. The real parser lives server-side; this one exists only
 * to format the header.
 */
function parseSimpleYaml(text: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const lines = text.split("\n");
  let currentKey: string | null = null;
  let list: string[] | null = null;
  for (const raw of lines) {
    if (!raw.trim()) continue;
    if (/^\s*-\s/.test(raw)) {
      if (currentKey && list) {
        list.push(raw.replace(/^\s*-\s*/, "").trim().replace(/^["'](.*)["']$/, "$1"));
        out[currentKey] = list;
      }
      continue;
    }
    const m = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(raw);
    if (!m) continue;
    const key = m[1] as string;
    const rhs = m[2]?.trim() ?? "";
    if (rhs === "" || rhs === "|" || rhs === ">") {
      currentKey = key;
      list = [];
      continue;
    }
    currentKey = key;
    list = null;
    out[key] = rhs.replace(/^["'](.*)["']$/, "$1");
  }
  return out;
}

type Props = {
  path: string;
  label?: string;
};

export function MarkdownReader({ path, label }: Props) {
  const q = useStackFile(path);

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 text-text-tertiary p-8">
        <Loader2 className="animate-spin" size={14} strokeWidth={1.5} />
        <span className="text-body">Loading…</span>
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="flex items-center gap-2 text-text-secondary p-8">
        <AlertTriangle size={14} strokeWidth={1.5} />
        <span className="text-body">Failed to load {path}.</span>
      </div>
    );
  }

  const { meta, body } = splitFrontmatter(q.data);
  const metaEntries = Object.entries(meta);

  return (
    <div className="h-full overflow-auto px-8 py-8">
      <div className="max-w-2xl">
        <div className="text-label text-text-tertiary mb-2">{label ?? path}</div>

        {metaEntries.length > 0 && (
          <div className="mb-8 border border-border-subtle rounded-[4px] bg-surface">
            <dl className="divide-y divide-border-subtle">
              {metaEntries.map(([key, val]) => (
                <div key={key} className="grid grid-cols-[140px_1fr] px-4 py-2.5">
                  <dt className="text-label text-text-tertiary font-mono">{key}</dt>
                  <dd className={cn("text-body text-text-primary")}>{renderValue(val)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <article className="prose-deckel">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
            {body}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}

function renderValue(val: unknown): React.ReactNode {
  if (Array.isArray(val)) {
    return (
      <ul className="flex flex-col gap-1">
        {val.map((v, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static snapshot
          <li key={i} className="text-body">
            {String(v)}
          </li>
        ))}
      </ul>
    );
  }
  if (val === null || val === undefined) return <span className="text-text-tertiary">—</span>;
  return String(val);
}

