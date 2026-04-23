import { Hono } from "hono";
import * as v from "valibot";
import { JourneyMeta, JourneyStep } from "../schema/index.js";
import { EtagMismatch } from "../storage/fs-adapter.js";
import type { Store } from "../storage/store.js";
import { StoreError } from "../storage/store.js";

const CreatePayload = v.object({
  id: v.pipe(
    v.string(),
    v.minLength(1),
    v.maxLength(64),
    v.regex(/^[a-z0-9][a-z0-9-_]*$/i, "id must be a slug"),
  ),
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.optional(v.string()),
  steps: v.optional(v.array(JourneyStep)),
});

const PatchPayload = v.partial(JourneyMeta);

export function journeyRoutes(store: Store): Hono {
  const app = new Hono();

  app.get("/", async (c) => {
    const journeys = await store.listJourneys();
    return c.json({ journeys });
  });

  app.get("/:id", async (c) => {
    try {
      const { journey, etag } = await store.getJourney(c.req.param("id"));
      c.header("ETag", etag);
      return c.json(journey);
    } catch (err) {
      if (err instanceof StoreError && err.code === "NOT_FOUND") {
        return c.json({ error: err.message }, 404);
      }
      throw err;
    }
  });

  app.post("/", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid JSON body" }, 400);
    }
    const parsed = v.safeParse(CreatePayload, body);
    if (!parsed.success) {
      return c.json({ error: "invalid payload", issues: parsed.issues }, 422);
    }
    try {
      const { journey, etag } = await store.createJourney(parsed.output);
      c.header("ETag", etag);
      return c.json(journey, 201);
    } catch (err) {
      if (err instanceof StoreError && err.code === "CONFLICT") {
        return c.json({ error: err.message }, 409);
      }
      throw err;
    }
  });

  app.patch("/:id", async (c) => {
    const ifMatch = c.req.header("If-Match");
    if (!ifMatch) {
      return c.json(
        { error: "If-Match header required — read the journey first to obtain its ETag" },
        428,
      );
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid JSON body" }, 400);
    }
    const parsed = v.safeParse(PatchPayload, body);
    if (!parsed.success) {
      return c.json({ error: "invalid payload", issues: parsed.issues }, 422);
    }
    try {
      const { journey, etag } = await store.patchJourney(
        c.req.param("id"),
        parsed.output,
        ifMatch,
      );
      c.header("ETag", etag);
      return c.json(journey);
    } catch (err) {
      if (err instanceof EtagMismatch) {
        return c.json(
          { error: "etag mismatch — journey was modified, re-read before patching" },
          409,
        );
      }
      if (err instanceof StoreError && err.code === "NOT_FOUND") {
        return c.json({ error: err.message }, 404);
      }
      throw err;
    }
  });

  return app;
}
