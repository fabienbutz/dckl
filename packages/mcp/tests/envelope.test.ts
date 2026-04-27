import { AuthError } from "@dckl/core";
import { describe, expect, it } from "vitest";
import { asMcpContent, fail, fromError, ok } from "../src/envelope.js";

describe("envelope", () => {
  it("ok wraps data", () => {
    expect(ok({ x: 1 })).toEqual({ ok: true, data: { x: 1 } });
  });

  it("ok includes warnings only when non-empty", () => {
    expect(ok("v")).toEqual({ ok: true, data: "v" });
    expect(ok("v", [])).toEqual({ ok: true, data: "v" });
    expect(ok("v", ["a"])).toEqual({ ok: true, data: "v", warnings: ["a"] });
  });

  it("fail builds an error envelope, omitting hint when undefined", () => {
    expect(fail("X", "msg")).toEqual({ ok: false, code: "X", message: "msg" });
    expect(fail("X", "msg", "do this")).toEqual({
      ok: false,
      code: "X",
      message: "msg",
      hint: "do this",
    });
  });

  it("fromError preserves DcklError code + hint", () => {
    const err = new AuthError("nope", "set token");
    expect(fromError(err)).toEqual({
      ok: false,
      code: "AUTH_FAILED",
      message: "nope",
      hint: "set token",
    });
  });

  it("fromError maps generic Error to UNEXPECTED", () => {
    expect(fromError(new Error("boom"))).toEqual({
      ok: false,
      code: "UNEXPECTED",
      message: "boom",
    });
  });

  it("fromError stringifies non-Error throwables", () => {
    expect(fromError("oops")).toEqual({ ok: false, code: "UNEXPECTED", message: "oops" });
  });

  it("asMcpContent serializes to MCP text content with isError flag", () => {
    const success = asMcpContent(ok({ a: 1 }));
    expect(success.isError).toBe(false);
    expect(success.content[0]?.type).toBe("text");
    expect(JSON.parse(success.content[0]?.text ?? "")).toEqual({ ok: true, data: { a: 1 } });

    const failure = asMcpContent(fail("X", "msg"));
    expect(failure.isError).toBe(true);
  });
});
