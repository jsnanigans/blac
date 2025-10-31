// src/utils/equality.ts

/**
 * Deep equality check with circular reference handling
 */
export function deepEqual<T>(a: T, b: T, seen = new WeakMap()): boolean {
  if (a === b) return true;

  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;

  // Primitives
  if (typeof a !== 'object') {
    return a === b;
  }

  // Check for circular references
  if (seen.has(a)) {
    return seen.get(a) === b;
  }
  seen.set(a, b);

  // Arrays
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((val, idx) => deepEqual(val, b[idx], seen));
  }

  // Dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Sets
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }

  // Maps
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, val] of a) {
      if (!b.has(key)) return false;
      if (!deepEqual(val, b.get(key), seen)) return false;
    }
    return true;
  }

  // Regular objects
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  return keysA.every(
    (key) => keysB.includes(key) && deepEqual(objA[key], objB[key], seen),
  );
}

/**
 * Shallow equality check (more performant for simple cases)
 */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => (a as any)[key] === (b as any)[key]);
}
