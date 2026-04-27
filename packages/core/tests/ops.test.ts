import { describe, expect, it } from "vitest";
import {
  claimIssue,
  getActiveIssue,
  getCurrentUser,
  getIssue,
  getStatusSummary,
  listOpenMilestones,
} from "../src/ops.js";
import { createTestClient } from "./_mock-fetch.js";

const REPO = { owner: "deckel", repo: "dckl" };

describe("getCurrentUser", () => {
  it("returns login + id", async () => {
    const client = createTestClient([
      { method: "GET", path: "/user", response: { body: { login: "octocat", id: 42 } } },
    ]);
    const user = await getCurrentUser(client);
    expect(user).toEqual({ login: "octocat", id: 42 });
  });
});

describe("getIssue", () => {
  it("returns a normalized issue", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/12",
        response: {
          body: {
            number: 12,
            title: "Add session resume",
            state: "open",
            body: "## Worum es geht\n\nFoo",
            labels: [{ name: "status:in-progress" }, "priority:must"],
            assignees: [{ login: "octocat" }],
            milestone: { number: 3, title: "v0.1" },
            created_at: "2026-01-01",
          },
        },
      },
    ]);
    const issue = await getIssue(client, REPO, 12);
    expect(issue).toEqual({
      number: 12,
      title: "Add session resume",
      state: "open",
      body: "## Worum es geht\n\nFoo",
      labels: ["status:in-progress", "priority:must"],
      assignees: ["octocat"],
      milestone: { number: 3, title: "v0.1" },
    });
  });

  it("returns null on 404", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/999",
        response: { status: 404, body: { message: "Not Found" } },
      },
    ]);
    const issue = await getIssue(client, REPO, 999);
    expect(issue).toBeNull();
  });
});

describe("getActiveIssue", () => {
  it("finds the issue with status:in-progress + assignee", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues",
        response: {
          body: [
            {
              number: 7,
              title: "Working",
              state: "open",
              body: "...",
              labels: [{ name: "status:in-progress" }],
              assignees: [{ login: "octocat" }],
              milestone: null,
              created_at: "2026-01-01",
            },
          ],
        },
      },
    ]);
    const issue = await getActiveIssue(client, REPO, "octocat");
    expect(issue?.number).toBe(7);
  });

  it("returns null when no claim exists", async () => {
    const client = createTestClient([
      { method: "GET", path: "/repos/deckel/dckl/issues", response: { body: [] } },
    ]);
    expect(await getActiveIssue(client, REPO, "octocat")).toBeNull();
  });
});

describe("listOpenMilestones", () => {
  it("normalizes milestones and strips dates", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/milestones",
        response: {
          body: [
            {
              number: 1,
              title: "v0.1",
              description: "First release",
              state: "open",
              due_on: "2026-12-31",
              created_at: "2026-01-01",
            },
          ],
        },
      },
    ]);
    const milestones = await listOpenMilestones(client, REPO);
    expect(milestones).toEqual([
      { number: 1, title: "v0.1", description: "First release", state: "open" },
    ]);
  });
});

describe("getStatusSummary", () => {
  it("aggregates active issue, milestone, and counts", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues",
        response: {
          body: [
            {
              number: 7,
              title: "Working",
              state: "open",
              body: "...",
              labels: [{ name: "status:in-progress" }],
              assignees: [{ login: "octocat" }],
              milestone: { number: 1, title: "v0.1" },
            },
          ],
        },
      },
      {
        method: "GET",
        path: "/repos/deckel/dckl/milestones",
        response: {
          body: [{ number: 1, title: "v0.1", description: "", state: "open" }],
        },
      },
      {
        method: "GET",
        path: "/search/issues",
        query: { q: 'repo:deckel/dckl is:issue is:open label:"status:todo"' },
        response: { body: { total_count: 5, items: [] } },
      },
      {
        method: "GET",
        path: "/search/issues",
        query: { q: 'repo:deckel/dckl is:issue is:open label:"status:in-progress"' },
        response: { body: { total_count: 1, items: [] } },
      },
      {
        method: "GET",
        path: "/search/issues",
        query: { q: 'repo:deckel/dckl is:issue is:open label:"status:review"' },
        response: { body: { total_count: 2, items: [] } },
      },
    ]);
    const summary = await getStatusSummary(client, REPO, "octocat");
    expect(summary.activeIssue?.number).toBe(7);
    expect(summary.activeMilestone?.title).toBe("v0.1");
    expect(summary.counts).toEqual({ todo: 5, inProgress: 1, review: 2, openMilestones: 1 });
  });
});

describe("claimIssue", () => {
  it("claims a fresh todo issue: adds label, assignee, removes status:todo", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/5",
        response: {
          body: {
            number: 5,
            title: "Fresh",
            state: "open",
            body: "",
            labels: [{ name: "status:todo" }],
            assignees: [],
            milestone: null,
          },
        },
      },
      {
        method: "POST",
        path: "/repos/deckel/dckl/issues/5/labels",
        response: { body: [{ name: "status:in-progress" }, { name: "status:todo" }] },
      },
      {
        method: "POST",
        path: "/repos/deckel/dckl/issues/5/assignees",
        response: { body: { number: 5, assignees: [{ login: "octocat" }] } },
      },
      {
        method: "DELETE",
        path: "/repos/deckel/dckl/issues/5/labels/status%3Atodo",
        response: { body: [] },
      },
    ]);
    const result = await claimIssue(client, REPO, 5, "octocat");
    expect(result).toEqual({ reason: "claimed", number: 5, by: "octocat" });
  });

  it("returns already-mine when user already holds the claim", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/5",
        response: {
          body: {
            number: 5,
            title: "Mine",
            state: "open",
            body: "",
            labels: [{ name: "status:in-progress" }],
            assignees: [{ login: "octocat" }],
            milestone: null,
          },
        },
      },
    ]);
    const result = await claimIssue(client, REPO, 5, "octocat");
    expect(result).toEqual({ reason: "already-mine", number: 5, by: "octocat" });
  });

  it("returns blocked when someone else has the claim", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/5",
        response: {
          body: {
            number: 5,
            title: "Theirs",
            state: "open",
            body: "",
            labels: [{ name: "status:in-progress" }],
            assignees: [{ login: "alice" }],
            milestone: null,
          },
        },
      },
    ]);
    const result = await claimIssue(client, REPO, 5, "octocat");
    expect(result).toEqual({ reason: "blocked", number: 5, by: "alice" });
  });

  it("returns not-found when the issue doesn't exist", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/999",
        response: { status: 404, body: { message: "Not Found" } },
      },
    ]);
    const result = await claimIssue(client, REPO, 999, "octocat");
    expect(result).toEqual({ reason: "not-found", number: 999 });
  });
});
