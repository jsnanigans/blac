// src/utils/immutable.ts

/**
 * Deep clone with circular reference handling
 */
export function cloneDeep<T>(obj: T, cloned = new WeakMap()): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Check if already cloned (circular reference)
  if (cloned.has(obj)) {
    return cloned.get(obj);
  }

  let clone: any;

  if (obj instanceof Date) {
    clone = new Date(obj.getTime());
  } else if (obj instanceof Array) {
    clone = [];
    cloned.set(obj, clone);
    clone.push(...obj.map((item) => cloneDeep(item, cloned)));
  } else if (obj instanceof Set) {
    clone = new Set();
    cloned.set(obj, clone);
    obj.forEach((value) => clone.add(cloneDeep(value, cloned)));
  } else if (obj instanceof Map) {
    clone = new Map();
    cloned.set(obj, clone);
    obj.forEach((value, key) => {
      clone.set(cloneDeep(key, cloned), cloneDeep(value, cloned));
    });
  } else {
    // Regular object
    clone = Object.create(Object.getPrototypeOf(obj));
    cloned.set(obj, clone);

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clone[key] = cloneDeep(obj[key], cloned);
      }
    }
  }

  return clone;
}

/**
 * Deep freeze with circular reference handling
 *
 * Note: Currently disabled by default for proxy tracking compatibility.
 * Proxies cannot intercept property access on frozen objects due to proxy invariants.
 *
 * @param obj - Object to freeze
 * @param frozen - WeakSet for tracking circular references
 * @param enabled - Whether to actually freeze (default: false for proxy compatibility)
 */
export function deepFreeze<T>(
  obj: T,
  frozen = new WeakSet(),
  enabled = false,
): T {
  // Skip freezing if disabled (for proxy tracking compatibility)
  if (!enabled) return obj;

  if (typeof obj !== 'object' || obj === null) return obj;

  // Skip if already frozen or in process
  if (Object.isFrozen(obj) || frozen.has(obj)) return obj;

  frozen.add(obj);
  Object.freeze(obj);

  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const propValue = (obj as any)[prop];
    if (typeof propValue === 'object' && propValue !== null) {
      deepFreeze(propValue, frozen, enabled);
    }
  });

  return obj;
}
