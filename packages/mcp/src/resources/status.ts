import { getStatusSummary } from "@dckl/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Runtime } from "../runtime.js";

const URI = "dckl://status";

export function registerStatusResource(server: McpServer, runtime: Runtime): void {
  server.resource(
    "dckl-status",
    URI,
    {
      mimeType: "application/json",
      description:
        "Compact dckl project status: active milestone title + issue counts (todo / in-progress / review). No dates. ~300 tokens.",
    },
    async (uri) => {
      const payload = await loadStatus(runtime);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(payload),
          },
        ],
      };
    },
  );
}

async function loadStatus(runtime: Runtime): Promise<unknown> {
  try {
    const [client, repo, user] = await Promise.all([
      runtime.getClient(),
      runtime.getRepo(),
      runtime.getUser(),
    ]);
    const summary = await getStatusSummary(client, repo, user.login);
    return {
      activeMilestone: summary.activeMilestone
        ? { number: summary.activeMilestone.number, title: summary.activeMilestone.title }
        : null,
      activeIssue: summary.activeIssue
        ? { number: summary.activeIssue.number, title: summary.activeIssue.title }
        : null,
      counts: summary.counts,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}
