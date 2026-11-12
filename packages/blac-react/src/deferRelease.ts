import type {
  StateContainer,
  StateContainerConstructor,
  StateContainerRegistry,
} from '@blac/core';

// Flat (registry, Type, key, refId, instance) tuples, so a release allocates
// nothing.
let pending: unknown[] | null = null;

/**
 * Release a consumer's ref at the end of the current tick instead of now.
 *
 * React runs the unmount cleanups of a commit before the mount effects of
 * the same commit. Releasing in place would dispose an instance whose next
 * owner is about to claim it (two components swapping in one commit,
 * StrictMode's simulated remount), and that owner would get a fresh instance
 * with its state reset.
 */
export function deferRelease(
  registry: StateContainerRegistry,
  Type: StateContainerConstructor,
  key: string,
  refId: string,
  instance: StateContainer,
): void {
  if (pending === null) {
    pending = [];
    queueMicrotask(flush);
  }
  pending.push(registry, Type, key, refId, instance);
}

function flush(): void {
  const queue = pending;
  pending = null;
  if (queue === null) return;
  for (let i = 0; i < queue.length; i += 5) {
    // A disposed instance took its refs with it, and its key may already
    // hold a successor that the same consumer has claimed.
    if ((queue[i + 4] as StateContainer).$blac.disposed) continue;
    (queue[i] as StateContainerRegistry).release(
      queue[i + 1] as StateContainerConstructor,
      queue[i + 2] as string,
      false,
      queue[i + 3] as string,
    );
  }
}
