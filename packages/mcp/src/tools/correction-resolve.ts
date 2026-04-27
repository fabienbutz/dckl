import { resolveCorrection } from "@dckl/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asMcpContent, fromError, ok } from "../envelope.js";
import type { Runtime } from "../runtime.js";

const DESCRIPTION = `Marks a previously-logged correction comment as
resolved by editing it to begin with \`[resolved]\`.

Result envelope reasons:
- \`resolved\`           — comment edited successfully.
- \`not-correction\`     — comment exists but is not a \`[correction]\`.
- \`already-resolved\`   — comment is already prefixed with \`[resolved]\`.
- \`not-found\`          — comment does not exist.`;

export function registerCorrectionResolveTool(server: McpServer, runtime: Runtime): void {
  server.tool(
    "dckl_correction_resolve",
    DESCRIPTION,
    { comment_id: z.number().int().positive() },
    async ({ comment_id }, _extra) => {
      try {
        const [client, repo] = await Promise.all([runtime.getClient(), runtime.getRepo()]);
        const result = await resolveCorrection(client, repo, comment_id);
        return asMcpContent(ok(result));
      } catch (err) {
        return asMcpContent(fromError(err));
      }
    },
  );
}
