import { closeIssue } from "@dckl/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asMcpContent, fromError, ok } from "../envelope.js";
import type { Runtime } from "../runtime.js";

const DESCRIPTION = `Closes a dckl task: optionally posts a final
summary comment, adds \`status:done\`, removes \`status:in-progress\`,
and closes the issue.`;

export function registerCloseTool(server: McpServer, runtime: Runtime): void {
  server.tool(
    "dckl_task_close",
    DESCRIPTION,
    {
      issue_number: z.number().int().positive(),
      summary: z.string().min(1).optional(),
    },
    async ({ issue_number, summary }, _extra) => {
      try {
        const [client, repo] = await Promise.all([runtime.getClient(), runtime.getRepo()]);
        const result = await closeIssue(client, repo, issue_number, summary);
        return asMcpContent(ok(result));
      } catch (err) {
        return asMcpContent(fromError(err));
      }
    },
  );
}
