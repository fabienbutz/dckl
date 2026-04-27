import { ConcurrentModificationError } from "./errors.js";

export interface OptimisticEditOptions<TState> {
  read: () => Promise<TState>;
  modify: (state: TState) => TState;
  write: (next: TState) => Promise<void>;
  /** Compare two read results. Default: deep-equal via JSON. */
  equals?: (a: TState, b: TState) => boolean;
  /** Number of additional attempts after the first. Default: 1. */
  maxRetries?: number;
}

const defaultEquals = <T>(a: T, b: T): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * Optimistic-concurrency wrapper for body-style writes against an API that
 * does not support `If-Match`. Pattern:
 *
 *   1. read original
 *   2. modify → next
 *   3. re-read, verify nobody else wrote in between
 *   4. write next
 *
 * Retries on detected concurrent modification. Throws
 * `ConcurrentModificationError` once retries are exhausted.
 */
export async function optimisticEdit<TState>(
  options: OptimisticEditOptions<TState>,
): Promise<TState> {
  const { read, modify, write } = options;
  const equals = options.equals ?? defaultEquals;
  const maxRetries = options.maxRetries ?? 1;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const original = await read();
    const next = modify(original);
    const verify = await read();
    if (!equals(original, verify)) {
      // Concurrent write detected — retry.
      continue;
    }
    await write(next);
    return next;
  }

  throw new ConcurrentModificationError(
    "Resource was modified concurrently and could not be reconciled.",
    "Re-read and try again, or pull and re-apply your change.",
  );
}
