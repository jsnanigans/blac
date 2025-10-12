/**
 * Node type discriminator for graph visualization
 */
export type GraphNodeType =
  | 'root'              // Blac instance root
  | 'bloc'              // Bloc instance
  | 'cubit'             // Cubit instance
  | 'state-root'        // Root container for a Bloc's state
  | 'state-object'      // Object property node
  | 'state-array'       // Array node
  | 'state-array-item'  // Array item by index
  | 'state-primitive';  // Leaf node (string, number, etc.)

/**
 * Base node interface containing common properties
 */
export interface BaseGraphNode {
  /** Unique identifier for the node */
  id: string;
  /** Node type discriminator */
  type: GraphNodeType;
  /** Parent node ID (undefined for root) */
  parentId?: string;
}

/**
 * Root node representing the Blac instance
 * Contains global statistics about the state management system
 */
export interface RootGraphNode extends BaseGraphNode {
  type: 'root';
  stats: {
    /** Total number of Bloc/Cubit instances */
    totalBlocs: number;
    /** Number of active Bloc/Cubit instances */
    activeBlocs: number;
    /** Number of disposed Bloc/Cubit instances */
    disposedBlocs: number;
    /** Total number of consumers across all Blocs */
    totalConsumers: number;
    /** Memory statistics from Blac.getMemoryStats() */
    memoryStats: {
      registeredBlocs: number;
      isolatedBlocs: number;
      keepAliveBlocs: number;
    };
  };
}

/**
 * Bloc/Cubit node representing a state container instance
 */
export interface BlocGraphNode extends BaseGraphNode {
  type: 'bloc' | 'cubit';
  /** Always points to root node */
  parentId: string;
  /** Class name (e.g., "CounterBloc") */
  name: string;
  /** Unique instance identifier */
  instanceId: string;
  /** Current lifecycle state */
  lifecycle: 'active' | 'disposal_requested' | 'disposing' | 'disposed';
  /** Number of consumers subscribed to this instance */
  consumerCount: number;
  /** True if this is a shared instance */
  isShared: boolean;
  /** True if this is an isolated instance */
  isIsolated: boolean;
  /** True if keepAlive is enabled */
  keepAlive: boolean;
}

/**
 * State root node - container for a Bloc/Cubit's state tree
 */
export interface StateRootNode extends BaseGraphNode {
  type: 'state-root';
  /** Points to parent Bloc/Cubit node */
  parentId: string;
  /** Root value type */
  valueType: string;
  /** Flag for flash animation on change */
  hasChanged?: boolean;
}

/**
 * State property node - represents a property/index in the state tree
 */
export interface StatePropertyNode extends BaseGraphNode {
  type: 'state-object' | 'state-array' | 'state-array-item' | 'state-primitive';
  /** Points to parent state node */
  parentId: string;

  // Path information
  /** Path from state root (e.g., ['todos', '0', 'title']) */
  path: string[];
  /** Property key or array index (e.g., 'title' or '[0]') */
  propertyKey: string;

  // Value information
  /** Raw value */
  value: unknown;
  /** Truncated value for display */
  displayValue: string;
  /** Full JSON representation for tooltips */
  fullValue: string;
  /** JavaScript type of the value */
  valueType: string;

  // Expansion state
  /** True if value is a primitive */
  isPrimitive: boolean;
  /** True if value can be expanded (objects, arrays) */
  isExpandable: boolean;
  /** Number of child properties (for objects/arrays) */
  childCount?: number;

  // For arrays
  /** Array index (for array items) */
  arrayIndex?: number;

  /** Flag for flash animation on change */
  hasChanged?: boolean;
}

/**
 * Union type of all possible node types
 */
export type GraphNode = RootGraphNode | BlocGraphNode | StateRootNode | StatePropertyNode;

/**
 * Edge representing parent-child relationship in the graph
 */
export interface GraphEdge {
  /** Unique identifier for the edge */
  id: string;
  /** Parent node ID */
  source: string;
  /** Child node ID */
  target: string;
  /** Edge type (always 'hierarchy' for this visualization) */
  type: 'hierarchy';
}

/**
 * Complete graph snapshot representing the entire state at a point in time
 */
export interface GraphSnapshot {
  /** All nodes in the graph */
  nodes: GraphNode[];
  /** All edges in the graph */
  edges: GraphEdge[];
  /** Timestamp of snapshot creation */
  timestamp: number;
}

/**
 * Callback function for graph update subscriptions
 */
export type GraphUpdateCallback = (snapshot: GraphSnapshot) => void;
