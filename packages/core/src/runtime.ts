import { resolveAuth } from "./auth.js";
import { EtagCache } from "./cache.js";
import { type DcklOctokit, createClient } from "./client.js";
import { type CurrentUser, getCurrentUser } from "./ops.js";
import { detectRepo } from "./repo.js";
import type { RepoCoordinates } from "./types.js";

/**
 * Lazy-initialized handle to GitHub auth, repo coordinates, and the
 * authenticated user. Each accessor caches its first resolution for the
 * lifetime of the host process. Shared between `@dckl/mcp` (long-lived
 * STDIO server) and `@dckl/cli` (one-shot commands).
 */
export class Runtime {
  private clientPromise: Promise<DcklOctokit> | null = null;
  private repoPromise: Promise<RepoCoordinates> | null = null;
  private userPromise: Promise<CurrentUser> | null = null;
  public readonly cache = new EtagCache();

  async getClient(): Promise<DcklOctokit> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const token = await resolveAuth();
        return createClient({ token });
      })();
    }
    return this.clientPromise;
  }

  async getRepo(): Promise<RepoCoordinates> {
    if (!this.repoPromise) {
      this.repoPromise = detectRepo();
    }
    return this.repoPromise;
  }

  async getUser(): Promise<CurrentUser> {
    if (!this.userPromise) {
      this.userPromise = (async () => {
        const client = await this.getClient();
        return getCurrentUser(client);
      })();
    }
    return this.userPromise;
  }
}
