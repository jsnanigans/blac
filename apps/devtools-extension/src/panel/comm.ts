/**
 * Panel-format instance (transformed by inject-script from backend format)
 */
export interface PanelInstance {
  id: string;
  className: string;
  name: string;
  isDisposed: boolean;
  isIsolated: boolean;
  state: any;
  lastStateChangeTimestamp: number;
  createdAt: number;
  hydrationStatus?: string;
  hydrationError?: string;
  history?: Array<{ state: any; previousState: any; timestamp: number; callstack?: string }>;
}

/**
 * Atomic event from DevToolsBrowserPlugin
 */
export type AtomicEvent =
  | { type: 'init'; timestamp: number; data: PanelInstance[] }
  | { type: 'instance-created' | 'instance-updated' | 'instance-disposed'; timestamp: number; data: PanelInstance };

export type MessageIn =
  | { type: 'INITIAL_STATE'; payload: { instances: PanelInstance[]; eventHistory?: AtomicEvent[]; version?: string; timestamp?: number } }
  | { type: 'ATOMIC_UPDATE'; payload: AtomicEvent }
  | { type: 'CACHED_STATE'; payload: { instances: PanelInstance[] } }
  | { type: 'BLAC_NOT_AVAILABLE'; payload: { reason: string } }
  | { type: 'PAGE_RELOAD'; payload: { tabId: number; timestamp: number } };

type MessageOut =
  | { type: 'GET_INSTANCES' }
  | { type: 'TIME_TRAVEL'; instanceId: string; state: any };

class Comm {
  private _port: chrome.runtime.Port | null = null;
  private _tabId: number | null = null;

  get port() {
    if (!this._port) {
      this._port = chrome.runtime.connect({ name: `devtools-${this.tabId}` });
    }
    return this._port;
  }

  get tabId() {
    if (this._tabId === null) {
      this._tabId = chrome.devtools.inspectedWindow.tabId;
    }
    return this._tabId;
  }

  /**
   * Send a message to the service worker
   */
  sendMessage = (message: MessageOut) => {
    this.port.postMessage(message);
  };

  /**
   * Subscribe to messages from the service worker
   */
  onMessage = (
    callback: (message: MessageIn, sender: chrome.runtime.Port) => void,
  ) => {
    this.port.onMessage.addListener(callback);
  };

  disconnect = () => {
    if (this._port) {
      this._port.disconnect();
      this._port = null;
    }
  };

  connect = () => {
    this.sendMessage({ type: 'GET_INSTANCES' });
  };
}

const comm = new Comm();
export default comm;
