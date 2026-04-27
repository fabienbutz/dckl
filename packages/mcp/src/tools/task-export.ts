import { getTaskExport } from "@dckl/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asMcpContent, fail, fromError, ok } from "../envelope.js";
import type { Runtime } from "../runtime.js";

const DESCRIPTION = `Returns the full export of a dckl task: issue body,
parsed sections, all comments (with [correction] / [resolved] markers),
and the titles + states of every issue named under "## Depends on".

Use when you need the full picture of a single task — body, history,
dependency graph fragment.`;

export function registerTaskExportTool(server: McpServer, runtime: Runtime): void {
  server.tool(
    "dckl_task_export",
    DESCRIPTION,
    { issue_number: z.number().int().positive() },
    async ({ issue_number }, _extra) => {
      try {
        const [client, repo] = await Promise.all([runtime.getClient(), runtime.getRepo()]);
        const data = await getTaskExport(client, repo, issue_number);
        if (!data) {
          return asMcpContent(fail("NOT_FOUND", `Issue #${issue_number} does not exist.`));
        }
        return asMcpContent(ok(data));
      } catch (err) {
        return asMcpContent(fromError(err));
      }
    },
  );
}
