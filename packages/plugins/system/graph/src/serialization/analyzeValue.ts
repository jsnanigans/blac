import { serializeState, type SerializationConfig } from './serializeState';

/**
 * Metadata extracted from analyzing a state value
 */
export interface StateValueMetadata {
  /** Original value */
  value: unknown;
  /** Truncated value for display */
  displayValue: string;
  /** Full JSON string for tooltip */
  fullValue: string;
  /** True if value can be expanded */
  isExpandable: boolean;
  /** True if value is a primitive */
  isPrimitive: boolean;
  /** JavaScript type of the value */
  type: string;
  /** Number of children (for objects/arrays) */
  childCount?: number;
}

/**
 * Analyzes a state value and extracts metadata for visualization
 *
 * @param value - The state value to analyze
 * @param config - Serialization configuration
 * @returns Metadata about the value
 */
export function analyzeStateValue(
  value: unknown,
  config: SerializationConfig
): StateValueMetadata {
  const { displayValue, fullValue } = serializeState(value, config);

  // Determine if primitive
  const isPrimitive =
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint' ||
    typeof value === 'symbol';

  // Determine type and child count
  let type: string;
  let childCount: number | undefined;

  if (value === null) {
    type = 'null';
  } else if (value === undefined) {
    type = 'undefined';
  } else if (Array.isArray(value)) {
    type = 'array';
    childCount = value.length;
  } else if (value instanceof Map) {
    type = 'map';
    childCount = value.size;
  } else if (value instanceof Set) {
    type = 'set';
    childCount = value.size;
  } else if (value instanceof Date) {
    type = 'date';
  } else if (value instanceof RegExp) {
    type = 'regexp';
  } else if (value instanceof Error) {
    type = 'error';
  } else if (value instanceof URL) {
    type = 'url';
  } else if (typeof value === 'object') {
    type = 'object';
    childCount = Object.keys(value as object).length;
  } else {
    type = typeof value;
  }

  // Determine if expandable
  const isExpandable = !isPrimitive && (childCount ?? 0) > 0;

  return {
    value,
    displayValue,
    fullValue,
    isExpandable,
    isPrimitive,
    type,
    childCount,
  };
}
