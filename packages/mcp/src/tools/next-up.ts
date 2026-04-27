import { getNextUp } from "@dckl/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { asMcpContent, fromError, ok } from "../envelope.js";
import type { Runtime } from "../runtime.js";

const DESCRIPTION = `Returns the next dckl task you should consider
working on: the first \`status:todo\` issue in the active milestone whose
"## Depends on" references are all closed (or empty).

Suggestion only — does not claim. Returns null when nothing is
unblocked or the active milestone has no todos left.

No input arguments.`;

export function registerNextUpTool(server: McpServer, runtime: Runtime): void {
  server.tool("dckl_next_up", DESCRIPTION, async (_extra) => {
    try {
      const [client, repo, user] = await Promise.all([
        runtime.getClient(),
        runtime.getRepo(),
        runtime.getUser(),
      ]);
      const next = await getNextUp(client, repo, user.login);
      return asMcpContent(ok(next));
    } catch (err) {
      return asMcpContent(fromError(err));
    }
  });
}
