export type DcklStatus = "todo" | "in-progress" | "review" | "done";
export type DcklPriority = "must" | "should" | "could";
export type DcklType = "feat" | "bug" | "chore" | "refactor";

export const STATUS_LABELS = [
  "status:todo",
  "status:in-progress",
  "status:review",
  "status:done",
] as const;

export const PRIORITY_LABELS = ["priority:must", "priority:should", "priority:could"] as const;

export const TYPE_LABELS = ["type:feat", "type:bug", "type:chore", "type:refactor"] as const;

export const DCKL_LABELS = [...STATUS_LABELS, ...PRIORITY_LABELS, ...TYPE_LABELS] as const;

export type DcklLabel = (typeof DCKL_LABELS)[number];

export interface RepoCoordinates {
  owner: string;
  repo: string;
}
