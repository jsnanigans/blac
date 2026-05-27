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
 */
export function structuralKey(args: unknown): string {
  if (args === undefined || args === null) {
    return DEFAULT_STRUCTURAL_KEY;
  }

  return JSON.stringify(args, function (_k, v) {
    if (typeof v === 'function') {
      throw new Error(
        '[blac] args must be serializable; put refs/callbacks in `deps`',
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
