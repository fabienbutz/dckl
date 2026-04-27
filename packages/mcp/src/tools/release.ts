import { releaseIssue } from "@dckl/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asMcpContent, fromError, ok } from "../envelope.js";
import type { Runtime } from "../runtime.js";

const DESCRIPTION = `Releases a dckl task: removes the
\`status:in-progress\` label and the current user from the assignees.
The issue stays open. Apply a different status label manually if
desired.`;

export function registerReleaseTool(server: McpServer, runtime: Runtime): void {
  server.tool(
    "dckl_task_release",
    DESCRIPTION,
    { issue_number: z.number().int().positive() },
    async ({ issue_number }, _extra) => {
      try {
        const [client, repo, user] = await Promise.all([
          runtime.getClient(),
          runtime.getRepo(),
          runtime.getUser(),
        ]);
        const result = await releaseIssue(client, repo, issue_number, user.login);
        return asMcpContent(ok(result));
      } catch (err) {
        return asMcpContent(fromError(err));
      }
    },
  );
}
