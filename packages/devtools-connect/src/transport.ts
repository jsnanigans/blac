import {
  WINDOW_AGENT_SOURCE,
  WINDOW_CLIENT_SOURCE,
  type AgentMsg,
  type ClientMsg,
} from './protocol';

export interface Transport<Out, In> {
  send(msg: Out): void;
  onMessage(cb: (msg: In) => void): () => void;
  onClose(cb: () => void): () => void;
  close(): void;
}

export type AgentTransport = Transport<AgentMsg, ClientMsg>;
export type ClientTransport = Transport<ClientMsg, AgentMsg>;

/** The agent's in-page endpoint, published under `AGENT_HOOK`. */
export interface AgentHook {
  connect(transport: AgentTransport): () => void;
}

class Emitter<T extends unknown[]> {
  private listeners = new Set<(...args: T) => void>();
  on(cb: (...args: T) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  emit(...args: T): void {
    for (const cb of this.listeners) cb(...args);
  }
}

/** Direct, synchronous, clone-free pair — the in-page overlay and tests. */
export function createMemoryTransportPair(): {
  client: ClientTransport;
  agent: AgentTransport;
} {
  const toAgent = new Emitter<[ClientMsg]>();
  const toClient = new Emitter<[AgentMsg]>();
  const clientClose = new Emitter<[]>();
  const agentClose = new Emitter<[]>();
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    clientClose.emit();
    agentClose.emit();
  };

  return {
    client: {
      send: (msg) => !closed && toAgent.emit(msg),
      onMessage: (cb) => toClient.on(cb),
      onClose: (cb) => clientClose.on(cb),
      close,
    },
    agent: {
      send: (msg) => !closed && toClient.emit(msg),
      onMessage: (cb) => toAgent.on(cb),
      onClose: (cb) => agentClose.on(cb),
      close,
    },
  };
}

/** Agent side of the page <-> content-script hop. */
export function createWindowAgentTransport(
  target: Window = window,
): AgentTransport {
  const closeListeners = new Emitter<[]>();
  return {
    send: (msg) =>
      target.postMessage({ source: WINDOW_AGENT_SOURCE, msg }, '*'),
    onMessage(cb) {
      const handler = (event: MessageEvent) => {
        const data = event.data as { source?: string; msg?: ClientMsg } | null;
        if (event.source !== target || data?.source !== WINDOW_CLIENT_SOURCE) {
          return;
        }
        if (typeof data.msg?.t === 'string') cb(data.msg);
      };
      target.addEventListener('message', handler);
      return () => target.removeEventListener('message', handler);
    },
    onClose: (cb) => closeListeners.on(cb),
    close: () => closeListeners.emit(),
  };
}
