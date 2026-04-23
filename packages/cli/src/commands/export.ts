import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Store } from "@dckl/server";
import { findDcklRoot } from "@dckl/server/storage";
import type { SecurityCheckTemplateEntry } from "@dckl/server/schema";

export async function runExport(taskId: string): Promise<void> {
  const dcklRoot = findDcklRoot(process.cwd());
  if (!dcklRoot) {
    console.error("[dckl] no .dckl/ found — run `dckl init` first");
    process.exitCode = 1;
    return;
  }

  const sprintId = findSprintForTask(dcklRoot, taskId);
  if (!sprintId) {
    console.error(`[dckl] task ${taskId} not found in any sprint`);
    process.exitCode = 1;
    return;
  }

  const store = new Store(dcklRoot);

  const [{ task }, config, vision, templates] = await Promise.all([
    store.getTask(sprintId, taskId),
    store.getConfig().catch(() => null),
    store.getVision().catch(() => null),
    store.getSecurityTemplates().catch(() => null),
  ]);

  const templateKey = config?.config.defaults.security_check_template ?? "default";
  const reminderLabels = new Map<string, SecurityCheckTemplateEntry>();
  if (templates) {
    const entries = templates.templates[templateKey] ?? [];
    for (const e of entries) reminderLabels.set(e.id, e);
  }

  const meta = task.meta;
  const out: string[] = [];

  out.push(`# Task ${meta.id} · ${meta.title}`);
  out.push("");
  out.push(
    `\`type: ${meta.type}\` · \`status: ${meta.status}\` · \`sprint: ${meta.sprint_id}\``,
  );
  out.push("");

  if (config?.config.project.name || vision) {
    out.push("## Project context");
    out.push("");
    if (config?.config.project.name) {
      out.push(`**Project:** ${config.config.project.name}`);
    }
    if (vision) {
      out.push(`**North star:** ${vision.meta.north_star}`);
      if (vision.meta.current_phase) {
        out.push(`**Current phase:** \`${vision.meta.current_phase}\``);
      }
      if (vision.meta.non_goals && vision.meta.non_goals.length > 0) {
        out.push(`**Non-goals:** ${vision.meta.non_goals.join(" · ")}`);
      }
    }
    out.push("");
  }

  if (meta.context_files && meta.context_files.length > 0) {
    out.push("## Context files (hard boundary)");
    out.push("");
    out.push("Edit only these. Any file outside this list requires user approval.");
    out.push("");
    for (const f of meta.context_files) out.push(`- \`${f}\``);
    out.push("");
  }

  if (meta.depends_on && meta.depends_on.length > 0) {
    out.push("## Depends on");
    out.push("");
    for (const id of meta.depends_on) out.push(`- \`${id}\``);
    out.push("");
  }

  if (meta.pre_flight && meta.pre_flight.length > 0) {
    out.push("## Pre-flight (do these before coding)");
    out.push("");
    for (const step of meta.pre_flight) out.push(`- ${step}`);
    out.push("");
  }

  const openReminders = meta.security_checks.filter((r) => !r.checked);
  const openTests = meta.test_criteria.filter((t) => !t.checked);
  const openCorrections = meta.corrections.filter((c) => c.open);

  if (openReminders.length > 0) {
    out.push("## Open reminders (acceptance criteria)");
    out.push("");
    for (const r of openReminders) {
      const label = reminderLabels.get(r.id);
      if (label) out.push(`- [ ] \`${r.id}\` — ${label.label} _(${label.category})_`);
      else out.push(`- [ ] \`${r.id}\``);
    }
    out.push("");
  }

  if (openTests.length > 0) {
    out.push("## Open test criteria");
    out.push("");
    for (const t of openTests) out.push(`- [ ] \`${t.id}\` — ${t.label}`);
    out.push("");
  }

  if (openCorrections.length > 0) {
    out.push("## Open corrections (known issues on this task)");
    out.push("");
    for (const c of openCorrections) out.push(`- \`${c.id}\` — ${c.text}`);
    out.push("");
  }

  if (meta.related_docs && meta.related_docs.length > 0) {
    out.push("## Related docs");
    out.push("");
    for (const d of meta.related_docs) out.push(`- \`${d}\``);
    out.push("");
  }

  if (task.body.trim().length > 0) {
    out.push("## Description");
    out.push("");
    out.push(task.body.trim());
    out.push("");
  }

  out.push("## Agent workflow");
  out.push("");
  out.push("Before writing code:");
  out.push("```bash");
  out.push(`pnpm dckl task claim ${meta.id}`);
  out.push("```");
  out.push("");
  out.push("When you address a reminder or test:");
  out.push("```bash");
  out.push(`pnpm dckl check ${meta.id} <check-id>`);
  out.push("```");
  out.push("");
  out.push("When you discover a new issue mid-work:");
  out.push("```bash");
  out.push(`pnpm dckl correction add ${meta.id} "<short description>"`);
  out.push("```");
  out.push("");
  out.push("When pausing or finishing:");
  out.push("```bash");
  out.push(`pnpm dckl task release ${meta.id}`);
  out.push("```");
  out.push("");
  out.push("Do not mark this task `done` yourself — only the user sets that.");

  console.log(out.join("\n"));
}

function findSprintForTask(dcklRoot: string, taskId: string): string | null {
  const sprintsDir = join(dcklRoot, "sprints");
  if (!existsSync(sprintsDir)) return null;
  for (const entry of readdirSync(sprintsDir)) {
    const taskFile = join(sprintsDir, entry, "tasks", `${taskId}.md`);
    if (existsSync(taskFile)) return entry;
  }
  return null;
}
