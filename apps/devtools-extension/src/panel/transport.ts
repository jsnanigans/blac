import type { ClientTransport } from '@blac/devtools-connect/client';
import {
  PROTOCOL_VERSION,
  type AgentMsg,
} from '@blac/devtools-connect/protocol';

const RECONNECT_MS = 500;

/**
 * A port to the service worker that survives the worker being killed: the
 * client sees `bye`, then `ready` once a new port is up, and resumes the same
 * session without losing its log or selection.
 */
export function createPanelTransport(name: string): ClientTransport {
  const listeners = new Set<(msg: AgentMsg) => void>();
  const emit = (msg: AgentMsg) => {
    for (const cb of listeners) cb(msg);
  };
  let port: chrome.runtime.Port | undefined;
  let closed = false;

  const open = () => {
    const current = chrome.runtime.connect({ name });
    port = current;
    current.onMessage.addListener(emit);
    current.onDisconnect.addListener(() => {
      if (closed || port !== current) return;
      port = undefined;
      emit({ t: 'bye' });
      setTimeout(() => {
        if (closed) return;
        open();
        emit({ t: 'ready', protocol: PROTOCOL_VERSION });
      }, RECONNECT_MS);
    });
  };
  open();

  return {
    send: (msg) => {
      try {
        port?.postMessage(msg);
      } catch {
        // port closed; onDisconnect reconnects
      }
    },
    onMessage: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    onClose: () => () => {},
    close: () => {
      closed = true;
      port?.disconnect();
    },
  };
}
