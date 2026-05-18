import { blac } from '@blac/core';
import type { StateContainerConstructor } from '@blac/core';

const applied = new WeakSet<StateContainerConstructor>();

/**
 * Honors v1's `static keepAlive` / `static isolated` declarations on a bloc
 * class when its first instance is requested via the shim.
 *
 * - `static keepAlive = true` already works at the registry layer (E2 reads
 *   the static property directly), but we re-run the decorator to normalize
 *   any metadata path future versions might add.
 * - `static isolated = true` is consumed by `@blac/react`'s `useBloc` (E3);
 *   nothing extra is needed here.
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
