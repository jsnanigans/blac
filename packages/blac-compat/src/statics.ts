import { blac } from '@blac/core';
import type { StateContainerConstructor } from '@blac/core';

const applied = new WeakSet<StateContainerConstructor>();

/**
 * Honors v1's `static keepAlive` declaration on a bloc class when its first
 * instance is requested via the shim.
 *
 * - `static keepAlive = true` already works at the registry layer (the
 *   registry reads the static property directly), but we re-run the decorator
 *   to normalize any metadata path future versions might add.
 *
 * NOTE: `static isolated` and `autoInstance` were removed in v2. They are no
 * longer read or acted upon here. Per-mount isolation is achieved via
 * `useBloc(Bloc, { args: { _id: useId() } })` instead.
 *
 * Called from `Blac.getBloc` and the shim's `useBloc`. Idempotent per class.
 */
export function applyStaticConfig<T extends StateContainerConstructor>(
  Class: T,
): void {
  if (applied.has(Class)) return;
  applied.add(Class);
  if ((Class as { keepAlive?: boolean }).keepAlive === true) {
    blac({ keepAlive: true })(Class as unknown as new (...args: any[]) => any);
  }
}
