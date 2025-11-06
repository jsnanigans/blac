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
          return {
            __type: 'Set',
            values,
          };
        }

        if (Array.isArray(value)) {
          return value.map((item) => serializeInternal(item, depth + 1));
        }

        const result: any = {};
        for (const key in value) {
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
        return result;
      }

      default:
        return { __type: 'Unknown' };
    }
  };

  try {
    const serialized = serializeInternal(data, 0);
    const jsonString = JSON.stringify(serialized);

    if (jsonString.length > maxSizeBytes) {
      throw new SerializationError(
        `Serialized data exceeds maximum size (${maxSizeBytes} bytes)`,
        'MAX_SIZE',
      );
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
