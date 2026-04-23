import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    sourcemap: true,
  },
  server: {
    port: 5173,
    // Dev-only proxy. When running `pnpm dev`, Vite serves the React app on
    // :5173 with hot-reload, but our API (including SSE at /api/events) lives
    // on the dckl CLI server. Forward every /api/* request to whichever
    // port dckl is listening on — defaults to 4321.
    proxy: {
      "/api": {
        target: "http://localhost:4321",
        changeOrigin: true,
        // Pass-through for SSE: http-proxy's default is to stream, but some
        // intermediate buffering can delay events. Explicit `selfHandleResponse:
        // false` (the default) keeps the stream flowing.
        ws: false,
      },
    },
  },
});
