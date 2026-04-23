import { cn } from "../lib/cn.js";

type Props = {
  title: string;
  description?: React.ReactNode;
  command?: string;
  className?: string;
};

export function EmptyState({ title, description, command, className }: Props) {
  return (
    <div
      className={cn(
        "h-full w-full flex items-center justify-center px-8",
        className,
      )}
    >
      <div className="max-w-md space-y-3 text-center">
        <div className="text-label text-text-tertiary">Deckel</div>
        <h1 className="text-heading-lg font-medium text-text-primary">{title}</h1>
        {description && <p className="text-body text-text-secondary">{description}</p>}
        {command && (
          <pre className="inline-block px-3 py-1.5 rounded-[4px] border border-border bg-surface font-mono text-body text-text-primary">
            {command}
          </pre>
        )}
      </div>
    </div>
  );
}
