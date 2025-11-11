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
  /** Heartbeat to check connection status */
  HEARTBEAT = 'HEARTBEAT',
  /** Reconnection notification */
  RECONNECTED = 'RECONNECTED',
  /** Legacy: A new bloc instance was created */
  BLOC_CREATED = 'BLOC_CREATED',
  /** Legacy: An event was dispatched */
  EVENT_DISPATCHED = 'EVENT_DISPATCHED',
  /** Legacy: A bloc instance was disposed */
  BLOC_DISPOSED = 'BLOC_DISPOSED',
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
  /** Bloc ID (legacy, same as id) */
  blocId?: string;
  /** Previous state (before change) */
  previousState: any;
  /** Current state (after change) */
  currentState: any;
  /** State (legacy, same as currentState) */
  state?: any;
  /** Diff between states (optional) */
  diff?: any;
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
 * Payload for HEARTBEAT message
 */
export interface HeartbeatPayload {
  timestamp: number;
  connectedSince: number;
}

/**
 * Payload for RECONNECTED message
 */
export interface ReconnectedPayload {
  timestamp: number;
  requestStateSync: boolean;
}

/**
 * Payload for BLOC_CREATED message (legacy)
 */
export interface BlocCreatedPayload {
  id: string;
  name: string;
  state: any;
  timestamp: number;
}

/**
 * Payload for EVENT_DISPATCHED message (legacy)
 */
export interface EventDispatchedPayload {
  id: string;
  blocId: string;
  blocName: string;
  type: string;
  payload: any;
  timestamp: number;
}

/**
 * Payload for BLOC_DISPOSED message (legacy)
 */
export interface BlocDisposedPayload {
  id: string;
  name: string;
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
    }
  | {
      type: DevToolsMessageType.HEARTBEAT;
      payload: HeartbeatPayload;
    }
  | {
      type: DevToolsMessageType.RECONNECTED;
      payload: ReconnectedPayload;
    }
  | {
      type: DevToolsMessageType.BLOC_CREATED;
      payload: BlocCreatedPayload;
    }
  | {
      type: DevToolsMessageType.EVENT_DISPATCHED;
      payload: EventDispatchedPayload;
    }
  | {
      type: DevToolsMessageType.BLOC_DISPOSED;
      payload: BlocDisposedPayload;
    };

/**
 * Window message wrapper for postMessage API
 */
export interface WindowMessage {
  source: 'blac-devtools-app' | 'blac-devtools-extension';
  payload: DevToolsMessage;
}
