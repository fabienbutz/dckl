import { addCorrection } from "@dckl/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asMcpContent, fromError, ok } from "../envelope.js";
import type { Runtime } from "../runtime.js";

const DESCRIPTION = `Logs a correction on a dckl task as an issue comment
with the \`[correction]\` prefix. Use this BEFORE making a scoped change
that wasn't in the original task — git diff shows what, the correction
preserves why.`;

export function registerCorrectionAddTool(server: McpServer, runtime: Runtime): void {
  server.tool(
    "dckl_correction_add",
    DESCRIPTION,
    {
      issue_number: z.number().int().positive(),
      text: z.string().min(1),
    },
    async ({ issue_number, text }, _extra) => {
      try {
        const [client, repo] = await Promise.all([runtime.getClient(), runtime.getRepo()]);
        const result = await addCorrection(client, repo, issue_number, text);
        return asMcpContent(ok(result));
      } catch (err) {
        return asMcpContent(fromError(err));
      }
    },
  );
}
