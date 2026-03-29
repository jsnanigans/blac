export interface Trigger {
  name: string;
}

export interface DependencyEdge {
  fromId: string;
  fromClass: string;
  toClass: string;
  toKey: string;
}

export interface DependencyGraph {
  nodes: Array<{ id: string; className: string; name: string }>;
  edges: DependencyEdge[];
}

/**
 * Panel-format instance (transformed by inject-script from backend format)
 */
export interface ConsumerInfo {
  id: string;
  componentName: string;
  mountedAt: number;
}

export interface PanelInstance {
  id: string;
  className: string;
  name: string;
  isDisposed: boolean;
  isIsolated: boolean;
  state: any;
  lastStateChangeTimestamp: number;
  createdAt: number;
  hydrationStatus?: 'idle' | 'hydrating' | 'hydrated' | 'error';
  hydrationError?: string;
  callstack?: string;
  trigger?: Trigger;
  dependencies?: DependencyEdge[];
  consumers?: ConsumerInfo[];
  history?: Array<{
    state: any;
    previousState: any;
    timestamp: number;
    callstack?: string;
    trigger?: Trigger;
  }>;
}

/**
 * Atomic event from DevToolsBrowserPlugin
 */
export type AtomicEvent =
  | { type: 'init'; timestamp: number; data: PanelInstance[] }
  | {
      type: 'instance-created' | 'instance-updated' | 'instance-disposed';
      timestamp: number;
      data: PanelInstance;
    }
  | { type: 'performance-warning'; timestamp: number; data: any }
  | {
      type: 'consumers-changed';
      timestamp: number;
      data: { instanceId: string; consumers: ConsumerInfo[] };
    };

export type MessageIn =
  | {
      type: 'INITIAL_STATE';
      payload: {
        instances: PanelInstance[];
        eventHistory?: AtomicEvent[];
        version?: string;
        timestamp?: number;
        dependencyGraph?: DependencyGraph;
      };
    }
  | { type: 'ATOMIC_UPDATE'; payload: AtomicEvent }
  | { type: 'CACHED_STATE'; payload: { instances: PanelInstance[] } }
  | { type: 'BLAC_NOT_AVAILABLE'; payload: { reason: string } }
  | { type: 'PAGE_RELOAD'; payload: { tabId: number; timestamp: number } }
  | { type: 'PONG'; payload: { timestamp: number } };

type MessageOut =
  | { type: 'GET_INSTANCES' }
  | { type: 'TIME_TRAVEL'; instanceId: string; state: any }
  | { type: 'PING' };

const HEARTBEAT_INTERVAL = 5_000;
const HEARTBEAT_TIMEOUT = 3_000;

class Comm {
  private _port: chrome.runtime.Port | null = null;
  private _tabId: number | null = null;
  private _messageListeners: Array<
    (message: MessageIn, sender: chrome.runtime.Port) => void
  > = [];
  private _disconnectListeners: Array<() => void> = [];
  private _disposed = false;
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
  private _alive = false;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  get tabId() {
    if (this._tabId === null) {
      this._tabId = chrome.devtools.inspectedWindow.tabId;
    }
    return this._tabId;
  }

  private _ensurePort(): chrome.runtime.Port {
    if (!this._port) {
      this._port = chrome.runtime.connect({ name: `devtools-${this.tabId}` });

      // Re-attach all message listeners to the new port
      for (const listener of this._messageListeners) {
        this._port.onMessage.addListener(listener);
      }

      // Handle port disconnection (service worker restart, etc.)
      this._port.onDisconnect.addListener(() => {
        this._port = null;
        if (this._disposed) return;
        this._handleLostConnection();
        this._scheduleReconnect();
      });
    }
    return this._port;
  }

  private _handleLostConnection() {
    if (!this._alive) return;
    this._alive = false;
    for (const listener of this._disconnectListeners) {
      listener();
    }
  }

  private _scheduleReconnect() {
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (this._disposed) return;
      try {
        this._ensurePort();
        this.sendMessage({ type: 'GET_INSTANCES' });
      } catch {
        // Extension context invalidated
      }
    }, 500);
  }

  private _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatTimer = setInterval(() => {
      if (this._disposed) return;
      this._sendPing();
    }, HEARTBEAT_INTERVAL);
  }

  private _stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
    if (this._heartbeatTimeout) {
      clearTimeout(this._heartbeatTimeout);
      this._heartbeatTimeout = null;
    }
  }

  private _sendPing() {
    try {
      this._ensurePort().postMessage({ type: 'PING' });
    } catch {
      this._handleLostConnection();
      return;
    }

    // If no PONG within timeout, consider connection dead
    if (this._heartbeatTimeout) clearTimeout(this._heartbeatTimeout);
    this._heartbeatTimeout = setTimeout(() => {
      this._heartbeatTimeout = null;
      this._handleLostConnection();
      // Try to recover by re-requesting state
      try {
        this.sendMessage({ type: 'GET_INSTANCES' });
      } catch {
        // Port is truly dead, onDisconnect will handle reconnect
      }
    }, HEARTBEAT_TIMEOUT);
  }

  /** Called when a PONG is received — clears the timeout and marks alive */
  receivedPong() {
    if (this._heartbeatTimeout) {
      clearTimeout(this._heartbeatTimeout);
      this._heartbeatTimeout = null;
    }
    if (!this._alive) {
      this._alive = true;
    }
  }

  /** Called when an INITIAL_STATE is received — the connection is proven alive */
  receivedData() {
    if (this._heartbeatTimeout) {
      clearTimeout(this._heartbeatTimeout);
      this._heartbeatTimeout = null;
    }
    this._alive = true;
  }

  sendMessage = (message: MessageOut) => {
    this._ensurePort().postMessage(message);
  };

  onMessage = (
    callback: (message: MessageIn, sender: chrome.runtime.Port) => void,
  ) => {
    this._messageListeners.push(callback);
    this._ensurePort().onMessage.addListener(callback);
  };

  onDisconnect = (callback: () => void) => {
    this._disconnectListeners.push(callback);
  };

  disconnect = () => {
    this._disposed = true;
    this._stopHeartbeat();
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this._port) {
      this._port.disconnect();
      this._port = null;
    }
    this._messageListeners = [];
    this._disconnectListeners = [];
  };

  connect = () => {
    this._disposed = false;
    this.sendMessage({ type: 'GET_INSTANCES' });
    this._startHeartbeat();
  };
}

const comm = new Comm();
export default comm;
