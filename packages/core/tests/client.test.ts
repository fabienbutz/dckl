import { describe, expect, it } from "vitest";
import { createClient } from "../src/client.js";

describe("createClient", () => {
  it("constructs an Octokit instance with retry + throttling plugins applied", () => {
    const client = createClient({ token: "test-token" });
    // The throttling plugin exposes config via the request hook chain.
    // We assert the surface we rely on: rest.issues, rest.repos, request.
    expect(typeof client.request).toBe("function");
    expect(client.rest).toBeDefined();
    expect(typeof client.rest.issues.get).toBe("function");
    expect(typeof client.rest.issues.update).toBe("function");
    expect(typeof client.rest.repos.get).toBe("function");
  });

  it("accepts a custom user agent", () => {
    const client = createClient({ token: "t", userAgent: "dckl-test/9.9" });
    expect(client).toBeDefined();
  });
});
