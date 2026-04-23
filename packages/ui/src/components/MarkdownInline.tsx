import { Fragment } from "react";

type Props = {
  children: string;
  codeClassName?: string;
};

const INLINE_CODE_RE = /`([^`]+)`/g;

const DEFAULT_CODE_CLASS =
  "font-mono text-[0.92em] text-text-secondary px-[6px] py-[1px] rounded-[4px] border border-border bg-white/[0.14]";

/**
 * Inline-only Markdown renderer: converts backtick-delimited tokens to
 * <code> spans and leaves everything else as plain text. Used in
 * contexts like check-box labels where full ReactMarkdown would wrap
 * output in block-level <p>, breaking the flex row.
 *
 * `codeClassName` overrides the default styling — useful in tight spaces
 * like sidebar rows where padding/border would break the line height.
 */
export function MarkdownInline({ children, codeClassName }: Props) {
  if (!children.includes("`")) return <>{children}</>;

  const cls = codeClassName ?? DEFAULT_CODE_CLASS;
  const parts: React.ReactNode[] = [];
  INLINE_CODE_RE.lastIndex = 0;
  let last = 0;
  let m: RegExpExecArray | null = INLINE_CODE_RE.exec(children);
  while (m !== null) {
    if (m.index > last) {
      parts.push(
        <Fragment key={`t-${last}`}>{children.slice(last, m.index)}</Fragment>,
      );
    }
    parts.push(
      <code key={`c-${m.index}`} className={cls}>
        {m[1]}
      </code>,
    );
    last = INLINE_CODE_RE.lastIndex;
    m = INLINE_CODE_RE.exec(children);
  }
  if (last < children.length) {
    parts.push(<Fragment key={`t-${last}`}>{children.slice(last)}</Fragment>);
  }
  return <>{parts}</>;
}
