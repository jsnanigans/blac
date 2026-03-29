// =============================================================================
// Core Instance Types
// =============================================================================

/**
 * What triggered a state change (method name for Cubits, event class for Blocs)
 */
export interface Trigger {
  /** Method or event class name that caused the state change */
  name: string;
}

/**
 * Snapshot of state at a point in time
 */
export interface GetterInfo {
  value: unknown;
  error?: string;
  dependsOn?: string[];
}

export interface StateSnapshot {
  /** Current state after change */
  state: unknown;
  /** Previous state before change */
  previousState: unknown;
  /** When this state change occurred */
  timestamp: number;
  /** Optional call stack trace for debugging */
  callstack?: string;
  /** What triggered this state change */
  trigger?: Trigger;
  /** Computed getter values at this point in time */
  getters?: Record<string, GetterInfo>;
}

/**
 * Complete state for a tracked instance
 */
export interface InstanceState {
  /** Unique instance ID */
  id: string;
  /** Class name (e.g., 'CounterCubit') */
  className: string;
  /** Custom name or instanceId */
  name: string;
  /** Most recent state */
  currentState: unknown;
  /** Last N state changes (circular buffer) */
  history: StateSnapshot[];
  /** Creation timestamp */
  createdAt: number;
  /** Current computed getter values */
  getters?: Record<string, GetterInfo>;
}

/**
 * Full state dump from the DevTools backend
 */
export interface DevToolsSnapshot {
  /** All tracked instances */
  instances: InstanceState[];
  /** Snapshot timestamp */
  timestamp: number;
}

// =============================================================================
// Plugin Configuration Types
// =============================================================================

export interface DevToolsBrowserPluginConfig {
  enabled?: boolean;
  maxInstances?: number;
  maxSnapshots?: number;
  /** Updates/sec threshold that triggers a high-frequency warning (default: 30) */
  highFrequencyThreshold?: number;
  /** State size in bytes that triggers a large-state warning (default: 102400 = 100KB) */
  largeStateSizeThreshold?: number;
}

export interface DevToolsStateManagerConfig {
  maxInstances?: number;
  maxSnapshots?: number;
}

// =============================================================================
// Dependency Graph Types
// =============================================================================

export interface DependencyEdge {
  /** Instance ID of the bloc that has the dependency */
  fromId: string;
  /** Class name of the dependent bloc */
  fromClass: string;
  /** Class name of the dependency target */
  toClass: string;
  /** Instance key of the dependency target */
  toKey: string;
}

export interface DevToolsGraph {
  nodes: Array<{ id: string; className: string; name: string }>;
  edges: DependencyEdge[];
}

// =============================================================================
// Performance Metrics Types
// =============================================================================

export interface PerformanceWarning {
  type: 'high-frequency' | 'large-state';
  message: string;
  threshold: number;
  actual: number;
}

export interface InstanceMetrics {
  instanceId: string;
  totalUpdates: number;
  /** Rolling updates/sec (5s window) */
  updatesPerSecond: number;
  /** Average ms between updates */
  avgUpdateInterval: number;
  /** Peak updates/sec in any 1s window */
  maxBurstRate: number;
  /** Estimated serialized state size in bytes */
  stateSizeBytes: number;
  lastUpdateTimestamp: number;
  warnings: PerformanceWarning[];
}

// =============================================================================
// Consumer Tracking Types
// =============================================================================

export interface ConsumerInfo {
  /** Unique consumer ID (one per useBloc call site per component mount) */
  id: string;
  /** React component name (from fiber or displayName) */
  componentName: string;
  /** Timestamp when the component mounted */
  mountedAt: number;
}

// =============================================================================
// Event Types (for DevToolsBrowserPlugin)
// =============================================================================

export type DevToolsEventType =
  | 'init'
  | 'instance-created'
  | 'instance-updated'
  | 'instance-disposed'
  | 'performance-warning'
  | 'consumers-changed';

export interface DevToolsEvent {
  type: DevToolsEventType;
  timestamp: number;
  data: unknown;
}

export type DevToolsCallback = (event: DevToolsEvent) => void;
