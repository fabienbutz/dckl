import { resolve } from "node:path";
import { Hono } from "hono";
import { groupCommitsByTask, listCommits } from "../storage/git-log.js";
import type { Store } from "../storage/store.js";

export function commitsRoutes(store: Store): Hono {
  const app = new Hono();

  // Returns { commits: { [taskId]: CommitRef[] } } covering every commit
  // in the repo since this sprint started. Read-only — no side effects,
  // no checkbox flipping. Missing sprint = 404, no git = empty map.
  app.get("/:sprintId/commits", async (c) => {
    const sprintId = c.req.param("sprintId");
    try {
      const { sprint } = await store.getSprint(sprintId);
      const projectRoot = resolve(store.paths.root, "..");
      const since = sprint.meta.start;
      const { config } = await store.getConfig();
      const commits = listCommits(projectRoot, since);
      const byTask = groupCommitsByTask(commits, config.task_id_prefix);
      return c.json({ commits: byTask });
    } catch (err) {
      return c.json({ error: (err as Error).message }, 404);
    }
  });

  return app;
}
