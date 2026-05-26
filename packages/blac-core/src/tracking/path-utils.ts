/**
 * Path utilities for dependency tracking
 *
 * Provides utilities for parsing property paths and extracting values
 * from nested objects using path strings.
 *
 * @internal
 */

/**
 * Parse a property path string into an array of segments
 *
 * @internal
 *
 * Handles both dot notation (a.b.c) and bracket notation (a[0].b)
 *
 * @example
 * ```ts
 * parsePath('user.name') // ['user', 'name']
 * parsePath('items[0].name') // ['items', '0', 'name']
 * parsePath('data.users[2].address.city') // ['data', 'users', '2', 'address', 'city']
 * ```
 */
export function parsePath(path: string): string[] {
  const segments: string[] = [];
  let current = '';
  let i = 0;

  while (i < path.length) {
    const char = path[i];
    if (char === '.') {
      if (current) segments.push(current);
      current = '';
    } else if (char === '[') {
      if (current) segments.push(current);
      current = '';
      // Skip bracket
      i++;
      // Read until ]
      while (i < path.length && path[i] !== ']') {
        current += path[i++];
      }
      if (current) segments.push(current);
      current = '';
    } else {
      current += char;
    }
    i++;
  }

  if (current) segments.push(current);
  return segments;
}

/**
 * Sentinel value returned by `getValueAtPath` when the path cannot be fully
 * walked because an intermediate segment is null or undefined. This is
 * distinct from `undefined`, which is a legitimate leaf value.
 *
 * @internal
 */
const MISSING = Symbol('missing');
export { MISSING as PATH_MISSING };

/**
 * Get a value from an object using a path of segments
 *
 * Returns `PATH_MISSING` (not `undefined`) when the path cannot be walked
 * because an intermediate parent is null or undefined. This lets callers
 * distinguish "the leaf is explicitly `undefined`" from "the path is broken".
 *
 * @example
 * ```ts
 * const obj = { user: { name: 'Alice', age: 30 } }
 * getValueAtPath(obj, ['user', 'name']) // 'Alice'
 * getValueAtPath(obj, ['user', 'age']) // 30
 * getValueAtPath(obj, ['user', 'missing']) // undefined
 * getValueAtPath({ a: null }, ['a', 'b']) // PATH_MISSING
 * ```
 *
 * @internal
 */
export function getValueAtPath(obj: unknown, segments: string[]): unknown {
  let current: unknown = obj;
  for (let i = 0; i < segments.length; i++) {
    if (current === null || current === undefined) {
      // Asked to descend into a nullish value. Return MISSING so that
      // hasDependencyChanges can distinguish this from a real `undefined` leaf.
      return MISSING;
    }
    current = (current as Record<string, unknown>)[segments[i]];
  }
  return current;
}

/**
 * Shallow equality comparison for arrays
 *
 * Compares two arrays element-by-element using Object.is
 *
 * @example
 * ```ts
 * shallowEqual([1, 2, 3], [1, 2, 3]) // true
 * shallowEqual([1, 2, 3], [1, 2, 4]) // false
 * shallowEqual([1, 2], [1, 2, 3]) // false
 * ```
 *
 * @internal
 */
export function shallowEqual(arr1: unknown[], arr2: unknown[]): boolean {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (!Object.is(arr1[i], arr2[i])) return false;
  }
  return true;
}
