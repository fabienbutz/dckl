import { getActiveIssue } from "@dckl/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Runtime } from "../runtime.js";

const URI = "dckl://active";

export function registerActiveResource(server: McpServer, runtime: Runtime): void {
  server.resource(
    "dckl-active",
    URI,
    {
      mimeType: "application/json",
      description:
        "Currently claimed dckl task — issue number, title, milestone summary. null when nothing is claimed. ~50 tokens.",
    },
    async (uri) => {
      const payload = await loadActive(runtime);
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

interface ActivePayload {
  number: number;
  title: string;
  milestone: { number: number; title: string } | null;
}

async function loadActive(runtime: Runtime): Promise<ActivePayload | { error: string } | null> {
  try {
    const [client, repo, user] = await Promise.all([
      runtime.getClient(),
      runtime.getRepo(),
      runtime.getUser(),
    ]);
    const issue = await getActiveIssue(client, repo, user.login);
    if (!issue) return null;
    return {
      number: issue.number,
      title: issue.title,
      milestone: issue.milestone,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}
