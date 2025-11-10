/**
 * DevTools Communication Protocol
 *
 * This defines the message types for atomic updates between the app
 * and DevTools UI (Chrome extension panel or in-app overlay).
 *
 * Connection Protocol:
 * 1. Panel opens → sends PANEL_CONNECT
 * 2. Plugin responds with FULL_STATE_DUMP (all instances + history)
 * 3. Panel renders everything
 * 4. From now on: atomic updates (INSTANCE_CREATED, STATE_CHANGED, INSTANCE_DISPOSED)
 */

/**
 * Message types sent from app to DevTools UI
 */
export enum DevToolsMessageType {
  /** A new bloc instance was created */
  INSTANCE_CREATED = 'INSTANCE_CREATED',
  /** A bloc instance was disposed */
  INSTANCE_DISPOSED = 'INSTANCE_DISPOSED',
  /** A bloc's state changed */
  STATE_CHANGED = 'STATE_CHANGED',
  /** Full state dump sent when panel connects (plugin → panel) */
  FULL_STATE_DUMP = 'FULL_STATE_DUMP',
  /** Panel connection request (panel → plugin) */
  PANEL_CONNECT = 'PANEL_CONNECT',
}

/**
 * Payload for INSTANCE_CREATED message
 */
export interface InstanceCreatedPayload {
  /** Unique instance ID */
  id: string;
  /** Class name (e.g., 'CounterCubit') */
  className: string;
  /** Custom name if provided */
  name: string;
  /** Initial state */
  state: any;
  /** Whether this is an isolated instance */
  isIsolated: boolean;
  /** Creation timestamp */
  createdAt: number;
  /** Message timestamp */
  timestamp: number;
}

/**
 * Payload for INSTANCE_DISPOSED message
 */
export interface InstanceDisposedPayload {
  /** Unique instance ID */
  id: string;
  /** Message timestamp */
  timestamp: number;
}

/**
 * Payload for STATE_CHANGED message
 */
export interface StateChangedPayload {
  /** Unique instance ID */
  id: string;
  /** Previous state (before change) */
  previousState: any;
  /** Current state (after change) */
  currentState: any;
  /** Message timestamp */
  timestamp: number;
  /** Call stack trace for debugging (optional) */
  callstack?: string;
}

/**
 * Payload for PANEL_CONNECT message (panel → plugin)
 */
export interface PanelConnectPayload {
  /** Unique ID for this panel connection */
  panelId: string;
  /** Connection timestamp */
  timestamp: number;
}

/**
 * Payload for FULL_STATE_DUMP message (plugin → panel)
 * Re-export types from DevToolsStateManager
 */
export interface StateSnapshot {
  state: any;
  previousState: any;
  timestamp: number;
  callstack?: string;
}

export interface InstanceState {
  id: string;
  className: string;
  name: string;
  isIsolated: boolean;
  currentState: any;
  history: StateSnapshot[];
  createdAt: number;
}

export interface FullStateDumpPayload {
  instances: InstanceState[];
  timestamp: number;
}

/**
 * Union type for all DevTools messages
 */
export type DevToolsMessage =
  | {
      type: DevToolsMessageType.INSTANCE_CREATED;
      payload: InstanceCreatedPayload;
    }
  | {
      type: DevToolsMessageType.INSTANCE_DISPOSED;
      payload: InstanceDisposedPayload;
    }
  | {
      type: DevToolsMessageType.STATE_CHANGED;
      payload: StateChangedPayload;
    }
  | {
      type: DevToolsMessageType.PANEL_CONNECT;
      payload: PanelConnectPayload;
    }
  | {
      type: DevToolsMessageType.FULL_STATE_DUMP;
      payload: FullStateDumpPayload;
    };

/**
 * Window message wrapper for postMessage API
 */
export interface WindowMessage {
  source: 'blac-devtools-app' | 'blac-devtools-extension';
  payload: DevToolsMessage;
}
