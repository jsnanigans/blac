/**
 * Unified DevTools Type Definitions
 *
 * This is the single source of truth for all DevTools types.
 * All other files should import from here.
 */

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
  /** Unique instance ID (bloc.uid) */
  id: string;
  /** Class name (e.g., 'CounterCubit') */
  className: string;
  /** Custom name or instanceId */
  name: string;
  /** Whether this is an isolated instance */
  isIsolated: boolean;
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
// Message Protocol Types
// =============================================================================

/**
 * Message types for DevTools communication
 */
export enum DevToolsMessageType {
  // Modern atomic messages
  INSTANCE_CREATED = 'INSTANCE_CREATED',
  INSTANCE_DISPOSED = 'INSTANCE_DISPOSED',
  STATE_CHANGED = 'STATE_CHANGED',
  FULL_STATE_DUMP = 'FULL_STATE_DUMP',
  PANEL_CONNECT = 'PANEL_CONNECT',
  HEARTBEAT = 'HEARTBEAT',
  RECONNECTED = 'RECONNECTED',

  // Legacy messages (deprecated, use modern messages instead)
  /** @deprecated Use INSTANCE_CREATED instead */
  BLOC_CREATED = 'BLOC_CREATED',
  /** @deprecated Use STATE_CHANGED instead */
  EVENT_DISPATCHED = 'EVENT_DISPATCHED',
  /** @deprecated Use INSTANCE_DISPOSED instead */
  BLOC_DISPOSED = 'BLOC_DISPOSED',
}

// =============================================================================
// Modern Message Payloads
// =============================================================================

export interface InstanceCreatedPayload {
  id: string;
  className: string;
  name: string;
  state: unknown;
  isIsolated: boolean;
  createdAt: number;
  timestamp: number;
}

export interface InstanceDisposedPayload {
  id: string;
  timestamp: number;
}

export interface StateChangedPayload {
  id: string;
  previousState: unknown;
  currentState: unknown;
  diff?: unknown;
  timestamp: number;
  callstack?: string;
}

export interface PanelConnectPayload {
  panelId: string;
  timestamp: number;
}

export interface FullStateDumpPayload {
  instances: InstanceState[];
  timestamp: number;
}

export interface HeartbeatPayload {
  timestamp: number;
  connectedSince: number;
}

export interface ReconnectedPayload {
  timestamp: number;
  requestStateSync: boolean;
}

// =============================================================================
// Legacy Message Payloads (Deprecated)
// =============================================================================

/** @deprecated Use InstanceCreatedPayload instead */
export interface LegacyBlocCreatedPayload {
  id: string;
  name: string;
  state: unknown;
  timestamp: number;
}

/** @deprecated Use StateChangedPayload instead */
export interface LegacyStateChangedPayload {
  blocId: string;
  state: unknown;
  diff?: unknown;
  timestamp: number;
}

/** @deprecated Use InstanceDisposedPayload instead */
export interface LegacyBlocDisposedPayload {
  id: string;
  name: string;
  timestamp: number;
}

/** @deprecated */
export interface SerializedEvent {
  id: string;
  blocId: string;
  blocName: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

// =============================================================================
// Message Union Types
// =============================================================================

export type DevToolsMessage =
  | { type: DevToolsMessageType.INSTANCE_CREATED; payload: InstanceCreatedPayload }
  | { type: DevToolsMessageType.INSTANCE_DISPOSED; payload: InstanceDisposedPayload }
  | { type: DevToolsMessageType.STATE_CHANGED; payload: StateChangedPayload }
  | { type: DevToolsMessageType.PANEL_CONNECT; payload: PanelConnectPayload }
  | { type: DevToolsMessageType.FULL_STATE_DUMP; payload: FullStateDumpPayload }
  | { type: DevToolsMessageType.HEARTBEAT; payload: HeartbeatPayload }
  | { type: DevToolsMessageType.RECONNECTED; payload: ReconnectedPayload }
  // Legacy messages
  | { type: DevToolsMessageType.BLOC_CREATED; payload: LegacyBlocCreatedPayload }
  | { type: DevToolsMessageType.EVENT_DISPATCHED; payload: SerializedEvent }
  | { type: DevToolsMessageType.BLOC_DISPOSED; payload: LegacyBlocDisposedPayload };

// =============================================================================
// Command Types (DevTools Panel -> App)
// =============================================================================

export type DevToolsCommand =
  | { type: 'TIME_TRAVEL'; payload: { eventIndex: number } }
  | { type: 'REQUEST_STATE'; payload: { blocId: string } }
  | { type: 'CLEAR_EVENTS' }
  | { type: 'HEARTBEAT_ACK' };

// =============================================================================
// Window Message Wrapper
// =============================================================================

export type WindowMessageSource =
  | 'blac-devtools-app'
  | 'blac-devtools-extension'
  | 'blac-devtools-inject'
  | 'blac-devtools-content'
  | 'blac-devtools-panel';

export interface WindowMessage {
  source: WindowMessageSource;
  payload: DevToolsMessage | DevToolsCommand;
}

// =============================================================================
// Plugin Configuration Types
// =============================================================================

export interface DevToolsPluginConfig {
  enabled?: boolean;
  maxEvents?: number;
  maxMessageSize?: number;
  maxMessagesPerSecond?: number;
}

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
