import type { TaskClaim } from "@deckel/server/schema";
import { motion } from "framer-motion";
import { cn } from "../lib/cn.js";

export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";

export const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
  // Blocked is a dead-end in the cycle — users break out via keyboard / menu.
  blocked: "todo",
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "Active",
  done: "Done",
  blocked: "Blocked",
};

const CLAIM_TTL_MS = 5 * 60 * 1000;

/**
 * Classify the live-AI state of a task:
 *   - "none"  : not claimed at all
 *   - "fresh" : claimed, heartbeat within 5 min → AI is live right now
 *   - "stale" : claimed, heartbeat older than 5 min → AI walked away
 */
export type ClaimState = "none" | "fresh" | "stale";

export function classifyClaim(claim: TaskClaim | null | undefined, now: number = Date.now()): ClaimState {
  if (!claim) return "none";
  const hb = Date.parse(claim.heartbeat);
  if (Number.isNaN(hb)) return "stale";
  return now - hb < CLAIM_TTL_MS ? "fresh" : "stale";
}

type Props = {
  status: TaskStatus;
  claim?: TaskClaim | null;
  size?: number;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
};

/**
 * Monochrome status glyph. State is encoded in *shape*. The only use of
 * colour is the amber accent on `in_progress` tasks that have a fresh
 * live-claim from an AI agent — stale claims fade to half-opacity amber,
 * and unclaimed in_progress stays off-white.
 */
export function StatusIcon({ status, claim, size = 14, onClick, className }: Props) {
  const r = size / 2;
  const interactive = Boolean(onClick);
  const claimState = classifyClaim(claim);
  const liveAi = status === "in_progress" && claimState === "fresh";
  const staleAi = status === "in_progress" && claimState === "stale";

  const inner = (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <title>{STATUS_LABEL[status]}</title>
      {status === "todo" && (
        <circle
          cx={r}
          cy={r}
          r={r - 1}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          opacity={0.6}
        />
      )}
      {status === "in_progress" && (
        <>
          <circle
            cx={r}
            cy={r}
            r={r - 1}
            fill="none"
            className={cn(liveAi ? "stroke-accent" : "stroke-current")}
            strokeWidth={1.2}
            opacity={staleAi ? 0.5 : 1}
          />
          <path
            d={`M ${r} 1 A ${r - 1} ${r - 1} 0 0 1 ${r} ${size - 1} Z`}
            className={cn(liveAi || staleAi ? "fill-accent" : "fill-current")}
            opacity={staleAi ? 0.5 : 1}
          />
        </>
      )}
      {status === "done" && <circle cx={r} cy={r} r={r - 1} fill="currentColor" />}
      {status === "blocked" && (
        <>
          <circle
            cx={r}
            cy={r}
            r={r - 1}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.2}
            strokeDasharray="2 2"
          />
          <line x1={3} y1={3} x2={size - 3} y2={size - 3} stroke="currentColor" strokeWidth={1.2} />
          <line x1={size - 3} y1={3} x2={3} y2={size - 3} stroke="currentColor" strokeWidth={1.2} />
        </>
      )}
    </svg>
  );

  return (
    <button
      type="button"
      onClick={(e) => {
        if (!onClick) return;
        e.stopPropagation();
        onClick(e);
      }}
      disabled={!interactive}
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        interactive && "hover:bg-surface-hover transition-colors",
        interactive ? "cursor-pointer" : "cursor-default",
        className,
      )}
      style={{ width: size + 6, height: size + 6 }}
      aria-label={`Status: ${STATUS_LABEL[status]}${liveAi ? " · live" : ""}`}
      title={liveAi ? `Live — ${claim?.by} working` : STATUS_LABEL[status]}
    >
      {liveAi ? (
        <motion.span
          animate={{ scale: [1, 1.12, 1], opacity: [1, 0.85, 1] }}
          transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="inline-flex"
        >
          {inner}
        </motion.span>
      ) : (
        inner
      )}
    </button>
  );
}
