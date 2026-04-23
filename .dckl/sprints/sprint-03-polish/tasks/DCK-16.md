---
schema: 1
id: DCK-16
sprint_id: sprint-03-polish
title: SKILL.md + CLAUDE.md reality refresh — reflect Sprint-02 learnings
type: chore
status: done
security_checks: []
test_criteria:
  - id: no-stale-workarounds
    label: >-
      SKILL.md contains no references to manual PATCH / curl workflows (replaced
      with `task close`, `correction resolve`, `sprint close`)
    checked: true
  - id: command-table-accurate
    label: >-
      The command table in CLAUDE.md matches the current CLI surface 1:1 (run
      `dckl --help` and diff)
    checked: true
  - id: anti-patterns-updated
    label: >-
      New anti-patterns learned in Sprint-02 are documented in SKILL.md:
      stale-Edit state, heartbeat not-manual, close != release
    checked: true
  - id: no-planned-markers
    label: >-
      No `[planned]` markers or "coming in sprint X" notes — docs describe
      reality, not intent
    checked: true
corrections: []
context_files:
  - .claude/skills/dckl/SKILL.md
  - CLAUDE.md
depends_on:
  - DCK-12
  - DCK-13
  - DCK-15
pre_flight:
  - >-
    Do this task LAST in the sprint, after DCK-12/13/15 have landed — the doc
    refresh needs to reflect what actually exists, not what's planned.
  - >-
    Sprint-02 did this pass once already (S2.8-7 Reality-Pass). Repeat the same
    discipline: diff `dckl --help` against SKILL.md line by line.
updated: '2026-04-23T14:51:24.161Z'
---

## DCK-16: SKILL.md + CLAUDE.md reality refresh

After Sprint-03 adds three new CLI commands (`task close`, `correction
resolve`, `sprint close`), the agent-facing docs must reflect them.
Otherwise the next agent that touches dckl rediscovers the manual
PATCH workflow and the cycle repeats.

### Why

- Sprint-02 already required one reality-pass (S2.8-7) because the
  docs drifted during a single sprint. Every sprint that adds CLI
  surface needs this.
- SKILL.md is authoritative when it disagrees with CLAUDE.md — so it
  has to actually be right.

### Approach

1. Diff `dckl --help` output against the command tables in
   SKILL.md and CLAUDE.md; update both.
2. Remove any mention of manual API PATCH, direct file edits, or
   `pkill` workarounds — Sprint-03 closes those paths.
3. Add a short "anti-patterns from Sprint-02" section listing:
   - Heartbeat is automatic — do not invoke manually.
   - `task release` ≠ `task close`.
   - Corrections need explicit resolution, not silent drop.
   - Stale-Edit state: always re-Read before Edit on files touched
     earlier in the session.
4. Remove any `[planned]` or "coming soon" markers.

### Out of scope

- Restructuring SKILL.md into sections — keep the current shape.
- Writing user-facing (non-agent) docs. That lives under `docs/`.
- README rewrites.
