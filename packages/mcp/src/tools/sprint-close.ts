import { closeSprint } from "@dckl/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asMcpContent, fromError, ok } from "../envelope.js";
import type { Runtime } from "../runtime.js";

const DESCRIPTION = `Closes a dckl sprint (GitHub milestone). Refuses if
any issue in the milestone with \`priority:must\` is still open — those
are the gate. \`priority:should\` and \`priority:could\` issues do not
block closing; they are forwarded by the user manually.

Result envelope reasons:
- \`closed\`             — milestone closed successfully.
- \`must-issues-open\`   — refused; \`blockingIssues\` lists the offenders.
- \`not-found\`          — milestone does not exist.`;

export function registerSprintCloseTool(server: McpServer, runtime: Runtime): void {
  server.tool(
    "dckl_sprint_close",
    DESCRIPTION,
    { milestone_number: z.number().int().positive() },
    async ({ milestone_number }, _extra) => {
      try {
        const [client, repo] = await Promise.all([runtime.getClient(), runtime.getRepo()]);
        const result = await closeSprint(client, repo, milestone_number);
        return asMcpContent(ok(result));
      } catch (err) {
        return asMcpContent(fromError(err));
      }
    },
  );
}
