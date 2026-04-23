import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  outDir: "dist",
  format: ["esm"],
  target: "node20",
  platform: "node",
  clean: true,
  sourcemap: true,
  dts: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
  splitting: false,
  shims: true,
  // Bundle workspace packages and ESM-native runtime deps. CJS deps
  // (commander, gray-matter, js-yaml, proper-lockfile) must stay external —
  // they use dynamic require() which cannot be inlined into ESM output.
  noExternal: ["@deckel/server", "hono", "@hono/node-server", "valibot"],
});
