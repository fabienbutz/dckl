import { toggleCheck } from "@dckl/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asMcpContent, fromError, ok } from "../envelope.js";
import type { Runtime } from "../runtime.js";

const DESCRIPTION = `Toggles the first acceptance-criteria checkbox in
the issue body whose text contains \`pattern\` (case-insensitive
substring). Reads the body, modifies the matching \`- [ ]\` ↔ \`- [x]\`
line, then writes back. Aborts with \`CONCURRENT_MODIFICATION\` if the
body changed externally between read and write.`;

export function registerCheckToggleTool(server: McpServer, runtime: Runtime): void {
  server.tool(
    "dckl_check_toggle",
    DESCRIPTION,
    {
      issue_number: z.number().int().positive(),
      pattern: z.string().min(1),
    },
    async ({ issue_number, pattern }, _extra) => {
      try {
        const [client, repo] = await Promise.all([runtime.getClient(), runtime.getRepo()]);
        const result = await toggleCheck(client, repo, issue_number, pattern);
        return asMcpContent(ok(result));
      } catch (err) {
        return asMcpContent(fromError(err));
      }
    },
  );
}
