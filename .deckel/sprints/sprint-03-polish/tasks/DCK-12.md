---
schema: 1
id: DCK-12
sprint_id: sprint-03-polish
title: deckel task close <id> — explicit status transition to done
type: feature
status: todo
security_checks:
  - id: input-validation
    checked: false
test_criteria:
  - id: status-done
    label: >-
      `deckel task close DCK-11` sets status=done in the task MD atomically
      (ETag-guarded, same write path as /api/sprints/.../tasks/:id PATCH)
    checked: false
  - id: release-claim
    label: >-
      Close also releases any active claim (clears .active-task if the task
      was claimed) — no zombie pointers after close
    checked: false
  - id: idempotent
    label: >-
      Closing an already-closed task is a no-op (prints a note, exits 0) —
      does not bump `updated:` and does not append to the changelog
    checked: false
  - id: rejects-open-reminders
    label: >-
      Refuses to close while reminders (security_checks) are unchecked,
      unless --force is passed. Mirrors the SKILL rule "don't close with open
      reminders"
    checked: false
corrections: []
context_files:
  - packages/cli/src/commands/task.ts
  - packages/cli/src/cli.ts
  - packages/server/src/storage/store.ts
depends_on: []
pre_flight:
  - >-
    Read SKILL.md's "Finishing a task" section — close semantics must match
    what the skill already describes to agents.
  - >-
    Decide whether close also writes to CHANGELOG.md — Sprint-02 already
    appends on status changes, verify no double-entry.
---

## DCK-12: `deckel task close <id>`

During Sprint-02 close-out, moving tasks to `status: done` required a
raw `curl -X PATCH` against the API. That's acceptable for an agent
debugging once, but it's not the canonical user flow.

### Why

- `task release` clears the claim but leaves status untouched.
- There is no CLI equivalent to the API's PATCH `{status: done}`.
- SKILL.md tells agents to mark done "only when the user approves" —
  but there is no ergonomic way to do that.

### Semantics

```
deckel task close DCK-11            # sets status=done, releases claim
deckel task close DCK-11 --force    # closes even with open reminders
```

- Idempotent: closing a `done` task prints a note and exits 0.
- Refuses on open `security_checks` unless `--force` (mirrors the
  manual workflow the SKILL describes).
- Releases claim if present (clears `.active-task` only if that
  pointer referenced this task).
- Appends one CHANGELOG entry, same format as `task release`.

### Out of scope

- `task reopen` (reverse direction). Add later if needed.
- Bulk close (`task close DCK-11 DCK-12`). One at a time.
- Workflow state beyond `todo | in_progress | done` (no `review`,
  `blocked`, etc.).
