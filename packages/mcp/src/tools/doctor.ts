import { runDoctor } from "@dckl/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { asMcpContent, fromError, ok } from "../envelope.js";
import type { Runtime } from "../runtime.js";

const DESCRIPTION = `Audits the repo for dckl-schema drift. Checks:

1. \`claim_no_assignee\`     — \`status:in-progress\` label without assignee.
2. \`assignee_no_status\`    — assignees without a \`status:*\` label.
3. \`no_milestone\`          — open issues without a milestone (backlog).
4. \`body_schema_invalid\`   — issue body missing required sections.
5. \`deps_clear_but_todo\`   — all dependencies closed but issue still \`status:todo\`.
6. \`milestone_has_date\`    — milestone has a \`due_on\` (dckl ignores it).
7. \`non_dckl_label\`        — \`status:* | priority:* | type:*\` labels not in the dckl convention.

Returns a list of warnings plus counts of issues and milestones checked.
Read-only; never mutates state.`;

export function registerDoctorTool(server: McpServer, runtime: Runtime): void {
  server.tool("dckl_doctor", DESCRIPTION, async (_extra) => {
    try {
      const [client, repo] = await Promise.all([runtime.getClient(), runtime.getRepo()]);
      const report = await runDoctor(client, repo);
      return asMcpContent(ok(report));
    } catch (err) {
      return asMcpContent(fromError(err));
    }
  });
}
