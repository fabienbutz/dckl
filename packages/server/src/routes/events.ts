import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { EventBus } from "../events/bus.js";

export function eventRoutes(bus: EventBus): Hono {
  const app = new Hono();

  // Server-Sent Events stream. Unguarded by CSRF (read-only; GET only).
  // EventSource cannot set custom headers anyway — token check does not
  // apply. Events carry only (kind, id) tuples, no task body content, so
  // a casual snoop on localhost learns nothing they couldn't get from
  // git log.
  app.get("/", (c) => {
    return streamSSE(c, async (stream) => {
      const unsubscribe = bus.subscribe((event) => {
        stream.writeSSE({
          event: event.kind,
          data: JSON.stringify(event),
        });
      });

      // Keep-alive ping every 25s so proxies don't kill the connection.
      const ping = setInterval(() => {
        stream.writeSSE({ event: "ping", data: "" }).catch(() => {});
      }, 25_000);

      // Initial hello so the client knows the stream opened.
      await stream.writeSSE({
        event: "hello",
        data: JSON.stringify({ at: new Date().toISOString() }),
      });

      await stream.sleep(365 * 24 * 60 * 60 * 1000);
      clearInterval(ping);
      unsubscribe();
    });
  });

  return app;
}
