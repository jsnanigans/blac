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
 * parsePath('user.name') // ['user', 'name']
 * parsePath('items[0].name') // ['items', '0', 'name']
 * parsePath('data.users[2].address.city') // ['data', 'users', '2', 'address', 'city']
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
 * Get a value from an object using a path of segments
 *
 * @example
 * const obj = { user: { name: 'Alice', age: 30 } }
 * getValueAtPath(obj, ['user', 'name']) // 'Alice'
 * getValueAtPath(obj, ['user', 'age']) // 30
 * getValueAtPath(obj, ['user', 'missing']) // undefined
 *
 * @internal
 */
export function getValueAtPath(obj: any, segments: string[]): any {
  if (obj == null) return undefined;

  let current = obj;
  for (let i = 0; i < segments.length; i++) {
    current = current[segments[i]];
    if (current == null) return undefined;
  }
  return current;
}

/**
 * Shallow equality comparison for arrays
 *
 * Compares two arrays element-by-element using Object.is
 *
 * @example
 * shallowEqual([1, 2, 3], [1, 2, 3]) // true
 * shallowEqual([1, 2, 3], [1, 2, 4]) // false
 * shallowEqual([1, 2], [1, 2, 3]) // false
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
