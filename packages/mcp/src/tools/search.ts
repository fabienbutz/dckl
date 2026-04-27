import { searchIssues } from "@dckl/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asMcpContent, fromError, ok } from "../envelope.js";
import type { Runtime } from "../runtime.js";

const DESCRIPTION = `Searches dckl issues by structured filters. Returns
references (number, title, labels, milestone), no bodies, no dates.

All filters are optional and AND-combined. Use \`text\` for free-text
matching across title and body, or \`file\` to find issues whose body
mentions a specific file path (typical for "## Context" sections).`;

export function registerSearchTool(server: McpServer, runtime: Runtime): void {
  server.tool(
    "dckl_search",
    DESCRIPTION,
    {
      status: z.enum(["todo", "in-progress", "review", "done"]).optional(),
      priority: z.enum(["must", "should", "could"]).optional(),
      type: z.enum(["feat", "bug", "chore", "refactor"]).optional(),
      milestone: z.number().int().positive().optional(),
      file: z.string().min(1).optional(),
      text: z.string().min(1).optional(),
      state: z.enum(["open", "closed", "all"]).optional(),
    },
    async (input, _extra) => {
      try {
        const [client, repo] = await Promise.all([runtime.getClient(), runtime.getRepo()]);
        const issues = await searchIssues(client, repo, input);
        return asMcpContent(ok({ count: issues.length, issues }));
      } catch (err) {
        return asMcpContent(fromError(err));
      }
    },
  );
}
