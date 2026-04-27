import { getStatusSummary } from "@dckl/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { asMcpContent, fromError, ok } from "../envelope.js";
import type { Runtime } from "../runtime.js";

const DESCRIPTION = `Returns the current dckl project status as structured JSON.

Includes: active milestone (title + description, no dates), the issue you
currently have claimed (if any), and counts of issues by status (todo,
in-progress, review). All date fields are stripped — see the README's
"no calendar" manifest.

No input arguments.`;

export function registerStatusTool(server: McpServer, runtime: Runtime): void {
  server.tool("dckl_status", DESCRIPTION, async (_extra) => {
    try {
      const [client, repo, user] = await Promise.all([
        runtime.getClient(),
        runtime.getRepo(),
        runtime.getUser(),
      ]);
      const summary = await getStatusSummary(client, repo, user.login);
      return asMcpContent(ok(summary));
    } catch (err) {
      return asMcpContent(fromError(err));
    }
  });
}
