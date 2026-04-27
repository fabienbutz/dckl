# @dckl/mcp

MCP server for dckl. A discipline layer over GitHub Issues with a
temporal-sterile filter — date fields are scrubbed before any payload
reaches the agent.

Distributed via npm; consumed by Claude Code via `.mcp.json`:

```json
{
  "mcpServers": {
    "dckl": {
      "command": "npx",
      "args": ["-y", "@dckl/mcp@latest"]
    }
  }
}
```

Set `GH_TOKEN` (or run `gh auth login`) and run from inside a GitHub
repo.

See the root [README](../../README.md) for the manifest and
[TODOS.md](../../TODOS.md) for the roadmap.
