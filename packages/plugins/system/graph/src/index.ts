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
  StateRootNode,
  StatePropertyNode,
} from './types';

// Serialization utilities (for advanced users)
export { serializeState, analyzeStateValue, expandStateTree } from './serialization';
export type {
  SerializationConfig,
  SerializedState,
  StateValueMetadata,
  StateTreeExpansionConfig,
  StateTreeExpansionResult,
} from './serialization';
