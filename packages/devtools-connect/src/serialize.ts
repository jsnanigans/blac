import type { Wire } from './protocol';

export interface SerializeLimits {
  maxDepth: number;
  maxBreadth: number;
  maxString: number;
  maxNodes: number;
}

const DEFAULT_LIMITS: SerializeLimits = {
  maxDepth: 20,
  maxBreadth: 100,
  maxString: 10_000,
  maxNodes: 10_000,
};

const truncated = (total: number): Wire => ({ __type: 'Truncated', total });

/**
 * Turn any value into JSON-safe `Wire`. Never throws and never walks an
 * unbounded graph: depth, breadth, string length and total node count are all
 * capped, and cut-offs become `Truncated` markers.
 */
export function serialize(
  data: unknown,
  limits: Partial<SerializeLimits> = {},
): Wire {
  const { maxDepth, maxBreadth, maxString, maxNodes } = {
    ...DEFAULT_LIMITS,
    ...limits,
  };
  const ancestors = new WeakSet<object>();
  let nodes = 0;

  const walk = (value: unknown, depth: number): Wire => {
    if (value === null) return null;
    switch (typeof value) {
      case 'boolean':
        return value;
      case 'number':
        return Number.isFinite(value)
          ? value
          : { __type: 'Number', value: String(value) };
      case 'string':
        return value.length > maxString
          ? `${value.slice(0, maxString)}… [+${value.length - maxString} chars]`
          : value;
      case 'undefined':
        return { __type: 'undefined' };
      case 'function':
        return { __type: 'Function', name: value.name || 'anonymous' };
      case 'symbol':
        return { __type: 'Symbol', description: value.description ?? '' };
      case 'bigint':
        return { __type: 'BigInt', value: value.toString() };
      case 'object':
        break;
      default:
        return { __type: 'Unknown' };
    }

    const obj = value as Record<string, unknown>;
    if (ancestors.has(obj)) return { __type: 'Circular' };
    if (depth > maxDepth || ++nodes > maxNodes) return truncated(0);

    // DOM nodes are never traversed: React stores its fiber as an own property
    // on them, so walking one serializes the whole (circular) fiber tree.
    if (typeof obj.nodeType === 'number' && typeof obj.nodeName === 'string') {
      return { __type: 'DOMNode', nodeName: obj.nodeName };
    }
    if (typeof window !== 'undefined' && value === window) {
      return { __type: 'Window' };
    }
    if (value instanceof Error) {
      return {
        __type: 'Error',
        name: value.name,
        message: walk(value.message, depth + 1),
        stack: walk(value.stack ?? '', depth + 1),
      };
    }
    if (value instanceof Date) {
      return {
        __type: 'Date',
        value: Number.isNaN(value.getTime()) ? 'Invalid' : value.toISOString(),
      };
    }
    if (value instanceof RegExp) {
      return { __type: 'RegExp', value: value.toString() };
    }
    if (ArrayBuffer.isView(value)) {
      return {
        __type: 'TypedArray',
        name: value.constructor.name,
        length: value.byteLength,
      };
    }

    ancestors.add(obj);
    try {
      if (value instanceof Map) {
        const entries: Wire[] = [];
        for (const [k, v] of value) {
          if (entries.length >= maxBreadth) break;
          entries.push([walk(k, depth + 1), walk(v, depth + 1)]);
        }
        return {
          __type: 'Map',
          entries,
          ...(value.size > entries.length && { truncated: value.size }),
        };
      }
      if (value instanceof Set) {
        const values: Wire[] = [];
        for (const v of value) {
          if (values.length >= maxBreadth) break;
          values.push(walk(v, depth + 1));
        }
        return {
          __type: 'Set',
          values,
          ...(value.size > values.length && { truncated: value.size }),
        };
      }
      if (Array.isArray(value)) {
        const items = value
          .slice(0, maxBreadth)
          .map((item) => walk(item, depth + 1));
        if (value.length > maxBreadth) items.push(truncated(value.length));
        return items;
      }

      const result: { [key: string]: Wire } = {};
      let count = 0;
      for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
        // React expandos hang the whole fiber tree off host objects.
        if (key.startsWith('__react') && key.includes('$')) continue;
        if (++count > maxBreadth) {
          result.__truncated = truncated(Object.keys(obj).length);
          break;
        }
        try {
          result[key] = walk(obj[key], depth + 1);
        } catch {
          result[key] = { __type: 'UnserializableValue' };
        }
      }
      return result;
    } finally {
      ancestors.delete(obj);
    }
  };

  try {
    return walk(data, 0);
  } catch {
    return { __type: 'UnserializableValue' };
  }
}
