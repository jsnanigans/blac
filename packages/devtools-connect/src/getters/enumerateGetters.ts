import { safeSerialize } from '../serialization/serialize';
import type { GetterInfo } from '../types';

const BASE_GETTERS = new Set([
  'state',
  'dependencies',
  // `deps` is the NON-serializable lane by design — it holds DOM refs,
  // callbacks, and controllers. Evaluating + serializing it would drag a live
  // DOM node (and, via React's `__reactFiber$` expando, the entire fiber tree)
  // through the serializer and freeze the tab. Never touch it.
  'deps',
  'isDisposed',
  'hydrationStatus',
  'hydrationError',
  'isHydrated',
  'changedWhileHydrating',
]);

// Reentrancy guard to prevent infinite loops when evaluating getters
// triggers state changes on other blocs
let enumerating = false;

/**
 * Collect all user-defined getter names from the prototype chain,
 * stopping before the base StateContainer prototype.
 */
function collectGetterDescriptors(
  instance: any,
): Map<string, PropertyDescriptor> {
  const getters = new Map<string, PropertyDescriptor>();
  let proto = Object.getPrototypeOf(instance);

  while (proto && proto !== Object.prototype) {
    const descriptors = Object.getOwnPropertyDescriptors(proto);
    for (const [name, desc] of Object.entries(descriptors)) {
      if (desc.get && !BASE_GETTERS.has(name) && !getters.has(name)) {
        getters.set(name, desc);
      }
    }

    proto = Object.getPrototypeOf(proto);
  }

  return getters;
}

/**
 * Enumerate all user-defined getters on a StateContainer instance.
 * Evaluates each getter and serializes the result.
 */
export function enumerateGetters(
  instance: any,
): Record<string, GetterInfo> | undefined {
  // Reentrancy guard: if evaluating a getter triggers a state change on
  // another bloc, that bloc's onStateChanged will call enumerateGetters
  // again. Skip nested calls to break the cycle.
  if (enumerating) return undefined;

  const getterDescriptors = collectGetterDescriptors(instance);
  if (getterDescriptors.size === 0) return undefined;

  enumerating = true;
  try {
    const result: Record<string, GetterInfo> = {};

    for (const [name, descriptor] of getterDescriptors) {
      try {
        const rawValue = descriptor.get?.call(instance);
        const serialized = safeSerialize(rawValue);

        result[name] = {
          value: serialized.success ? serialized.data : String(rawValue),
        };
      } catch (err) {
        result[name] = {
          value: undefined,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    return result;
  } finally {
    enumerating = false;
  }
}
