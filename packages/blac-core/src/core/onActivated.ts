import { ON_ACTIVATED } from './symbols';
import type { StateContainer } from './StateContainer';

/**
 * Run `handler` each time `container` goes from unowned to owned, and now if it
 * is already owned. `signal` aborts on the matching deactivation and on
 * dispose. Returns an unsubscribe function.
 *
 * Unlike the protected `onActivate`, this can be called from a field
 * initializer or a helper that receives the container.
 */
export function onActivated(
  container: StateContainer<any, any, any>,
  handler: (signal: AbortSignal) => void,
): () => void {
  return container[ON_ACTIVATED](handler);
}
