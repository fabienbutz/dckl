import { createTask } from "@dckl/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asMcpContent, fromError, ok } from "../envelope.js";
import type { Runtime } from "../runtime.js";

const DESCRIPTION = `Creates a new dckl task as a GitHub issue.
The body is generated from structured input following the dckl
schema (## Worum es geht / ## Warum jetzt / ## Woran man merkt /
## Context / ## Depends on). Labels are set automatically:
\`status:todo\`, \`priority:<priority>\`, \`type:<type>\`.

Title rule: imperative, ≤ 80 characters. The dckl skill enforces ≤ 60;
this tool is more permissive but stricter would be friendlier.`;

export function registerTaskCreateTool(server: McpServer, runtime: Runtime): void {
  server.tool(
    "dckl_task_create",
    DESCRIPTION,
    {
      title: z.string().min(1).max(80),
      type: z.enum(["feat", "bug", "chore", "refactor"]),
      priority: z.enum(["must", "should", "could"]),
      milestone: z.number().int().positive().optional(),
      worum_es_geht: z.string().min(1),
      warum_jetzt: z.string().min(1),
      acceptance_criteria: z.array(z.string().min(1)).min(1),
      context_files: z.array(z.string().min(1)).optional(),
      depends_on: z.array(z.number().int().positive()).optional(),
      out_of_scope: z.string().optional(),
    },
    async (args, _extra) => {
      try {
        const [client, repo] = await Promise.all([runtime.getClient(), runtime.getRepo()]);
        const result = await createTask(client, repo, {
          title: args.title,
          type: args.type,
          priority: args.priority,
          ...(args.milestone !== undefined ? { milestone: args.milestone } : {}),
          worumEsGeht: args.worum_es_geht,
          warumJetzt: args.warum_jetzt,
          acceptanceCriteria: args.acceptance_criteria,
          ...(args.context_files !== undefined ? { contextFiles: args.context_files } : {}),
          ...(args.depends_on !== undefined ? { dependsOn: args.depends_on } : {}),
          ...(args.out_of_scope !== undefined ? { outOfScope: args.out_of_scope } : {}),
        });
        return asMcpContent(ok(result));
      } catch (err) {
        return asMcpContent(fromError(err));
      }
    },
  );
}
