# @dckl/core

Pure GitHub Issues wrapper for dckl. Used by `@dckl/mcp` and `@dckl/cli`.

Responsibilities:

- Octokit factory with throttling + retry plugins
- Auth resolver (`GH_TOKEN` → `gh auth token` → fail)
- Repo detection (owner + name)
- Defensive issue body parser (sections + checkboxes + dependencies)
- Issue body builder (round-trip safe)
- Time-strip filter (date fields removed before reaching the agent)
- Optimistic concurrency wrapper for body edits
- ETag-aware in-memory cache for read-heavy ops

No transport layer, no UI. This package is a library, not a binary.
