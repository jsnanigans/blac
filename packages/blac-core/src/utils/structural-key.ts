/**
 * Deterministic, order-independent hash of serializable args.
 * Sorts object keys so {a,b} === {b,a}.
 * Throws (dev) if it encounters a function or non-plain object — those belong in `deps`.
 */

export const DEFAULT_STRUCTURAL_KEY = 'default';

/**
 * Produce a stable string key for serializable args.
 * - `undefined` / `void` args → `'default'` sentinel (no-args blocs stay on the default key).
 * - Object keys are sorted for order-independence.
 * - Arrays keep their insertion order.
 * - Functions throw — they must be passed via `deps`, not `args`.
 * - Object args are memoized by identity; callers on hot paths (`resolveKey`,
 *   `depend`) re-resolve the same args object on every call.
 */
const keyCache = new WeakMap<object, string>();

export function structuralKey(args: unknown): string {
  if (args === undefined || args === null) {
    return DEFAULT_STRUCTURAL_KEY;
  }

  if (typeof args === 'object') {
    const cached = keyCache.get(args);
    if (cached !== undefined) return cached;
    const key = serialize(args);
    keyCache.set(args, key);
    return key;
  }

  return serialize(args);
}

function serialize(args: unknown): string {
  return JSON.stringify(args, function (_k, v) {
    if (typeof v === 'function') {
      throw new Error(
        `[blac] args must be serializable; put refs/callbacks in \`deps\` ` +
          `(found a function at key "${_k || '(root)'}")`,
      );
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.keys(v)
        .sort()
        .reduce(
          (o, k) => {
            (o as any)[k] = (v as any)[k];
            return o;
          },
          {} as Record<string, unknown>,
        );
    }
    return v;
  });
}
