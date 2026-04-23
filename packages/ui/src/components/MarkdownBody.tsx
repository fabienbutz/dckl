import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Deckel-styled Markdown components. Shared between MarkdownReader
 * (full file view) and TaskDrawer (task body section) so both surfaces
 * stay visually consistent.
 */
export const MD_COMPONENTS = {
  h1: (p: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-heading-lg font-medium text-text-primary mt-6 mb-3" {...p} />
  ),
  h2: (p: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-[18px] leading-[28px] font-medium text-text-primary mt-8 mb-3" {...p} />
  ),
  h3: (p: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-[16px] leading-[26px] font-medium text-text-primary mt-6 mb-2" {...p} />
  ),
  p: (p: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-[15px] leading-[26px] text-text-secondary my-4" {...p} />
  ),
  ul: (p: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="text-[15px] leading-[26px] text-text-secondary pl-5 list-disc space-y-2 my-4" {...p} />
  ),
  ol: (p: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="text-[15px] leading-[26px] text-text-secondary pl-5 list-decimal space-y-2 my-4" {...p} />
  ),
  li: (p: React.HTMLAttributes<HTMLLIElement>) => <li className="leading-[26px]" {...p} />,
  code: (p: React.HTMLAttributes<HTMLElement>) => (
    <code
      className="font-mono text-[0.92em] text-text-secondary px-[6px] py-[1px] rounded-[4px] border border-border bg-white/[0.14]"
      {...p}
    />
  ),
  pre: (p: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      className="font-mono text-[14px] leading-[22px] text-text-secondary px-4 py-3 rounded-[6px] border border-border bg-white/[0.08] overflow-x-auto my-5"
      {...p}
    />
  ),
  blockquote: (p: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="border-l-2 border-border-strong pl-4 my-3 text-text-tertiary"
      {...p}
    />
  ),
  a: (p: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className="text-accent underline underline-offset-2 hover:no-underline" {...p} />
  ),
  table: (p: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto my-4">
      <table className="text-body text-text-secondary border-collapse" {...p} />
    </div>
  ),
  th: (p: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className="text-left text-label text-text-tertiary font-medium px-3 py-2 border-b border-border-subtle"
      {...p}
    />
  ),
  td: (p: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-3 py-2 border-b border-border-subtle" {...p} />
  ),
  hr: () => <hr className="border-border-subtle my-6" />,
};

type Props = {
  children: string;
  className?: string;
};

/**
 * Renders a Markdown body with Deckel's shared MD_COMPONENTS and GFM
 * enabled. Returns null for empty/whitespace-only input so callers do
 * not need to guard against layout artefacts.
 */
export function MarkdownBody({ children, className }: Props) {
  if (!children.trim()) return null;
  return (
    <article className={className ?? "prose-deckel"}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
        {children}
      </ReactMarkdown>
    </article>
  );
}
