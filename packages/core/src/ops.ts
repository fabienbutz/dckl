import type { Octokit } from "@octokit/rest";
import {
  type AcceptanceItem,
  type ParsedBody,
  parseIssueBody,
} from "./body-parser.js";
import { buildIssueBody, toggleCheckbox } from "./body-builder.js";
import { ConcurrentModificationError } from "./errors.js";
import { stripTime } from "./time-strip.js";
import {
  DCKL_LABELS,
  type DcklPriority,
  type DcklStatus,
  type DcklType,
  type RepoCoordinates,
} from "./types.js";

export interface CurrentUser {
  login: string;
  id: number;
}

export interface IssueRef {
  number: number;
  title: string;
  state: "open" | "closed";
  labels: string[];
  assignees: string[];
  milestone: { number: number; title: string } | null;
}

export interface IssueDetail extends IssueRef {
  body: string;
}

export interface Milestone {
  number: number;
  title: string;
  description: string;
  state: "open" | "closed";
}

export type ClaimReason = "claimed" | "already-mine" | "blocked" | "not-found";

export interface ClaimResult {
  reason: ClaimReason;
  number: number;
  by?: string;
}

export interface StatusCounts {
  todo: number;
  inProgress: number;
  review: number;
  openMilestones: number;
}

export interface StatusSummary {
  user: { login: string };
  repo: RepoCoordinates;
  activeIssue: IssueRef | null;
  activeMilestone: Milestone | null;
  counts: StatusCounts;
}

interface RawLabel {
  name?: string | null;
}

interface RawAssignee {
  login?: string | null;
}

interface RawMilestone {
  number: number;
  title: string;
  description?: string | null;
  state: "open" | "closed";
}

interface RawIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  body?: string | null;
  labels?: ReadonlyArray<string | RawLabel>;
  assignees?: ReadonlyArray<RawAssignee> | null;
  milestone?: RawMilestone | null;
}

function normalizeLabels(labels: ReadonlyArray<string | RawLabel> | undefined): string[] {
  if (!labels) return [];
  const out: string[] = [];
  for (const l of labels) {
    if (typeof l === "string") {
      out.push(l);
    } else if (l && typeof l.name === "string") {
      out.push(l.name);
    }
  }
  return out;
}

function normalizeAssignees(assignees: ReadonlyArray<RawAssignee> | null | undefined): string[] {
  if (!assignees) return [];
  const out: string[] = [];
  for (const a of assignees) {
    if (a && typeof a.login === "string") out.push(a.login);
  }
  return out;
}

function normalizeIssue(raw: RawIssue): IssueDetail {
  return {
    number: raw.number,
    title: raw.title,
    state: raw.state,
    body: raw.body ?? "",
    labels: normalizeLabels(raw.labels),
    assignees: normalizeAssignees(raw.assignees ?? null),
    milestone: raw.milestone
      ? { number: raw.milestone.number, title: raw.milestone.title }
      : null,
  };
}

function normalizeMilestone(raw: RawMilestone): Milestone {
  return {
    number: raw.number,
    title: raw.title,
    description: raw.description ?? "",
    state: raw.state,
  };
}

export async function getCurrentUser(client: Octokit): Promise<CurrentUser> {
  const { data } = await client.rest.users.getAuthenticated();
  const stripped = stripTime(data) as { login: string; id: number };
  return { login: stripped.login, id: stripped.id };
}

export async function getIssue(
  client: Octokit,
  repo: RepoCoordinates,
  num: number,
): Promise<IssueDetail | null> {
  try {
    const { data } = await client.rest.issues.get({
      owner: repo.owner,
      repo: repo.repo,
      issue_number: num,
    });
    return normalizeIssue(stripTime(data) as RawIssue);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 404) {
      return null;
    }
    throw err;
  }
}

export async function getActiveIssue(
  client: Octokit,
  repo: RepoCoordinates,
  login: string,
): Promise<IssueDetail | null> {
  const { data } = await client.rest.issues.listForRepo({
    owner: repo.owner,
    repo: repo.repo,
    state: "open",
    labels: "status:in-progress",
    assignee: login,
    per_page: 5,
  });
  const stripped = stripTime(data) as RawIssue[];
  const first = stripped[0];
  return first ? normalizeIssue(first) : null;
}

export async function listOpenMilestones(
  client: Octokit,
  repo: RepoCoordinates,
): Promise<Milestone[]> {
  const { data } = await client.rest.issues.listMilestones({
    owner: repo.owner,
    repo: repo.repo,
    state: "open",
    per_page: 100,
  });
  return (stripTime(data) as RawMilestone[]).map(normalizeMilestone);
}

async function countByLabel(
  client: Octokit,
  repo: RepoCoordinates,
  label: string,
): Promise<number> {
  const q = `repo:${repo.owner}/${repo.repo} is:issue is:open label:"${label}"`;
  const { data } = await client.rest.search.issuesAndPullRequests({
    q,
    per_page: 1,
    advanced_search: "true",
  });
  return data.total_count;
}

export async function getStatusSummary(
  client: Octokit,
  repo: RepoCoordinates,
  login: string,
): Promise<StatusSummary> {
  const [active, milestones, todo, inProgress, review] = await Promise.all([
    getActiveIssue(client, repo, login),
    listOpenMilestones(client, repo),
    countByLabel(client, repo, "status:todo"),
    countByLabel(client, repo, "status:in-progress"),
    countByLabel(client, repo, "status:review"),
  ]);

  let activeMilestone: Milestone | null = null;
  if (active?.milestone) {
    activeMilestone = milestones.find((m) => m.number === active.milestone?.number) ?? null;
  }
  if (!activeMilestone) {
    activeMilestone = milestones[0] ?? null;
  }

  return {
    user: { login },
    repo,
    activeIssue: active,
    activeMilestone,
    counts: { todo, inProgress, review, openMilestones: milestones.length },
  };
}

export async function claimIssue(
  client: Octokit,
  repo: RepoCoordinates,
  num: number,
  login: string,
): Promise<ClaimResult> {
  const issue = await getIssue(client, repo, num);
  if (!issue) return { reason: "not-found", number: num };

  if (issue.labels.includes("status:in-progress")) {
    if (issue.assignees.includes(login)) {
      return { reason: "already-mine", number: num, by: login };
    }
    const by = issue.assignees[0] ?? "unknown";
    return { reason: "blocked", number: num, by };
  }

  await Promise.all([
    client.rest.issues.addLabels({
      owner: repo.owner,
      repo: repo.repo,
      issue_number: num,
      labels: ["status:in-progress"],
    }),
    client.rest.issues.addAssignees({
      owner: repo.owner,
      repo: repo.repo,
      issue_number: num,
      assignees: [login],
    }),
  ]);

  if (issue.labels.includes("status:todo")) {
    try {
      await client.rest.issues.removeLabel({
        owner: repo.owner,
        repo: repo.repo,
        issue_number: num,
        name: "status:todo",
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 404) {
        // label was removed concurrently — ignore
      } else {
        throw err;
      }
    }
  }

  return { reason: "claimed", number: num, by: login };
}

// =====================================================================
// Comments
// =====================================================================

export interface IssueComment {
  id: number;
  body: string;
  user: string;
  isCorrection: boolean;
  isResolved: boolean;
}

interface RawComment {
  id: number;
  body?: string | null;
  user?: { login?: string | null } | null;
}

const CORRECTION_RE = /^\s*\[correction\]/i;
const RESOLVED_RE = /^\s*\[resolved\]/i;

function normalizeComment(raw: RawComment): IssueComment {
  const body = raw.body ?? "";
  return {
    id: raw.id,
    body,
    user: raw.user?.login ?? "unknown",
    isCorrection: CORRECTION_RE.test(body),
    isResolved: RESOLVED_RE.test(body),
  };
}

export async function listIssueComments(
  client: Octokit,
  repo: RepoCoordinates,
  num: number,
): Promise<IssueComment[]> {
  const { data } = await client.rest.issues.listComments({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: num,
    per_page: 100,
  });
  return (stripTime(data) as RawComment[]).map(normalizeComment);
}

// =====================================================================
// Session Resume
// =====================================================================

export interface SessionResume {
  activeIssue: IssueDetail | null;
  parsedBody: ParsedBody | null;
  openCorrections: IssueComment[];
  unfinishedCriteria: AcceptanceItem[];
}

export async function getSessionResume(
  client: Octokit,
  repo: RepoCoordinates,
  login: string,
): Promise<SessionResume> {
  const issue = await getActiveIssue(client, repo, login);
  if (!issue) {
    return { activeIssue: null, parsedBody: null, openCorrections: [], unfinishedCriteria: [] };
  }
  const parsedBody = parseIssueBody(issue.body);
  const comments = await listIssueComments(client, repo, issue.number);
  const openCorrections = comments.filter((c) => c.isCorrection && !c.isResolved);
  const unfinishedCriteria = parsedBody.acceptanceCriteria.filter((c) => !c.checked);
  return { activeIssue: issue, parsedBody, openCorrections, unfinishedCriteria };
}

// =====================================================================
// Task Export
// =====================================================================

export interface DependencyRef {
  number: number;
  title: string;
  state: "open" | "closed";
}

export interface TaskExport {
  issue: IssueDetail;
  parsedBody: ParsedBody;
  comments: IssueComment[];
  dependencies: DependencyRef[];
}

export async function getTaskExport(
  client: Octokit,
  repo: RepoCoordinates,
  num: number,
): Promise<TaskExport | null> {
  const issue = await getIssue(client, repo, num);
  if (!issue) return null;
  const parsedBody = parseIssueBody(issue.body);
  const comments = await listIssueComments(client, repo, issue.number);
  const depResults = await Promise.all(
    parsedBody.dependsOn.map(async (depNum) => {
      const dep = await getIssue(client, repo, depNum);
      return dep ? { number: dep.number, title: dep.title, state: dep.state } : null;
    }),
  );
  const dependencies = depResults.filter((d): d is DependencyRef => d !== null);
  return { issue, parsedBody, comments, dependencies };
}

// =====================================================================
// Sprint View
// =====================================================================

export interface SprintView {
  milestone: Milestone;
  issues: IssueRef[];
}

function toIssueRef(detail: IssueDetail): IssueRef {
  return {
    number: detail.number,
    title: detail.title,
    state: detail.state,
    labels: detail.labels,
    assignees: detail.assignees,
    milestone: detail.milestone,
  };
}

export async function getSprintView(
  client: Octokit,
  repo: RepoCoordinates,
  milestoneNumber: number,
): Promise<SprintView | null> {
  let milestone: Milestone;
  try {
    const { data } = await client.rest.issues.getMilestone({
      owner: repo.owner,
      repo: repo.repo,
      milestone_number: milestoneNumber,
    });
    milestone = normalizeMilestone(stripTime(data) as RawMilestone);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 404) {
      return null;
    }
    throw err;
  }
  const { data: issuesData } = await client.rest.issues.listForRepo({
    owner: repo.owner,
    repo: repo.repo,
    milestone: String(milestoneNumber),
    state: "all",
    per_page: 100,
  });
  const issues = (stripTime(issuesData) as RawIssue[])
    .map((raw) => toIssueRef(normalizeIssue(raw)));
  return { milestone, issues };
}

// =====================================================================
// Search
// =====================================================================

export interface SearchInput {
  status?: DcklStatus;
  priority?: DcklPriority;
  type?: DcklType;
  file?: string;
  text?: string;
  milestone?: number;
  state?: "open" | "closed" | "all";
}

export async function searchIssues(
  client: Octokit,
  repo: RepoCoordinates,
  input: SearchInput,
): Promise<IssueRef[]> {
  const parts = [`repo:${repo.owner}/${repo.repo}`, "is:issue"];
  if (input.state === "closed") parts.push("is:closed");
  else if (input.state !== "all") parts.push("is:open");
  if (input.status) parts.push(`label:"status:${input.status}"`);
  if (input.priority) parts.push(`label:"priority:${input.priority}"`);
  if (input.type) parts.push(`label:"type:${input.type}"`);
  if (input.milestone !== undefined) parts.push(`milestone:${input.milestone}`);
  if (input.file) parts.push(`"${input.file}" in:body`);
  if (input.text) parts.push(input.text);
  const q = parts.join(" ");
  const { data } = await client.rest.search.issuesAndPullRequests({
    q,
    per_page: 50,
    advanced_search: "true",
  });
  const items = (stripTime(data.items) as RawIssue[]).map((raw) =>
    toIssueRef(normalizeIssue(raw)),
  );
  return items;
}

// =====================================================================
// Next Up
// =====================================================================

export async function getNextUp(
  client: Octokit,
  repo: RepoCoordinates,
  login: string,
): Promise<IssueRef | null> {
  const summary = await getStatusSummary(client, repo, login);
  if (!summary.activeMilestone) return null;
  const todos = await searchIssues(client, repo, {
    status: "todo",
    milestone: summary.activeMilestone.number,
  });
  for (const todo of todos) {
    const detail = await getIssue(client, repo, todo.number);
    if (!detail) continue;
    const parsed = parseIssueBody(detail.body);
    if (parsed.dependsOn.length === 0) return todo;
    const blockers = await Promise.all(
      parsed.dependsOn.map(async (depNum) => {
        const dep = await getIssue(client, repo, depNum);
        return dep && dep.state === "open" ? dep.number : null;
      }),
    );
    if (blockers.every((b) => b === null)) return todo;
  }
  return null;
}

// =====================================================================
// Release / Close
// =====================================================================

function is404(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      "status" in err &&
      (err as { status: number }).status === 404,
  );
}

export type ReleaseReason = "released" | "not-claimed" | "not-found";

export async function releaseIssue(
  client: Octokit,
  repo: RepoCoordinates,
  num: number,
  login: string,
): Promise<{ reason: ReleaseReason; number: number }> {
  const issue = await getIssue(client, repo, num);
  if (!issue) return { reason: "not-found", number: num };
  if (!issue.labels.includes("status:in-progress")) {
    return { reason: "not-claimed", number: num };
  }
  try {
    await client.rest.issues.removeLabel({
      owner: repo.owner,
      repo: repo.repo,
      issue_number: num,
      name: "status:in-progress",
    });
  } catch (err: unknown) {
    if (!is404(err)) throw err;
  }
  if (issue.assignees.includes(login)) {
    try {
      await client.rest.issues.removeAssignees({
        owner: repo.owner,
        repo: repo.repo,
        issue_number: num,
        assignees: [login],
      });
    } catch (err: unknown) {
      if (!is404(err)) throw err;
    }
  }
  return { reason: "released", number: num };
}

export type CloseReason = "closed" | "not-found";

export async function closeIssue(
  client: Octokit,
  repo: RepoCoordinates,
  num: number,
  summary?: string,
): Promise<{ reason: CloseReason; number: number; commentId?: number }> {
  const issue = await getIssue(client, repo, num);
  if (!issue) return { reason: "not-found", number: num };
  let commentId: number | undefined;
  const summaryText = summary?.trim();
  if (summaryText && summaryText.length > 0) {
    const { data } = await client.rest.issues.createComment({
      owner: repo.owner,
      repo: repo.repo,
      issue_number: num,
      body: summaryText,
    });
    commentId = data.id;
  }
  try {
    await client.rest.issues.addLabels({
      owner: repo.owner,
      repo: repo.repo,
      issue_number: num,
      labels: ["status:done"],
    });
  } catch {
    // adding the done label is best-effort
  }
  if (issue.labels.includes("status:in-progress")) {
    try {
      await client.rest.issues.removeLabel({
        owner: repo.owner,
        repo: repo.repo,
        issue_number: num,
        name: "status:in-progress",
      });
    } catch (err: unknown) {
      if (!is404(err)) throw err;
    }
  }
  await client.rest.issues.update({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: num,
    state: "closed",
  });
  return commentId !== undefined
    ? { reason: "closed", number: num, commentId }
    : { reason: "closed", number: num };
}

// =====================================================================
// Toggle Checkbox
// =====================================================================

export interface ToggleCheckResult {
  toggled: boolean;
  newState: boolean | null;
  matchedText: string | null;
}

export async function toggleCheck(
  client: Octokit,
  repo: RepoCoordinates,
  num: number,
  pattern: string,
): Promise<ToggleCheckResult> {
  const issue = await getIssue(client, repo, num);
  if (!issue) return { toggled: false, newState: null, matchedText: null };
  const result = toggleCheckbox(issue.body, pattern);
  if (!result.toggled) return { toggled: false, newState: null, matchedText: null };
  // Verify the body hasn't changed externally before writing
  const verify = await getIssue(client, repo, num);
  if (!verify || verify.body !== issue.body) {
    throw new ConcurrentModificationError(
      `Issue #${num} body was modified concurrently.`,
      "Re-fetch the task and retry the toggle.",
    );
  }
  await client.rest.issues.update({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: num,
    body: result.body,
  });
  return {
    toggled: true,
    newState: result.newState,
    matchedText: result.matchedText,
  };
}

// =====================================================================
// Corrections
// =====================================================================

export async function addCorrection(
  client: Octokit,
  repo: RepoCoordinates,
  num: number,
  text: string,
): Promise<{ commentId: number }> {
  const body = `[correction] ${text.trim()}`;
  const { data } = await client.rest.issues.createComment({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: num,
    body,
  });
  return { commentId: data.id };
}

export type ResolveReason = "resolved" | "not-correction" | "already-resolved" | "not-found";

export async function resolveCorrection(
  client: Octokit,
  repo: RepoCoordinates,
  commentId: number,
): Promise<{ reason: ResolveReason; commentId: number }> {
  let body: string;
  try {
    const { data } = await client.rest.issues.getComment({
      owner: repo.owner,
      repo: repo.repo,
      comment_id: commentId,
    });
    body = data.body ?? "";
  } catch (err: unknown) {
    if (is404(err)) return { reason: "not-found", commentId };
    throw err;
  }
  if (!CORRECTION_RE.test(body)) return { reason: "not-correction", commentId };
  if (RESOLVED_RE.test(body)) return { reason: "already-resolved", commentId };
  await client.rest.issues.updateComment({
    owner: repo.owner,
    repo: repo.repo,
    comment_id: commentId,
    body: `[resolved] ${body}`,
  });
  return { reason: "resolved", commentId };
}

// =====================================================================
// Sprint create / close
// =====================================================================

export async function createSprint(
  client: Octokit,
  repo: RepoCoordinates,
  name: string,
  description: string,
): Promise<{ number: number; title: string }> {
  const { data } = await client.rest.issues.createMilestone({
    owner: repo.owner,
    repo: repo.repo,
    title: name,
    description,
  });
  return { number: data.number, title: data.title };
}

export type SprintCloseReason = "closed" | "must-issues-open" | "not-found";

export async function closeSprint(
  client: Octokit,
  repo: RepoCoordinates,
  milestoneNumber: number,
): Promise<{
  reason: SprintCloseReason;
  milestoneNumber: number;
  blockingIssues?: number[];
}> {
  const blocking = await searchIssues(client, repo, {
    milestone: milestoneNumber,
    priority: "must",
    state: "open",
  });
  if (blocking.length > 0) {
    return {
      reason: "must-issues-open",
      milestoneNumber,
      blockingIssues: blocking.map((i) => i.number),
    };
  }
  try {
    await client.rest.issues.updateMilestone({
      owner: repo.owner,
      repo: repo.repo,
      milestone_number: milestoneNumber,
      state: "closed",
    });
    return { reason: "closed", milestoneNumber };
  } catch (err: unknown) {
    if (is404(err)) return { reason: "not-found", milestoneNumber };
    throw err;
  }
}

// =====================================================================
// Task create
// =====================================================================

export interface CreateTaskInput {
  title: string;
  type: DcklType;
  priority: DcklPriority;
  milestone?: number;
  worumEsGeht: string;
  warumJetzt: string;
  acceptanceCriteria: string[];
  contextFiles?: string[];
  dependsOn?: number[];
  outOfScope?: string;
}

export async function createTask(
  client: Octokit,
  repo: RepoCoordinates,
  input: CreateTaskInput,
): Promise<{ number: number; url: string }> {
  const body = buildIssueBody({
    worumEsGeht: input.worumEsGeht,
    warumJetzt: input.warumJetzt,
    acceptanceCriteria: input.acceptanceCriteria.map((text) => ({ text, checked: false })),
    context: input.contextFiles,
    dependsOn: input.dependsOn,
    outOfScope: input.outOfScope,
  });
  const labels = [
    "status:todo",
    `priority:${input.priority}`,
    `type:${input.type}`,
  ];
  const params: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    labels: string[];
    milestone?: number;
  } = {
    owner: repo.owner,
    repo: repo.repo,
    title: input.title,
    body,
    labels,
  };
  if (input.milestone !== undefined) params.milestone = input.milestone;
  const { data } = await client.rest.issues.create(params);
  return { number: data.number, url: data.html_url };
}

// =====================================================================
// Doctor
// =====================================================================

export interface DoctorWarning {
  code: string;
  message: string;
  issueNumber?: number;
  milestoneNumber?: number;
}

export interface DoctorReport {
  warnings: DoctorWarning[];
  issuesChecked: number;
  milestonesChecked: number;
}

const KNOWN_LABELS = new Set<string>(DCKL_LABELS);

interface RawMilestoneWithDate extends RawMilestone {
  due_on?: string | null;
}

interface RawLabelDef {
  name: string;
}

export async function runDoctor(
  client: Octokit,
  repo: RepoCoordinates,
): Promise<DoctorReport> {
  const warnings: DoctorWarning[] = [];

  const allOpen = await searchIssues(client, repo, {});

  for (const issue of allOpen) {
    const hasInProgress = issue.labels.includes("status:in-progress");
    const hasAnyStatus = issue.labels.some((l) => l.startsWith("status:"));
    if (hasInProgress && issue.assignees.length === 0) {
      warnings.push({
        code: "claim_no_assignee",
        message: `Issue #${issue.number} has status:in-progress but no assignee.`,
        issueNumber: issue.number,
      });
    }
    if (issue.assignees.length > 0 && !hasAnyStatus) {
      warnings.push({
        code: "assignee_no_status",
        message: `Issue #${issue.number} has assignees but no status:* label.`,
        issueNumber: issue.number,
      });
    }
    if (!issue.milestone) {
      warnings.push({
        code: "no_milestone",
        message: `Issue #${issue.number} has no milestone (backlog).`,
        issueNumber: issue.number,
      });
    }
  }

  // Body-schema + closed-deps checks (require body fetch)
  for (const issue of allOpen) {
    const detail = await getIssue(client, repo, issue.number);
    if (!detail) continue;
    const parsed = parseIssueBody(detail.body);
    if (parsed.warnings.length > 0) {
      warnings.push({
        code: "body_schema_invalid",
        message: `Issue #${issue.number}: ${parsed.warnings.join("; ")}`,
        issueNumber: issue.number,
      });
    }
    if (parsed.dependsOn.length > 0) {
      const depStates = await Promise.all(
        parsed.dependsOn.map(async (depNum) => {
          const dep = await getIssue(client, repo, depNum);
          return dep?.state ?? "missing";
        }),
      );
      const allClosed = depStates.length > 0 && depStates.every((s) => s === "closed");
      if (allClosed && issue.labels.includes("status:todo")) {
        warnings.push({
          code: "deps_clear_but_todo",
          message: `Issue #${issue.number}: all dependencies closed but still status:todo (consider claiming or reviewing).`,
          issueNumber: issue.number,
        });
      }
    }
  }

  // Milestones with due_on (raw fetch — bypass time-strip)
  const { data: rawMilestones } = await client.rest.issues.listMilestones({
    owner: repo.owner,
    repo: repo.repo,
    state: "open",
    per_page: 100,
  });
  for (const m of rawMilestones as RawMilestoneWithDate[]) {
    if (m.due_on) {
      warnings.push({
        code: "milestone_has_date",
        message: `Milestone "${m.title}" has a due date set — dckl ignores it. Consider clearing it for clarity.`,
        milestoneNumber: m.number,
      });
    }
  }

  // Non-dckl labels (informative)
  const { data: labelDefs } = await client.rest.issues.listLabelsForRepo({
    owner: repo.owner,
    repo: repo.repo,
    per_page: 100,
  });
  for (const def of labelDefs as RawLabelDef[]) {
    const name = def.name;
    if (!KNOWN_LABELS.has(name) && (name.startsWith("status:") || name.startsWith("priority:") || name.startsWith("type:"))) {
      warnings.push({
        code: "non_dckl_label",
        message: `Label "${name}" looks dckl-shaped but is not in the dckl convention.`,
      });
    }
  }

  return {
    warnings,
    issuesChecked: allOpen.length,
    milestonesChecked: rawMilestones.length,
  };
}
