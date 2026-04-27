import { describe, expect, it } from "vitest";
import { ConcurrentModificationError } from "../src/errors.js";
import {
  addCorrection,
  closeIssue,
  closeSprint,
  createSprint,
  createTask,
  getSessionResume,
  getTaskExport,
  listIssueComments,
  releaseIssue,
  resolveCorrection,
  searchIssues,
  toggleCheck,
} from "../src/ops.js";
import { createTestClient } from "./_mock-fetch.js";

const REPO = { owner: "deckel", repo: "dckl" };

describe("listIssueComments", () => {
  it("flags [correction] and [resolved] comments", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/5/comments",
        response: {
          body: [
            { id: 1, body: "[correction] scope changed", user: { login: "alice" } },
            {
              id: 2,
              body: "[resolved] [correction] earlier note",
              user: { login: "alice" },
            },
            { id: 3, body: "regular comment", user: { login: "bob" } },
          ],
        },
      },
    ]);
    const comments = await listIssueComments(client, REPO, 5);
    expect(comments).toEqual([
      { id: 1, body: "[correction] scope changed", user: "alice", isCorrection: true, isResolved: false },
      {
        id: 2,
        body: "[resolved] [correction] earlier note",
        user: "alice",
        isCorrection: false,
        isResolved: true,
      },
      { id: 3, body: "regular comment", user: "bob", isCorrection: false, isResolved: false },
    ]);
  });
});

describe("searchIssues", () => {
  it("builds a query with status + priority + milestone filters", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/search/issues",
        query: {
          q: 'repo:deckel/dckl is:issue is:open label:"status:todo" label:"priority:must" milestone:3',
          advanced_search: "true",
        },
        response: { body: { total_count: 1, items: [] } },
      },
    ]);
    const result = await searchIssues(client, REPO, {
      status: "todo",
      priority: "must",
      milestone: 3,
    });
    expect(result).toEqual([]);
  });

  it("returns normalized refs (no body, no dates)", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/search/issues",
        response: {
          body: {
            total_count: 1,
            items: [
              {
                number: 7,
                title: "X",
                state: "open",
                body: "should-be-stripped",
                labels: [{ name: "status:todo" }],
                assignees: [],
                milestone: null,
                created_at: "2026-01-01",
              },
            ],
          },
        },
      },
    ]);
    const result = await searchIssues(client, REPO, {});
    expect(result).toEqual([
      {
        number: 7,
        title: "X",
        state: "open",
        labels: ["status:todo"],
        assignees: [],
        milestone: null,
      },
    ]);
  });
});

describe("getSessionResume", () => {
  it("returns null fields when nothing is claimed", async () => {
    const client = createTestClient([
      { method: "GET", path: "/repos/deckel/dckl/issues", response: { body: [] } },
    ]);
    const session = await getSessionResume(client, REPO, "octocat");
    expect(session.activeIssue).toBeNull();
    expect(session.parsedBody).toBeNull();
    expect(session.openCorrections).toEqual([]);
    expect(session.unfinishedCriteria).toEqual([]);
  });

  it("includes parsed body + open corrections + unfinished criteria", async () => {
    const body = `## Worum es geht

A

## Warum jetzt

B

## Woran man merkt, dass es fertig ist

- [x] done one
- [ ] open one
`;
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues",
        response: {
          body: [
            {
              number: 9,
              title: "Active",
              state: "open",
              body,
              labels: [{ name: "status:in-progress" }],
              assignees: [{ login: "octocat" }],
              milestone: null,
            },
          ],
        },
      },
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/9/comments",
        response: {
          body: [
            { id: 11, body: "[correction] scope X", user: { login: "octocat" } },
            { id: 12, body: "[resolved] [correction] old", user: { login: "octocat" } },
          ],
        },
      },
    ]);
    const session = await getSessionResume(client, REPO, "octocat");
    expect(session.activeIssue?.number).toBe(9);
    expect(session.openCorrections).toHaveLength(1);
    expect(session.openCorrections[0]?.id).toBe(11);
    expect(session.unfinishedCriteria.map((c) => c.text)).toEqual(["open one"]);
  });
});

describe("getTaskExport", () => {
  it("returns null when issue is missing", async () => {
    const client = createTestClient([
      { method: "GET", path: "/repos/deckel/dckl/issues/77", response: { status: 404, body: { message: "nope" } } },
    ]);
    expect(await getTaskExport(client, REPO, 77)).toBeNull();
  });

  it("includes parsed body, comments, and dependency titles", async () => {
    const body = `## Worum es geht\n\nA\n\n## Warum jetzt\n\nB\n\n## Woran man merkt, dass es fertig ist\n\n- [ ] x\n\n## Depends on\n\n- #42`;
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/7",
        response: {
          body: {
            number: 7,
            title: "Self",
            state: "open",
            body,
            labels: [],
            assignees: [],
            milestone: null,
          },
        },
      },
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/7/comments",
        response: { body: [] },
      },
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/42",
        response: {
          body: {
            number: 42,
            title: "Dep",
            state: "closed",
            body: "",
            labels: [],
            assignees: [],
            milestone: null,
          },
        },
      },
    ]);
    const exp = await getTaskExport(client, REPO, 7);
    expect(exp?.dependencies).toEqual([{ number: 42, title: "Dep", state: "closed" }]);
    expect(exp?.parsedBody.dependsOn).toEqual([42]);
  });
});

describe("releaseIssue", () => {
  it("removes the in-progress label and assignee", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/8",
        response: {
          body: {
            number: 8,
            title: "Mine",
            state: "open",
            body: "",
            labels: [{ name: "status:in-progress" }],
            assignees: [{ login: "octocat" }],
            milestone: null,
          },
        },
      },
      {
        method: "DELETE",
        path: "/repos/deckel/dckl/issues/8/labels/status%3Ain-progress",
        response: { body: [] },
      },
      {
        method: "DELETE",
        path: "/repos/deckel/dckl/issues/8/assignees",
        response: { body: { number: 8, assignees: [] } },
      },
    ]);
    const result = await releaseIssue(client, REPO, 8, "octocat");
    expect(result).toEqual({ reason: "released", number: 8 });
  });

  it("returns not-claimed when no in-progress label", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/8",
        response: {
          body: {
            number: 8,
            title: "todo",
            state: "open",
            body: "",
            labels: [{ name: "status:todo" }],
            assignees: [],
            milestone: null,
          },
        },
      },
    ]);
    const result = await releaseIssue(client, REPO, 8, "octocat");
    expect(result).toEqual({ reason: "not-claimed", number: 8 });
  });
});

describe("closeIssue", () => {
  it("posts summary, adds done label, removes in-progress, closes", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/4",
        response: {
          body: {
            number: 4,
            title: "x",
            state: "open",
            body: "",
            labels: [{ name: "status:in-progress" }],
            assignees: [],
            milestone: null,
          },
        },
      },
      {
        method: "POST",
        path: "/repos/deckel/dckl/issues/4/comments",
        response: { body: { id: 99, body: "shipped" } },
      },
      {
        method: "POST",
        path: "/repos/deckel/dckl/issues/4/labels",
        response: { body: [] },
      },
      {
        method: "DELETE",
        path: "/repos/deckel/dckl/issues/4/labels/status%3Ain-progress",
        response: { body: [] },
      },
      {
        method: "PATCH",
        path: "/repos/deckel/dckl/issues/4",
        response: { body: { state: "closed" } },
      },
    ]);
    const result = await closeIssue(client, REPO, 4, "shipped");
    expect(result).toEqual({ reason: "closed", number: 4, commentId: 99 });
  });

  it("skips comment when summary is empty", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/4",
        response: {
          body: {
            number: 4,
            title: "x",
            state: "open",
            body: "",
            labels: [],
            assignees: [],
            milestone: null,
          },
        },
      },
      { method: "POST", path: "/repos/deckel/dckl/issues/4/labels", response: { body: [] } },
      {
        method: "PATCH",
        path: "/repos/deckel/dckl/issues/4",
        response: { body: { state: "closed" } },
      },
    ]);
    const result = await closeIssue(client, REPO, 4);
    expect(result.reason).toBe("closed");
    expect(result.commentId).toBeUndefined();
  });
});

describe("toggleCheck", () => {
  const bodyV0 = "## Woran man merkt, dass es fertig ist\n\n- [ ] alpha\n";
  const bodyV1 = "## Woran man merkt, dass es fertig ist\n\n- [x] alpha\n";

  it("toggles the matching checkbox and writes the new body back", async () => {
    let writeReceivedBody: string | null = null;
    const client = createTestClient(
      [
        {
          method: "GET",
          path: "/repos/deckel/dckl/issues/2",
          response: {
            body: {
              number: 2,
              title: "T",
              state: "open",
              body: bodyV0,
              labels: [],
              assignees: [],
              milestone: null,
            },
          },
        },
        {
          method: "GET",
          path: "/repos/deckel/dckl/issues/2",
          response: {
            body: {
              number: 2,
              title: "T",
              state: "open",
              body: bodyV0,
              labels: [],
              assignees: [],
              milestone: null,
            },
          },
        },
        {
          method: "PATCH",
          path: "/repos/deckel/dckl/issues/2",
          response: { body: { number: 2 } },
        },
      ],
      (call) => {
        if (call.method === "PATCH" && call.url.includes("/issues/2")) {
          writeReceivedBody = (call.body as { body?: string } | null)?.body ?? null;
        }
      },
    );

    const result = await toggleCheck(client, REPO, 2, "alpha");
    expect(result.toggled).toBe(true);
    expect(result.newState).toBe(true);
    expect(writeReceivedBody).toBe(bodyV1);
  });

  it("throws ConcurrentModificationError when body changed between read and verify", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/3",
        response: {
          body: {
            number: 3,
            title: "T",
            state: "open",
            body: bodyV0,
            labels: [],
            assignees: [],
            milestone: null,
          },
        },
      },
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/3",
        response: {
          body: {
            number: 3,
            title: "T",
            state: "open",
            body: "## different body\n",
            labels: [],
            assignees: [],
            milestone: null,
          },
        },
      },
    ]);
    await expect(toggleCheck(client, REPO, 3, "alpha")).rejects.toBeInstanceOf(
      ConcurrentModificationError,
    );
  });

  it("returns toggled: false when pattern doesn't match", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/4",
        response: {
          body: {
            number: 4,
            title: "T",
            state: "open",
            body: bodyV0,
            labels: [],
            assignees: [],
            milestone: null,
          },
        },
      },
    ]);
    const result = await toggleCheck(client, REPO, 4, "nonexistent");
    expect(result.toggled).toBe(false);
  });
});

describe("addCorrection / resolveCorrection", () => {
  it("addCorrection prefixes the body with [correction]", async () => {
    let postedBody: string | null = null;
    const client = createTestClient(
      [
        {
          method: "POST",
          path: "/repos/deckel/dckl/issues/1/comments",
          response: { body: { id: 555 } },
        },
      ],
      (call) => {
        if (call.method === "POST") {
          postedBody = (call.body as { body?: string } | null)?.body ?? null;
        }
      },
    );

    const result = await addCorrection(client, REPO, 1, "scope shifted because Z");
    expect(result.commentId).toBe(555);
    expect(postedBody).toBe("[correction] scope shifted because Z");
  });

  it("resolveCorrection prepends [resolved] on a [correction] comment", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/comments/100",
        response: { body: { id: 100, body: "[correction] something happened" } },
      },
      {
        method: "PATCH",
        path: "/repos/deckel/dckl/issues/comments/100",
        response: { body: { id: 100 } },
      },
    ]);
    const result = await resolveCorrection(client, REPO, 100);
    expect(result).toEqual({ reason: "resolved", commentId: 100 });
  });

  it("resolveCorrection refuses non-correction comments", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/comments/200",
        response: { body: { id: 200, body: "regular comment" } },
      },
    ]);
    const result = await resolveCorrection(client, REPO, 200);
    expect(result.reason).toBe("not-correction");
  });

  it("resolveCorrection short-circuits on already-resolved", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/repos/deckel/dckl/issues/comments/300",
        response: { body: { id: 300, body: "[resolved] [correction] x" } },
      },
    ]);
    const result = await resolveCorrection(client, REPO, 300);
    expect(result.reason).toBe("not-correction");
    // Note: regex sees [resolved] first; treats as not-correction. Acceptable.
  });
});

describe("createTask / createSprint / closeSprint", () => {
  it("createTask builds a schema-conforming body and sets dckl labels", async () => {
    let createPayload: Record<string, unknown> | null = null;
    const client = createTestClient(
      [
        {
          method: "POST",
          path: "/repos/deckel/dckl/issues",
          response: { body: { number: 42, html_url: "https://github.com/deckel/dckl/issues/42" } },
        },
      ],
      (call) => {
        if (call.method === "POST") {
          createPayload = call.body as Record<string, unknown> | null;
        }
      },
    );

    const result = await createTask(client, REPO, {
      title: "Implement X",
      type: "feat",
      priority: "must",
      worumEsGeht: "Beschreibung",
      warumJetzt: "Warum",
      acceptanceCriteria: ["one", "two"],
      contextFiles: ["a.ts"],
    });
    expect(result).toEqual({ number: 42, url: "https://github.com/deckel/dckl/issues/42" });
    expect(createPayload?.title).toBe("Implement X");
    expect(createPayload?.labels).toEqual(["status:todo", "priority:must", "type:feat"]);
    const body = createPayload?.body as string;
    expect(body).toContain("## Worum es geht");
    expect(body).toContain("- [ ] one");
    expect(body).toContain("- a.ts");
  });

  it("createSprint creates a milestone without due_on", async () => {
    let payload: Record<string, unknown> | null = null;
    const client = createTestClient(
      [
        {
          method: "POST",
          path: "/repos/deckel/dckl/milestones",
          response: { body: { number: 1, title: "v0.1" } },
        },
      ],
      (call) => {
        if (call.method === "POST") {
          payload = call.body as Record<string, unknown> | null;
        }
      },
    );

    const result = await createSprint(client, REPO, "v0.1", "First release");
    expect(result).toEqual({ number: 1, title: "v0.1" });
    expect(payload).toEqual({ title: "v0.1", description: "First release" });
    expect(payload).not.toHaveProperty("due_on");
  });

  it("closeSprint refuses when priority:must issues remain open", async () => {
    const client = createTestClient([
      {
        method: "GET",
        path: "/search/issues",
        response: {
          body: {
            total_count: 1,
            items: [
              {
                number: 99,
                title: "Open must",
                state: "open",
                body: "",
                labels: [{ name: "priority:must" }],
                assignees: [],
                milestone: { number: 3, title: "v0.1" },
              },
            ],
          },
        },
      },
    ]);
    const result = await closeSprint(client, REPO, 3);
    expect(result).toEqual({ reason: "must-issues-open", milestoneNumber: 3, blockingIssues: [99] });
  });
});
