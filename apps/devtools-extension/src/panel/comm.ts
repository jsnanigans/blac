import { InstanceMetadata } from '@blac/core';

export type InstanceData = InstanceMetadata;

export type MessageIn =
  | { type: 'INITIAL_STATE'; payload: { instances: InstanceData[] } }
  | { type: 'STATE_UPDATE'; payload: { instances: InstanceData[] } }
  | { type: 'SYNC'; payload: { instances: InstanceData[] } }
  | { type: 'REFRESH_RESPONSE'; payload: { instances: InstanceData[] } }
  | { type: 'CACHED_STATE'; payload: { instances: InstanceData[] } };

type MessageOut = { type: 'GET_INSTANCES' };

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

  postMessage = (message: MessageOut) => {
    this.port.postMessage(message);
  };

  onMessage = (
    callback: (message: MessageIn, sender: chrome.runtime.Port) => void,
  ) => {
    this.port.onMessage.addListener(callback);
  };

  sendMessage = (message: MessageOut) => {
    this.postMessage(message);
  };

  disconnect = () => {
    if (this._port) {
      this._port.disconnect();
      this._port = null;
    }
  };

  connect = () => {
    this.postMessage({ type: 'GET_INSTANCES' });
  };
}

const comm = new Comm();
export default comm;
