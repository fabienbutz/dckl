import { getSprintView } from "@dckl/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asMcpContent, fail, fromError, ok } from "../envelope.js";
import type { Runtime } from "../runtime.js";

const DESCRIPTION = `Returns the contents of a dckl "sprint" — i.e. a
GitHub milestone. Includes the milestone title and description (no
dates) plus every issue belonging to it (number, title, labels, state).
Issue bodies are not included; use \`dckl_task_export\` for those.`;

export function registerSprintViewTool(server: McpServer, runtime: Runtime): void {
  server.tool(
    "dckl_sprint_view",
    DESCRIPTION,
    { milestone_number: z.number().int().positive() },
    async ({ milestone_number }, _extra) => {
      try {
        const [client, repo] = await Promise.all([runtime.getClient(), runtime.getRepo()]);
        const data = await getSprintView(client, repo, milestone_number);
        if (!data) {
          return asMcpContent(fail("NOT_FOUND", `Milestone #${milestone_number} does not exist.`));
        }
        return asMcpContent(ok(data));
      } catch (err) {
        return asMcpContent(fromError(err));
      }
    },
  );
}
