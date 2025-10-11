// Main plugin export
export { GraphPlugin, type GraphPluginConfig } from './GraphPlugin';

// Type exports
export type {
  GraphNodeType,
  GraphNode,
  GraphEdge,
  GraphSnapshot,
  GraphUpdateCallback,
  RootGraphNode,
  BlocGraphNode,
  StateGraphNode,
} from './types';

// Serialization utilities (for advanced users)
export { serializeState, analyzeStateValue } from './serialization';
export type { SerializationConfig, SerializedState, StateValueMetadata } from './serialization';
