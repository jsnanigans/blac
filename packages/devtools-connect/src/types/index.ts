// =============================================================================
// Core Instance Types
// =============================================================================

/**
 * Snapshot of state at a point in time
 */
export interface StateSnapshot {
  /** Current state after change */
  state: unknown;
  /** Previous state before change */
  previousState: unknown;
  /** When this state change occurred */
  timestamp: number;
  /** Optional call stack trace for debugging */
  callstack?: string;
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
}

export interface DevToolsStateManagerConfig {
  maxInstances?: number;
  maxSnapshots?: number;
}

// =============================================================================
// Event Types (for DevToolsBrowserPlugin)
// =============================================================================

export type DevToolsEventType =
  | 'init'
  | 'instance-created'
  | 'instance-updated'
  | 'instance-disposed';

export interface DevToolsEvent {
  type: DevToolsEventType;
  timestamp: number;
  data: unknown;
}

export type DevToolsCallback = (event: DevToolsEvent) => void;
