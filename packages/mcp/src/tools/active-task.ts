import { getActiveIssue } from "@dckl/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { asMcpContent, fromError, ok } from "../envelope.js";
import type { Runtime } from "../runtime.js";

const DESCRIPTION = `Returns the currently claimed dckl task, or null when nothing is claimed.

A task is "claimed" when its issue carries label \`status:in-progress\`
and the current user is among the assignees. Includes the parsed body,
labels, and milestone summary — no date fields.

No input arguments.`;

export function registerActiveTaskTool(server: McpServer, runtime: Runtime): void {
  server.tool("dckl_active_task", DESCRIPTION, async (_extra) => {
    try {
      const [client, repo, user] = await Promise.all([
        runtime.getClient(),
        runtime.getRepo(),
        runtime.getUser(),
      ]);
      const issue = await getActiveIssue(client, repo, user.login);
      return asMcpContent(ok(issue));
    } catch (err) {
      return asMcpContent(fromError(err));
    }
  });
}
