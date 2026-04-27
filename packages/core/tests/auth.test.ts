import { describe, expect, it } from "vitest";
import { type ShellRunner, resolveAuth } from "../src/auth.js";
import { AuthError } from "../src/errors.js";

const noopRunner: ShellRunner = async () => "should-not-run";

describe("resolveAuth", () => {
  it("returns GH_TOKEN when set", async () => {
    const token = await resolveAuth({
      env: { GH_TOKEN: "ghp_fromenv" },
      runner: noopRunner,
    });
    expect(token).toBe("ghp_fromenv");
  });

  it("returns GITHUB_TOKEN when GH_TOKEN is missing", async () => {
    const token = await resolveAuth({
      env: { GITHUB_TOKEN: "ghp_github_action" },
      runner: noopRunner,
    });
    expect(token).toBe("ghp_github_action");
  });

  it("trims whitespace from env tokens", async () => {
    const token = await resolveAuth({
      env: { GH_TOKEN: "  ghp_padded  \n" },
      runner: noopRunner,
    });
    expect(token).toBe("ghp_padded");
  });

  it("falls back to gh CLI when no env token is set", async () => {
    let called: { bin: string; args: string[] } | null = null;
    const runner: ShellRunner = async (bin, args) => {
      called = { bin, args };
      return "ghp_fromcli\n";
    };
    const token = await resolveAuth({ env: {}, runner });
    expect(token).toBe("ghp_fromcli");
    expect(called).toEqual({ bin: "gh", args: ["auth", "token"] });
  });

  it("treats empty env token as absent and falls through", async () => {
    const runner: ShellRunner = async () => "ghp_fallback";
    const token = await resolveAuth({ env: { GH_TOKEN: "  " }, runner });
    expect(token).toBe("ghp_fallback");
  });

  it("throws AuthError with hint when gh CLI fails", async () => {
    const runner: ShellRunner = async () => {
      throw new Error("gh: command not found");
    };
    await expect(resolveAuth({ env: {}, runner })).rejects.toBeInstanceOf(AuthError);
  });

  it("throws AuthError when gh CLI returns empty output", async () => {
    const runner: ShellRunner = async () => "  \n  ";
    await expect(resolveAuth({ env: {}, runner })).rejects.toBeInstanceOf(AuthError);
  });

  it("uses ghBinary override when provided", async () => {
    let bin = "";
    const runner: ShellRunner = async (b) => {
      bin = b;
      return "tok";
    };
    await resolveAuth({ env: {}, runner, ghBinary: "/opt/homebrew/bin/gh" });
    expect(bin).toBe("/opt/homebrew/bin/gh");
  });
});
