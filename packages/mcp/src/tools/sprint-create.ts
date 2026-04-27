import { createSprint } from "@dckl/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asMcpContent, fromError, ok } from "../envelope.js";
import type { Runtime } from "../runtime.js";

const DESCRIPTION = `Creates a new dckl sprint as a GitHub milestone.
Name must be ≤ 30 characters (the dckl convention — long names
truncate badly in any UI). Description is the one-sentence goal.

\`due_on\` is intentionally never set: dckl is calendar-free.`;

export function registerSprintCreateTool(server: McpServer, runtime: Runtime): void {
  server.tool(
    "dckl_sprint_create",
    DESCRIPTION,
    {
      name: z.string().min(1).max(30),
      description: z.string().min(1),
    },
    async ({ name, description }, _extra) => {
      try {
        const [client, repo] = await Promise.all([runtime.getClient(), runtime.getRepo()]);
        const result = await createSprint(client, repo, name, description);
        return asMcpContent(ok(result));
      } catch (err) {
        return asMcpContent(fromError(err));
      }
    },
  );
}
