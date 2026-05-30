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
  /**
   * Decoded path names that changed during this flush.
   * `'all'` when the change spans every path (PathSet === ALL_PATHS).
   * An array of dotted path strings otherwise (e.g. `['count', 'user.name']`).
   */
  paths?: string[] | 'all';
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
  /** Stack trace showing where the instance was first created */
  createdFrom?: string;
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
// Ref Holder Tracking Types
// =============================================================================

export interface RefHolderInfo {
  /** Reference ID string */
  refId: string;
  /** Timestamp when the ref was acquired */
  acquiredAt: number;
  /** Stack trace captured at acquire() call (dev mode only) */
  stackTrace?: string;
}

// =============================================================================
// Event Types (for DevToolsBrowserPlugin)
// =============================================================================

export type DevToolsEventType =
  | 'init'
  | 'instance-created'
  | 'instance-updated'
  | 'instance-disposed'
  | 'refs-changed'
  | 'deps-changed';

export interface DevToolsEvent {
  type: DevToolsEventType;
  timestamp: number;
  data: unknown;
}

export type DevToolsCallback = (event: DevToolsEvent) => void;
