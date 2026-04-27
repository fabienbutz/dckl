import { getSessionResume } from "@dckl/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { asMcpContent, fromError, ok } from "../envelope.js";
import type { Runtime } from "../runtime.js";

const DESCRIPTION = `Single-call session restore for the active dckl task.

Returns: the active issue (with parsed body sections), open correction
comments, and the still-unfinished acceptance criteria. Use this at the
start of a working session to rebuild context in one round-trip instead
of fetching status, body, and comments separately.

If nothing is claimed, fields are null/empty.

No input arguments.`;

export function registerSessionResumeTool(server: McpServer, runtime: Runtime): void {
  server.tool("dckl_session_resume", DESCRIPTION, async (_extra) => {
    try {
      const [client, repo, user] = await Promise.all([
        runtime.getClient(),
        runtime.getRepo(),
        runtime.getUser(),
      ]);
      const data = await getSessionResume(client, repo, user.login);
      return asMcpContent(ok(data));
    } catch (err) {
      return asMcpContent(fromError(err));
    }
  });
}
