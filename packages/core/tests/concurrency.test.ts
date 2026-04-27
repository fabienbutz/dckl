import { describe, expect, it } from "vitest";
import { optimisticEdit } from "../src/concurrency.js";
import { ConcurrentModificationError } from "../src/errors.js";

interface Box {
  body: string;
  version: number;
}

function makeStore(initial: Box): {
  read: () => Promise<Box>;
  write: (b: Box) => Promise<void>;
  externalWrite: (body: string) => void;
  current: () => Box;
} {
  let state: Box = { ...initial };
  return {
    read: async () => ({ ...state }),
    write: async (b: Box) => {
      state = { ...b, version: state.version + 1 };
    },
    externalWrite: (body: string) => {
      state = { body, version: state.version + 1 };
    },
    current: () => ({ ...state }),
  };
}

describe("optimisticEdit", () => {
  it("performs a happy-path read-modify-write", async () => {
    const store = makeStore({ body: "original", version: 0 });
    const result = await optimisticEdit({
      read: store.read,
      modify: (b) => ({ ...b, body: `${b.body}!` }),
      write: store.write,
    });
    expect(result.body).toBe("original!");
    expect(store.current().body).toBe("original!");
    expect(store.current().version).toBe(1);
  });

  it("retries when verify-read detects a concurrent write between read and modify", async () => {
    const store = makeStore({ body: "v0", version: 0 });
    let firstRead = true;
    const read = async () => {
      if (firstRead) {
        firstRead = false;
        // Simulate concurrent external write between our read and verify-read
        store.externalWrite("racer");
      }
      return store.read();
    };
    const result = await optimisticEdit({
      read,
      modify: (b) => ({ ...b, body: `${b.body}+ours` }),
      write: store.write,
      maxRetries: 2,
    });
    expect(result.body).toBe("racer+ours");
  });

  it("throws ConcurrentModificationError after exhausting retries", async () => {
    const store = makeStore({ body: "v0", version: 0 });
    const read = async () => {
      // Every verify read sees a different state -> permanent conflict
      store.externalWrite("changing");
      return store.read();
    };
    await expect(
      optimisticEdit({
        read,
        modify: (b) => b,
        write: store.write,
        maxRetries: 2,
      }),
    ).rejects.toBeInstanceOf(ConcurrentModificationError);
  });

  it("uses custom equals when provided", async () => {
    const store = makeStore({ body: "x", version: 0 });
    let writes = 0;
    const result = await optimisticEdit({
      read: store.read,
      modify: (b) => ({ ...b, body: "y" }),
      write: async (b) => {
        writes++;
        await store.write(b);
      },
      equals: () => true, // always equal -> never retry
    });
    expect(writes).toBe(1);
    expect(result.body).toBe("y");
  });
});
