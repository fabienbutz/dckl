import { Runtime, runDoctor as runCoreDoctor } from "@dckl/core";

export interface DoctorOptions {
  json: boolean;
}

export async function runDoctor(opts: DoctorOptions): Promise<void> {
  const runtime = new Runtime();
  const [client, repo] = await Promise.all([runtime.getClient(), runtime.getRepo()]);
  const report = await runCoreDoctor(client, repo);

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  const lines: string[] = [];
  lines.push(`# dckl doctor — ${repo.owner}/${repo.repo}`, "");
  lines.push(
    `Checked ${report.issuesChecked} open issues, ${report.milestonesChecked} open milestones.`,
    "",
  );

  if (report.warnings.length === 0) {
    lines.push("✓ no warnings.");
  } else {
    const grouped = new Map<string, typeof report.warnings>();
    for (const w of report.warnings) {
      const arr = grouped.get(w.code) ?? [];
      arr.push(w);
      grouped.set(w.code, arr);
    }
    for (const [code, items] of grouped) {
      lines.push(`## ${code} (${items.length})`);
      for (const w of items) {
        const ref =
          w.issueNumber !== undefined
            ? `#${w.issueNumber}: `
            : w.milestoneNumber !== undefined
              ? `milestone #${w.milestoneNumber}: `
              : "";
        lines.push(`- ${ref}${w.message}`);
      }
      lines.push("");
    }
  }

  process.stdout.write(`${lines.join("\n")}\n`);
}
