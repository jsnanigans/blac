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

// =============================================================================
// Wire Format (extension bridge / postMessage protocol)
// =============================================================================

/**
 * Wire event shape for `instance-updated` messages sent over the extension
 * bridge (postMessage) and `subscribe()` callbacks.
 *
 * F3 (devtools-ui) consumes this exact shape.
 *
 * Protocol version: 2 (introduced `paths` field; `prev` was already present
 * as `previousState` inside `data`).
 *
 * Shape:
 * ```ts
 * {
 *   type: 'instance-updated';
 *   timestamp: number;
 *   data: {
 *     // … all InstanceMetadata fields …
 *     paths: string[] | 'all';  // NEW in v2
 *     trigger?: Trigger;
 *   }
 * }
 * ```
 *
 * `paths` values:
 *   - `'all'`    — the PathSet was ALL_PATHS; treat as "everything changed"
 *   - `string[]` — decoded dotted path strings resolved via PathInterner.lookup()
 */
export interface DevToolsWireStateEvent {
  type: 'instance-updated';
  timestamp: number;
  data: {
    /** Instance unique id */
    id: string;
    /** Class name */
    className: string;
    /** Instance name */
    name: string;
    /** State after the flush */
    state: unknown;
    /** State before the flush (same shape as `state`) */
    previousState?: unknown;
    /** State after the flush (alias kept for compat) */
    currentState?: unknown;
    /**
     * Decoded path names that changed in this flush.
     * `'all'` when PathSet === ALL_PATHS.
     * Array of dotted-path strings otherwise.
     */
    paths: string[] | 'all';
    /** What triggered the state change (method name etc.) */
    trigger?: Trigger;
  };
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
  /** Stack trace captured at consumer registration (dev mode only) */
  stackTrace?: string;
}

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
  | 'performance-warning'
  | 'consumers-changed'
  | 'deps-changed';

export interface DevToolsEvent {
  type: DevToolsEventType;
  timestamp: number;
  data: unknown;
}

export type DevToolsCallback = (event: DevToolsEvent) => void;
