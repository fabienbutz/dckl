import { describe, expect, it } from "vitest";
import type { ShellRunner } from "../src/auth.js";
import { RepoNotFoundError } from "../src/errors.js";
import { detectRepo } from "../src/repo.js";

const fail: ShellRunner = async () => {
  throw new Error("not implemented in this test");
};

describe("detectRepo", () => {
  it("uses GH_REPO env var when set", async () => {
    const coords = await detectRepo({
      env: { GH_REPO: "octocat/hello-world" },
      runner: fail,
    });
    expect(coords).toEqual({ owner: "octocat", repo: "hello-world" });
  });

  it("ignores GH_REPO without slash and falls through", async () => {
    const runner: ShellRunner = async () => "octocat/from-cli";
    const coords = await detectRepo({
      env: { GH_REPO: "no-slash" },
      runner,
    });
    expect(coords).toEqual({ owner: "octocat", repo: "from-cli" });
  });

  it("uses gh CLI when env var is absent", async () => {
    const runner: ShellRunner = async (bin, args) => {
      if (bin === "gh" && args[0] === "repo") return "deckel/dckl\n";
      throw new Error("unexpected call");
    };
    const coords = await detectRepo({ env: {}, runner });
    expect(coords).toEqual({ owner: "deckel", repo: "dckl" });
  });

  it("falls back to git remote (SSH form)", async () => {
    const runner: ShellRunner = async (bin, args) => {
      if (bin === "gh") throw new Error("not authed");
      if (bin === "git" && args[0] === "remote") return "git@github.com:owner/proj.git\n";
      throw new Error("unexpected");
    };
    const coords = await detectRepo({ env: {}, runner });
    expect(coords).toEqual({ owner: "owner", repo: "proj" });
  });

  it("falls back to git remote (HTTPS form)", async () => {
    const runner: ShellRunner = async (bin) => {
      if (bin === "gh") throw new Error("not authed");
      if (bin === "git") return "https://github.com/owner/proj.git\n";
      throw new Error("unexpected");
    };
    const coords = await detectRepo({ env: {}, runner });
    expect(coords).toEqual({ owner: "owner", repo: "proj" });
  });

  it("strips trailing slashes from HTTPS remotes", async () => {
    const runner: ShellRunner = async (bin) => {
      if (bin === "gh") throw new Error();
      return "https://github.com/owner/proj/\n";
    };
    const coords = await detectRepo({ env: {}, runner });
    expect(coords).toEqual({ owner: "owner", repo: "proj" });
  });

  it("throws RepoNotFoundError when nothing matches", async () => {
    const runner: ShellRunner = async () => {
      throw new Error("no");
    };
    await expect(detectRepo({ env: {}, runner })).rejects.toBeInstanceOf(RepoNotFoundError);
  });

  it("throws RepoNotFoundError when remote is non-GitHub", async () => {
    const runner: ShellRunner = async (bin) => {
      if (bin === "gh") throw new Error();
      return "git@gitlab.com:owner/proj.git";
    };
    await expect(detectRepo({ env: {}, runner })).rejects.toBeInstanceOf(RepoNotFoundError);
  });
});
