const MAX_DEPTH = 20;
const MAX_SIZE_BYTES = 10_000_000;

interface SerializeOptions {
  maxDepth?: number;
  maxSizeBytes?: number;
}

export class SerializationError extends Error {
  constructor(
    message: string,
    public readonly code: 'MAX_DEPTH' | 'MAX_SIZE' | 'UNKNOWN',
  ) {
    super(message);
    this.name = 'SerializationError';
  }
}

export function serialize(data: any, options: SerializeOptions = {}): any {
  const { maxDepth = MAX_DEPTH, maxSizeBytes = MAX_SIZE_BYTES } = options;

  const seen = new WeakSet();

  const serializeInternal = (value: any, depth: number): any => {
    if (depth > maxDepth) {
      throw new SerializationError(
        `Maximum serialization depth (${maxDepth}) exceeded`,
        'MAX_DEPTH',
      );
    }

    if (value === null) return null;
    if (value === undefined) return { __type: 'undefined' };

    const type = typeof value;

    switch (type) {
      case 'boolean':
      case 'number':
      case 'string':
        return value;

      case 'function':
        return {
          __type: 'Function',
          name: value.name || 'anonymous',
        };

      case 'symbol':
        return {
          __type: 'Symbol',
          description: value.description,
        };

      case 'bigint':
        return {
          __type: 'BigInt',
          value: value.toString(),
        };

      case 'object': {
        if (seen.has(value)) {
          return { __type: 'Circular' };
        }

        seen.add(value);

        // DOM nodes: never traverse. In a browser, React stores its fiber as an
        // own property (`__reactFiber$…`) on the node, so walking a node would
        // serialize the entire (huge, circular) fiber tree and freeze the tab.
        // Duck-typed so it stays SSR-safe (no `Node` reference).
        if (
          typeof (value as { nodeType?: unknown }).nodeType === 'number' &&
          typeof (value as { nodeName?: unknown }).nodeName === 'string'
        ) {
          seen.delete(value);
          return {
            __type: 'DOMNode',
            nodeName: (value as { nodeName: string }).nodeName,
          };
        }

        // Window / global host objects are likewise unbounded graphs.
        if (typeof window !== 'undefined' && value === window) {
          seen.delete(value);
          return { __type: 'Window' };
        }

        if (value instanceof Error) {
          return {
            __type: 'Error',
            name: value.name,
            message: value.message,
            stack: value.stack,
          };
        }

        if (value instanceof Date) {
          return {
            __type: 'Date',
            value: value.toISOString(),
          };
        }

        if (value instanceof RegExp) {
          return {
            __type: 'RegExp',
            value: value.toString(),
          };
        }

        if (value instanceof Map) {
          const entries: Array<[any, any]> = [];
          for (const [k, v] of value.entries()) {
            entries.push([
              serializeInternal(k, depth + 1),
              serializeInternal(v, depth + 1),
            ]);
          }
          seen.delete(value);
          return {
            __type: 'Map',
            entries,
          };
        }

        if (value instanceof Set) {
          const values: any[] = [];
          for (const v of value.values()) {
            values.push(serializeInternal(v, depth + 1));
          }
          seen.delete(value);
          return {
            __type: 'Set',
            values,
          };
        }

        if (Array.isArray(value)) {
          const arr = value.map((item) => serializeInternal(item, depth + 1));
          seen.delete(value);
          return arr;
        }

        const result: Record<string, any> = {};
        for (const key in value) {
          // React stores its fiber/props on host objects under these expandos;
          // following them serializes the whole fiber tree. Skip defensively.
          if (
            key.startsWith('__reactFiber$') ||
            key.startsWith('__reactProps$') ||
            key.startsWith('__reactContainer$')
          ) {
            continue;
          }
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            try {
              result[key] = serializeInternal(value[key], depth + 1);
            } catch (error) {
              if (error instanceof SerializationError) {
                result[key] = {
                  __type: 'SerializationError',
                  message: error.message,
                };
              } else {
                result[key] = { __type: 'UnserializableValue' };
              }
            }
          }
        }
        seen.delete(value);
        return result;
      }

      default:
        return { __type: 'Unknown' };
    }
  };

  try {
    const serialized = serializeInternal(data, 0);

    // Lazy size check: only stringify for size if the default limit is overridden
    // or if the data looks large (has nested objects). Skip for most calls.
    if (maxSizeBytes < MAX_SIZE_BYTES) {
      const jsonString = JSON.stringify(serialized);
      if (jsonString.length > maxSizeBytes) {
        throw new SerializationError(
          `Serialized data exceeds maximum size (${maxSizeBytes} bytes)`,
          'MAX_SIZE',
        );
      }
    }

    return serialized;
  } catch (error) {
    if (error instanceof SerializationError) {
      throw error;
    }
    throw new SerializationError(
      `Serialization failed: ${error instanceof Error ? error.message : String(error)}`,
      'UNKNOWN',
    );
  }
}

export function safeSerialize(
  data: any,
  options?: SerializeOptions,
):
  | { success: true; data: any }
  | { success: false; error: string; data: undefined } {
  try {
    const serialized = serialize(data, options);
    return { success: true, data: serialized };
  } catch (error) {
    return {
      data: undefined,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
