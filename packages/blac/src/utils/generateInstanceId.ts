/**
 * Generates a deterministic instance ID from static props by extracting primitive values
 *
 * Rules:
 * 1. Only considers primitive types: string, number, boolean, null, undefined
 * 2. Ignores complex types: objects, arrays, functions, symbols
 * 3. Sorts keys alphabetically for deterministic output
 * 4. Returns undefined if no primitives found (caller should use default ID)
 */
export function generateInstanceIdFromProps(
  props: unknown,
): string | undefined {
  if (!props || typeof props !== 'object') {
    return undefined;
  }

  const primitives: Array<[string, unknown]> = [];

  // Extract primitive values
  for (const [key, value] of Object.entries(props)) {
    const type = typeof value;
    if (
      type === 'string' ||
      type === 'number' ||
      type === 'boolean' ||
      value === null ||
      value === undefined
    ) {
      primitives.push([key, value]);
    }
  }

  // No primitives found
  if (primitives.length === 0) {
    return undefined;
  }

  // Sort by key for deterministic output
  primitives.sort(([a], [b]) => a.localeCompare(b));

  // Create instance ID
  const parts: string[] = [];
  for (const [key, value] of primitives) {
    if (value === null) {
      parts.push(`${key}:null`);
    } else if (value === undefined) {
      parts.push(`${key}:undefined`);
    } else {
      parts.push(`${key}:${String(value)}`);
    }
  }

  return parts.join('|');
}
