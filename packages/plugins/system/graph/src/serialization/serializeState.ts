/**
 * Configuration options for state serialization
 */
export interface SerializationConfig {
  /** Maximum depth for nested objects (default: 2) */
  maxDepth: number;
  /** Maximum string length before truncation (default: 100) */
  maxStringLength: number;
}

/**
 * Result of state serialization
 */
export interface SerializedState {
  /** Truncated value for display in nodes */
  displayValue: string;
  /** Full JSON string for tooltips */
  fullValue: string;
}

/**
 * Serializes a state value with circular reference handling and depth limiting
 *
 * @param value - The state value to serialize
 * @param config - Serialization configuration
 * @returns Object containing display and full values
 */
export function serializeState(
  value: unknown,
  config: SerializationConfig
): SerializedState {
  const full = serializeWithCircularRefs(value, config.maxDepth);
  const display = truncate(full, config.maxStringLength);

  return {
    displayValue: display,
    fullValue: full,
  };
}

/**
 * Serializes a value to JSON with circular reference detection and special type handling
 *
 * @param value - Value to serialize
 * @param maxDepth - Maximum nesting depth
 * @returns JSON string representation
 */
function serializeWithCircularRefs(value: unknown, maxDepth: number): string {
  const seen = new WeakSet<object>();
  const depthMap = new Map<object, number>();

  function replacer(this: unknown, key: string, val: unknown): unknown {
    // Handle circular references
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) {
        return '[Circular]';
      }
      seen.add(val);

      // Track depth
      const depth = key ? (depthMap.get(this as object) || 0) + 1 : 0;
      depthMap.set(val, depth);

      if (depth > maxDepth) {
        return '[Max Depth]';
      }
    }

    // Handle special types
    if (val instanceof Date) {
      return `[Date: ${val.toISOString()}]`;
    }
    if (val instanceof Map) {
      return `[Map: ${val.size} entries]`;
    }
    if (val instanceof Set) {
      return `[Set: ${val.size} items]`;
    }
    if (val instanceof RegExp) {
      return `[RegExp: ${val.toString()}]`;
    }
    if (val instanceof Error) {
      return `[Error: ${val.message}]`;
    }
    if (val instanceof URL) {
      return `[URL: ${val.href}]`;
    }
    if (typeof val === 'function') {
      return `[Function: ${val.name || 'anonymous'}]`;
    }
    if (typeof val === 'bigint') {
      return `[BigInt: ${val.toString()}]`;
    }
    if (typeof val === 'symbol') {
      return val.toString();
    }
    if (val === undefined) {
      return '[undefined]';
    }

    return val;
  }

  try {
    return JSON.stringify(value, replacer, 2);
  } catch (error) {
    return `[Serialization Error: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

/**
 * Truncates a string to a maximum length with ellipsis
 *
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}
