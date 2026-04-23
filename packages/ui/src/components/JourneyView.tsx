import type { JourneyStep } from "@dckl/server/schema";
import { AlertTriangle, ArrowRight, CircleCheck, CircleDashed, XCircle } from "lucide-react";
import { cn } from "../lib/cn.js";
import { useJourney } from "../lib/queries.js";

type Props = {
  journeyId: string;
};

export function JourneyView({ journeyId }: Props) {
  const q = useJourney(journeyId);

  return (
    <div className="h-full flex flex-col">
      <div className="h-[64px] px-8 flex items-center gap-3 border-b border-border-subtle">
        <div className="text-label text-text-tertiary">journey</div>
        <div className="text-text-muted">/</div>
        <div className="text-body text-text-primary font-medium truncate">
          {q.data?.meta.name ?? journeyId}
        </div>
        {q.data && (
          <div className="ml-auto flex items-center gap-3">
            <StatusCounter steps={q.data.meta.steps} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-8 py-8">
        <div className="max-w-2xl space-y-8">
          {q.isLoading && <div className="text-body text-text-tertiary">Loading…</div>}

          {q.isError && (
            <div className="flex items-center gap-2 text-text-secondary">
              <AlertTriangle size={14} strokeWidth={1.5} />
              <span className="text-body">Failed to load journey.</span>
            </div>
          )}

          {q.data && (
            <>
              {q.data.meta.description && (
                <p className="text-body text-text-secondary leading-relaxed">
                  {q.data.meta.description}
                </p>
              )}

              {q.data.meta.steps.length === 0 ? (
                <div className="text-body text-text-tertiary">
                  No steps yet. Edit <code className="font-mono text-label">.dckl/journeys/{journeyId}.md</code> and add a <code className="font-mono text-label">steps:</code> array.
                </div>
              ) : (
                <ol className="space-y-0">
                  {q.data.meta.steps.map((step, i) => (
                    <StepRow
                      key={step.id}
                      step={step}
                      index={i}
                      isLast={i === (q.data?.meta.steps.length ?? 0) - 1}
                    />
                  ))}
                </ol>
              )}

              {q.data.body.trim().length > 0 && (
                <div className="pt-6 border-t border-border-subtle">
                  <div className="text-label text-text-tertiary mb-3">Notes</div>
                  <pre className="text-body text-text-secondary whitespace-pre-wrap font-sans leading-relaxed">
                    {q.data.body}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StepRow({
  step,
  index,
  isLast,
}: {
  step: JourneyStep;
  index: number;
  isLast: boolean;
}) {
  return (
    <li className="flex gap-4 relative">
      <div className="flex flex-col items-center pt-1">
        <StepIcon status={step.status} />
        {!isLast && <div className="w-px flex-1 bg-border-subtle mt-1 mb-1 min-h-[24px]" />}
      </div>
      <div className="flex-1 pb-5">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-label text-text-tertiary tabular-nums">{index + 1}.</span>
          <span className="text-body text-text-primary">{step.label}</span>
          <StatusBadge status={step.status} />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <ArrowRight size={11} strokeWidth={1.5} className="text-text-muted" />
          <code className="font-mono text-label text-text-secondary">{step.route}</code>
        </div>
        {step.related_tasks && step.related_tasks.length > 0 && (
          <div className="flex items-center gap-2 mt-1.5 text-label text-text-tertiary">
            <span>Tasks:</span>
            {step.related_tasks.map((id) => (
              <code
                key={id}
                className="font-mono text-label text-text-secondary px-1 py-0.5 rounded-[3px] bg-surface-hover"
              >
                {id}
              </code>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

function StepIcon({ status }: { status: JourneyStep["status"] }) {
  switch (status) {
    case "done":
      return <CircleCheck size={15} strokeWidth={1.5} className="text-text-primary" />;
    case "broken":
      return <XCircle size={15} strokeWidth={1.5} className="text-accent" />;
    case "todo":
      return <CircleDashed size={15} strokeWidth={1.5} className="text-text-tertiary" />;
  }
}

function StatusBadge({ status }: { status: JourneyStep["status"] }) {
  const label = status === "done" ? "Done" : status === "broken" ? "Broken" : "Todo";
  const styles =
    status === "broken"
      ? "border-accent/60 text-accent"
      : status === "done"
        ? "border-border text-text-tertiary opacity-70"
        : "border-border text-text-tertiary";
  return (
    <span
      className={cn(
        "inline-flex items-center h-[18px] px-2 rounded-[4px] border text-label",
        styles,
      )}
    >
      {label}
    </span>
  );
}

function StatusCounter({ steps }: { steps: JourneyStep[] }) {
  const done = steps.filter((s) => s.status === "done").length;
  const broken = steps.filter((s) => s.status === "broken").length;
  return (
    <span className="text-label text-text-tertiary tabular-nums">
      {done}/{steps.length} done
      {broken > 0 ? ` · ${broken} broken` : ""}
    </span>
  );
}
