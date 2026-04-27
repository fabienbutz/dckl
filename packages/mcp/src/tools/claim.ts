import { claimIssue } from "@dckl/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asMcpContent, fromError, ok } from "../envelope.js";
import type { Runtime } from "../runtime.js";

const DESCRIPTION = `Claims a dckl task: adds the \`status:in-progress\`
label, assigns the issue to the current user, and removes
\`status:todo\` if present.

Result envelope reasons:
- \`claimed\`        — fresh claim succeeded.
- \`already-mine\`   — the user already holds the claim (no-op).
- \`blocked\`        — someone else holds the claim; \`by\` names them.
- \`not-found\`      — issue does not exist.`;

export function registerClaimTool(server: McpServer, runtime: Runtime): void {
  server.tool(
    "dckl_task_claim",
    DESCRIPTION,
    { issue_number: z.number().int().positive() },
    async ({ issue_number }, _extra) => {
      try {
        const [client, repo, user] = await Promise.all([
          runtime.getClient(),
          runtime.getRepo(),
          runtime.getUser(),
        ]);
        const result = await claimIssue(client, repo, issue_number, user.login);
        return asMcpContent(ok(result));
      } catch (err) {
        return asMcpContent(fromError(err));
      }
    },
  );
}
