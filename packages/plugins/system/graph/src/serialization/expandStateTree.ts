/**
 * State tree expansion utilities
 *
 * Recursively expands state values into a hierarchical tree structure
 * for visualization in the graph plugin.
 */

import { serializeState, type SerializationConfig } from './serializeState';
import type { StatePropertyNode } from '../types';

/**
 * Configuration for state tree expansion
 */
export interface StateTreeExpansionConfig {
  /** Maximum depth to expand (default: 3) */
  maxDepth?: number;
  /** Maximum string length before truncation (default: 100) */
  maxStringLength?: number;
  /** Maximum array items to show (default: 100) */
  maxArrayItems?: number;
  /** Detect circular references (default: true) */
  detectCircularRefs?: boolean;
}

const DEFAULT_CONFIG: Required<StateTreeExpansionConfig> = {
  maxDepth: 3,
  maxStringLength: 100,
  maxArrayItems: 100,
  detectCircularRefs: true,
};

/**
 * Result of expanding a state value into nodes
 */
export interface StateTreeExpansionResult {
  /** All generated property nodes */
  nodes: StatePropertyNode[];
  /** Map of node ID to node for quick lookup */
  nodeMap: Map<string, StatePropertyNode>;
}

/**
 * Unwraps proxy objects to get the raw value
 * Handles BlaC's proxy-wrapped states
 */
function unwrapProxy(value: unknown): unknown {
  // If it's a proxy with a target, unwrap it
  if (value && typeof value === 'object') {
    // Try to access the raw value (some proxies expose this)
    const raw = (value as any).__v_raw || (value as any).__target;
    if (raw) return raw;
  }
  return value;
}

/**
 * Gets the type of a value
 */
function getValueType(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Map) return 'map';
  if (value instanceof Set) return 'set';
  if (value instanceof Date) return 'date';
  if (value instanceof RegExp) return 'regexp';
  if (value instanceof Error) return 'error';
  if (value instanceof URL) return 'url';
  return typeof value;
}

/**
 * Checks if a value is primitive
 */
function isPrimitive(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint' ||
    typeof value === 'symbol'
  );
}

/**
 * Checks if a value is expandable (has children)
 */
function isExpandable(value: unknown): boolean {
  if (isPrimitive(value)) return false;

  const type = getValueType(value);

  if (type === 'array') {
    return (value as unknown[]).length > 0;
  }

  if (type === 'object') {
    return Object.keys(value as object).length > 0;
  }

  if (type === 'map') {
    return (value as Map<unknown, unknown>).size > 0;
  }

  if (type === 'set') {
    return (value as Set<unknown>).size > 0;
  }

  return false;
}

/**
 * Gets the child count for a value
 */
function getChildCount(value: unknown): number | undefined {
  if (isPrimitive(value)) return undefined;

  const type = getValueType(value);

  if (type === 'array') {
    return (value as unknown[]).length;
  }

  if (type === 'object') {
    return Object.keys(value as object).length;
  }

  if (type === 'map') {
    return (value as Map<unknown, unknown>).size;
  }

  if (type === 'set') {
    return (value as Set<unknown>).size;
  }

  return undefined;
}

/**
 * Generates a node ID from parent ID and property key
 */
function generateNodeId(parentId: string, propertyKey: string): string {
  // Sanitize property key for use in ID
  const sanitizedKey = propertyKey.replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${parentId}.${sanitizedKey}`;
}

/**
 * Determines the node type based on value type and context
 */
function determineNodeType(
  value: unknown,
  isArrayItem: boolean
): StatePropertyNode['type'] {
  if (isPrimitive(value)) {
    return 'state-primitive';
  }

  if (isArrayItem) {
    return 'state-array-item';
  }

  const type = getValueType(value);

  if (type === 'array') {
    return 'state-array';
  }

  return 'state-object';
}

/**
 * Recursively expands a state value into property nodes
 *
 * @param value - The value to expand
 * @param parentId - ID of the parent node
 * @param path - Current path from root
 * @param propertyKey - Key or index of this property
 * @param config - Expansion configuration
 * @param depth - Current depth in the tree
 * @param visited - Set of visited objects (for circular ref detection)
 * @param isArrayItem - Whether this is an array item
 * @returns Array of property nodes
 */
export function expandStateValue(
  value: unknown,
  parentId: string,
  path: string[],
  propertyKey: string,
  config: Required<StateTreeExpansionConfig>,
  depth: number = 0,
  visited: WeakSet<object> = new WeakSet(),
  isArrayItem: boolean = false
): StatePropertyNode[] {
  const nodes: StatePropertyNode[] = [];

  // Unwrap any proxies
  const rawValue = unwrapProxy(value);

  // Check depth limit
  if (depth >= config.maxDepth) {
    // Create a truncated leaf node
    const nodeId = generateNodeId(parentId, propertyKey);
    const { displayValue, fullValue } = serializeState(rawValue, config);

    nodes.push({
      id: nodeId,
      type: 'state-primitive',
      parentId,
      path,
      propertyKey,
      value: rawValue,
      displayValue: displayValue + ' ...',
      fullValue: fullValue + ' (truncated at max depth)',
      valueType: getValueType(rawValue),
      isPrimitive: false,
      isExpandable: false,
      childCount: undefined,
      hasChanged: false,
    });

    return nodes;
  }

  // Check for circular references
  if (config.detectCircularRefs && rawValue && typeof rawValue === 'object') {
    if (visited.has(rawValue)) {
      // Create a circular reference marker node
      const nodeId = generateNodeId(parentId, propertyKey);

      nodes.push({
        id: nodeId,
        type: 'state-primitive',
        parentId,
        path,
        propertyKey,
        value: '[Circular]',
        displayValue: '[Circular Reference]',
        fullValue: '[Circular Reference]',
        valueType: 'circular',
        isPrimitive: true,
        isExpandable: false,
        hasChanged: false,
      });

      return nodes;
    }

    visited.add(rawValue);
  }

  // Generate node ID
  const nodeId = generateNodeId(parentId, propertyKey);

  // Determine node type
  const nodeType = determineNodeType(rawValue, isArrayItem);

  // Serialize value
  const { displayValue, fullValue } = serializeState(rawValue, config);

  // Create the current node
  const currentNode: StatePropertyNode = {
    id: nodeId,
    type: nodeType,
    parentId,
    path,
    propertyKey,
    value: rawValue,
    displayValue,
    fullValue,
    valueType: getValueType(rawValue),
    isPrimitive: isPrimitive(rawValue),
    isExpandable: isExpandable(rawValue),
    childCount: getChildCount(rawValue),
    hasChanged: false,
  };

  // Add array index if this is an array item
  if (isArrayItem && /^\[\d+\]$/.test(propertyKey)) {
    const match = propertyKey.match(/\[(\d+)\]/);
    if (match) {
      currentNode.arrayIndex = parseInt(match[1], 10);
    }
  }

  nodes.push(currentNode);

  // If not expandable or at max depth, stop here
  if (!currentNode.isExpandable) {
    return nodes;
  }

  // Expand children
  const valueType = getValueType(rawValue);

  if (valueType === 'array') {
    const arrayValue = rawValue as unknown[];
    const itemsToShow = Math.min(arrayValue.length, config.maxArrayItems);

    for (let i = 0; i < itemsToShow; i++) {
      const item = arrayValue[i];
      const itemKey = `[${i}]`;
      const itemPath = [...path, itemKey];

      const childNodes = expandStateValue(
        item,
        nodeId,
        itemPath,
        itemKey,
        config,
        depth + 1,
        visited,
        true // This is an array item
      );

      nodes.push(...childNodes);
    }

    // If truncated, add a marker node
    if (arrayValue.length > config.maxArrayItems) {
      const truncatedNodeId = generateNodeId(nodeId, '[...]');
      nodes.push({
        id: truncatedNodeId,
        type: 'state-primitive',
        parentId: nodeId,
        path: [...path, '[...]'],
        propertyKey: '[...]',
        value: null,
        displayValue: `... and ${arrayValue.length - config.maxArrayItems} more items`,
        fullValue: `Array truncated at ${config.maxArrayItems} items`,
        valueType: 'truncated',
        isPrimitive: true,
        isExpandable: false,
        hasChanged: false,
      });
    }
  } else if (valueType === 'object') {
    const objectValue = rawValue as Record<string, unknown>;
    const keys = Object.keys(objectValue);

    for (const key of keys) {
      const childValue = objectValue[key];
      const childPath = [...path, key];

      const childNodes = expandStateValue(
        childValue,
        nodeId,
        childPath,
        key,
        config,
        depth + 1,
        visited,
        false
      );

      nodes.push(...childNodes);
    }
  } else if (valueType === 'map') {
    const mapValue = rawValue as Map<unknown, unknown>;
    let index = 0;

    for (const [key, val] of mapValue.entries()) {
      const keyStr = String(key);
      const childPath = [...path, keyStr];

      const childNodes = expandStateValue(
        val,
        nodeId,
        childPath,
        keyStr,
        config,
        depth + 1,
        visited,
        false
      );

      nodes.push(...childNodes);

      index++;
      if (index >= config.maxArrayItems) break;
    }
  } else if (valueType === 'set') {
    const setValue = rawValue as Set<unknown>;
    let index = 0;

    for (const val of setValue.values()) {
      const itemKey = `[${index}]`;
      const itemPath = [...path, itemKey];

      const childNodes = expandStateValue(
        val,
        nodeId,
        itemPath,
        itemKey,
        config,
        depth + 1,
        visited,
        true
      );

      nodes.push(...childNodes);

      index++;
      if (index >= config.maxArrayItems) break;
    }
  }

  return nodes;
}

/**
 * Main entry point: Expands a state value into a complete tree of nodes
 *
 * @param rootValue - The root state value to expand
 * @param stateRootNodeId - ID of the state root node (parent of all property nodes)
 * @param config - Expansion configuration
 * @returns Expansion result with all nodes
 */
export function expandStateTree(
  rootValue: unknown,
  stateRootNodeId: string,
  config: StateTreeExpansionConfig = {}
): StateTreeExpansionResult {
  const mergedConfig: Required<StateTreeExpansionConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const nodes: StatePropertyNode[] = [];
  const nodeMap = new Map<string, StatePropertyNode>();
  const visited = new WeakSet<object>();

  // Handle root value based on its type
  const valueType = getValueType(rootValue);
  const rawValue = unwrapProxy(rootValue);

  if (isPrimitive(rawValue)) {
    // Root is a primitive - create single node
    const nodeId = generateNodeId(stateRootNodeId, 'value');
    const { displayValue, fullValue } = serializeState(rawValue, mergedConfig);

    const node: StatePropertyNode = {
      id: nodeId,
      type: 'state-primitive',
      parentId: stateRootNodeId,
      path: [],
      propertyKey: 'value',
      value: rawValue,
      displayValue,
      fullValue,
      valueType,
      isPrimitive: true,
      isExpandable: false,
      hasChanged: false,
    };

    nodes.push(node);
    nodeMap.set(nodeId, node);
  } else if (valueType === 'array') {
    // Root is an array - expand items
    const arrayValue = rawValue as unknown[];
    const itemsToShow = Math.min(arrayValue.length, mergedConfig.maxArrayItems);

    for (let i = 0; i < itemsToShow; i++) {
      const item = arrayValue[i];
      const itemKey = `[${i}]`;
      const itemPath = [itemKey];

      const childNodes = expandStateValue(
        item,
        stateRootNodeId,
        itemPath,
        itemKey,
        mergedConfig,
        0,
        visited,
        true
      );

      nodes.push(...childNodes);
      childNodes.forEach(node => nodeMap.set(node.id, node));
    }

    // Truncation marker if needed
    if (arrayValue.length > mergedConfig.maxArrayItems) {
      const truncatedNodeId = generateNodeId(stateRootNodeId, '[...]');
      const node: StatePropertyNode = {
        id: truncatedNodeId,
        type: 'state-primitive',
        parentId: stateRootNodeId,
        path: ['[...]'],
        propertyKey: '[...]',
        value: null,
        displayValue: `... and ${arrayValue.length - mergedConfig.maxArrayItems} more items`,
        fullValue: `Array truncated at ${mergedConfig.maxArrayItems} items`,
        valueType: 'truncated',
        isPrimitive: true,
        isExpandable: false,
        hasChanged: false,
      };

      nodes.push(node);
      nodeMap.set(truncatedNodeId, node);
    }
  } else if (valueType === 'object') {
    // Root is an object - expand properties
    const objectValue = rawValue as Record<string, unknown>;
    const keys = Object.keys(objectValue);

    for (const key of keys) {
      const childValue = objectValue[key];
      const childPath = [key];

      const childNodes = expandStateValue(
        childValue,
        stateRootNodeId,
        childPath,
        key,
        mergedConfig,
        0,
        visited,
        false
      );

      nodes.push(...childNodes);
      childNodes.forEach(node => nodeMap.set(node.id, node));
    }
  } else {
    // Other types (Map, Set, etc.) - expand similarly to object
    const childNodes = expandStateValue(
      rawValue,
      stateRootNodeId,
      [],
      'value',
      mergedConfig,
      0,
      visited,
      false
    );

    nodes.push(...childNodes);
    childNodes.forEach(node => nodeMap.set(node.id, node));
  }

  return {
    nodes,
    nodeMap,
  };
}
