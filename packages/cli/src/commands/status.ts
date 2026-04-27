import { Runtime, getStatusSummary } from "@dckl/core";

export interface StatusOptions {
  json: boolean;
}

export async function runStatus(opts: StatusOptions): Promise<void> {
  const runtime = new Runtime();
  const [client, repo, user] = await Promise.all([
    runtime.getClient(),
    runtime.getRepo(),
    runtime.getUser(),
  ]);
  const summary = await getStatusSummary(client, repo, user.login);

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }

  const lines: string[] = [];
  lines.push(`# dckl status — ${repo.owner}/${repo.repo}`, "");
  lines.push(`User: ${summary.user.login}`, "");

  if (summary.activeMilestone) {
    lines.push(`## Active sprint: ${summary.activeMilestone.title}`);
    if (summary.activeMilestone.description) {
      lines.push("", summary.activeMilestone.description);
    }
  } else {
    lines.push("## Active sprint: (none)");
  }
  lines.push("");

  if (summary.activeIssue) {
    const labels = summary.activeIssue.labels.join(", ");
    lines.push(
      `## You are working on #${summary.activeIssue.number}: ${summary.activeIssue.title}`,
      labels ? `Labels: ${labels}` : "",
    );
  } else {
    lines.push("## You are not currently claiming a task.");
  }
  lines.push("");

  lines.push("## Counts");
  lines.push(`- todo:        ${summary.counts.todo}`);
  lines.push(`- in-progress: ${summary.counts.inProgress}`);
  lines.push(`- review:      ${summary.counts.review}`);
  lines.push(`- milestones:  ${summary.counts.openMilestones} open`);

  process.stdout.write(`${lines.filter((l) => l !== undefined).join("\n")}\n`);
}
