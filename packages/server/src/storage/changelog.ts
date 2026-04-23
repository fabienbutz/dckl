import { existsSync } from "node:fs";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";
import lockfile from "proper-lockfile";
import type { TaskMeta } from "../schema/index.js";

export type ChangelogEvent =
  | { kind: "task.status"; task_id: string; from: string; to: string }
  | { kind: "reminder.check"; task_id: string; reminder_id: string; checked: boolean }
  | { kind: "test.check"; task_id: string; test_id: string; checked: boolean }
  | { kind: "correction.add"; task_id: string; correction_id: string; text: string }
  | { kind: "correction.resolve"; task_id: string; correction_id: string }
  | { kind: "sprint.transition"; sprint_id: string; from: string; to: string };

const HEADER = "# Project History\n\n";
const DAY_HEADER = /^## (\d{4}-\d{2}-\d{2})$/m;

/**
 * Appends a changelog entry to .deckel/CHANGELOG.md, grouped by day. The file
 * is never rewritten from scratch — existing entries stay exactly where the
 * user last saw them. A day header is inserted once per date; subsequent
 * events on the same date append underneath.
 */
export async function appendChangelog(
  deckelRoot: string,
  events: ChangelogEvent[],
): Promise<void> {
  if (events.length === 0) return;

  const path = join(deckelRoot, "CHANGELOG.md");
  mkdirSync(dirname(path), { recursive: true });

  if (!existsSync(path)) {
    await writeFile(path, HEADER, "utf8");
  }

  const release = await lockfile.lock(path, {
    retries: { retries: 5, minTimeout: 30, maxTimeout: 150 },
    stale: 5_000,
  });

  try {
    const current = await readFile(path, "utf8");
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 5);

    const lines = events.map((e) => `- **${time}** · ${renderEvent(e)}`);

    let nextContent: string;
    if (current.includes(`## ${today}`)) {
      // Day exists — append entries immediately under it.
      const dayIndex = current.indexOf(`## ${today}`);
      const afterHeader = current.indexOf("\n", dayIndex) + 1;
      const prefix = current.slice(0, afterHeader);
      const rest = current.slice(afterHeader);
      // Newest first under the header — prepend.
      nextContent = `${prefix}\n${lines.join("\n")}\n${rest}`;
    } else {
      // New day — insert new section at the top (after HEADER).
      const body = current.startsWith(HEADER) ? current.slice(HEADER.length) : current;
      nextContent = `${HEADER}## ${today}\n\n${lines.join("\n")}\n\n${body}`;
    }

    await writeFile(path, nextContent, "utf8");
  } finally {
    await release();
  }
}

function renderEvent(event: ChangelogEvent): string {
  switch (event.kind) {
    case "task.status":
      return `\`${event.task_id}\` · status \`${event.from}\` → \`${event.to}\``;
    case "reminder.check":
      return `\`${event.task_id}\` · reminder \`${event.reminder_id}\` → ${event.checked ? "checked" : "unchecked"}`;
    case "test.check":
      return `\`${event.task_id}\` · test \`${event.test_id}\` → ${event.checked ? "checked" : "unchecked"}`;
    case "correction.add":
      return `\`${event.task_id}\` · correction added: _${event.text.slice(0, 80)}_`;
    case "correction.resolve":
      return `\`${event.task_id}\` · correction \`${event.correction_id}\` resolved`;
    case "sprint.transition":
      return `Sprint \`${event.sprint_id}\` · \`${event.from}\` → \`${event.to}\``;
  }
}

/**
 * Diffs old vs. new TaskMeta and returns the events that represent the
 * change. Used by Store.patchTask to feed the changelog automatically.
 */
export function diffTaskForChangelog(
  before: TaskMeta,
  after: TaskMeta,
): ChangelogEvent[] {
  const events: ChangelogEvent[] = [];

  if (before.status !== after.status) {
    events.push({
      kind: "task.status",
      task_id: after.id,
      from: before.status,
      to: after.status,
    });
  }

  const reminderMap = new Map(before.security_checks.map((r) => [r.id, r.checked]));
  for (const r of after.security_checks) {
    if (reminderMap.get(r.id) !== r.checked) {
      events.push({
        kind: "reminder.check",
        task_id: after.id,
        reminder_id: r.id,
        checked: r.checked,
      });
    }
  }

  const testMap = new Map(before.test_criteria.map((t) => [t.id, t.checked]));
  for (const t of after.test_criteria) {
    if (testMap.get(t.id) !== t.checked) {
      events.push({
        kind: "test.check",
        task_id: after.id,
        test_id: t.id,
        checked: t.checked,
      });
    }
  }

  const correctionMap = new Map(before.corrections.map((c) => [c.id, c]));
  for (const c of after.corrections) {
    const prev = correctionMap.get(c.id);
    if (!prev) {
      events.push({
        kind: "correction.add",
        task_id: after.id,
        correction_id: c.id,
        text: c.text,
      });
    } else if (prev.open && !c.open) {
      events.push({
        kind: "correction.resolve",
        task_id: after.id,
        correction_id: c.id,
      });
    }
  }

  return events;
}
