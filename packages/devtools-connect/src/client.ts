import {
  AGENT_HOOK,
  PROTOCOL_VERSION,
  type AgentMsg,
  type HistoryEntry,
  type InstanceMeta,
  type Paths,
  type SequencedAgentMsg,
} from './protocol';
import {
  createMemoryTransportPair,
  type AgentHook,
  type ClientTransport,
} from './transport';

type Event = Exclude<SequencedAgentMsg, { t: 'welcome' | 'snapshot' }>;

export type ClientStatus =
  | 'connecting'
  | 'connected'
  | 'incompatible'
  | 'closed';

export interface LogEntry {
  key: number;
  kind: 'created' | 'changed' | 'disposed';
  id: string;
  className: string;
  name: string;
  at: number;
  version?: number;
  paths?: Paths;
}

export interface ClientState {
  status: ClientStatus;
  /** Set when `status` is `'incompatible'`. */
  agentProtocol?: number;
  instances: InstanceMeta[];
  selectedId: string | null;
  /** Recorded changes of the selected instance, oldest first. */
  history: HistoryEntry[];
  log: LogEntry[];
}

export interface DevToolsClientOptions {
  logSize?: number;
  historySize?: number;
}

/**
 * Speaks the protocol and exposes a store for `useSyncExternalStore`
 * (`subscribe` / `getSnapshot`). Knows nothing about `@blac/core`.
 */
export class DevToolsClient {
  private readonly listeners = new Set<() => void>();
  private readonly instances = new Map<string, InstanceMeta>();
  private readonly logSize: number;
  private readonly historySize: number;
  private status: ClientStatus = 'connecting';
  private agentProtocol: number | undefined;
  private session: string | undefined;
  private lastSeq = 0;
  private resyncing = false;
  private selectedId: string | null = null;
  private history: HistoryEntry[] = [];
  private log: LogEntry[] = [];
  private logKey = 0;
  private notifyQueued = false;
  private state: ClientState;
  private readonly off: Array<() => void>;

  constructor(
    private readonly transport: ClientTransport,
    { logSize = 1000, historySize = 50 }: DevToolsClientOptions = {},
  ) {
    this.logSize = logSize;
    this.historySize = historySize;
    this.state = this.build();
    this.off = [
      transport.onMessage((msg) => this.handle(msg)),
      transport.onClose(() => this.setClosed()),
    ];
    this.hello();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ClientState => this.state;

  select(id: string | null): void {
    if (id === this.selectedId) return;
    this.selectedId = id;
    this.history = [];
    this.watchSelected();
    this.touch();
  }

  clearLog(): void {
    this.log = [];
    this.touch();
  }

  close(): void {
    if (this.status === 'closed') return;
    this.transport.send({ t: 'bye' });
    this.transport.close();
    this.setClosed();
  }

  private hello(): void {
    this.transport.send({ t: 'hello', protocol: PROTOCOL_VERSION });
  }

  private watchSelected(): void {
    this.transport.send({ t: 'watch', id: this.selectedId });
    if (this.selectedId) {
      this.transport.send({ t: 'history', id: this.selectedId });
    }
  }

  private setClosed(): void {
    if (this.status === 'closed') return;
    this.status = 'closed';
    for (const off of this.off) off();
    this.touch();
  }

  private handle(msg: AgentMsg): void {
    if (this.status === 'closed') return;
    if (msg.t === 'ready') return this.hello();
    if (msg.t === 'bye') return this.waitForAgent();

    if (msg.t === 'welcome') {
      if (msg.protocol !== PROTOCOL_VERSION) {
        this.status = 'incompatible';
        this.agentProtocol = msg.protocol;
        return this.touch();
      }
      return this.adopt(msg.session, msg.seq, msg.instances);
    }
    if (this.status !== 'connected') return;
    if (msg.t === 'snapshot') {
      return this.adopt(msg.session, msg.seq, msg.instances);
    }

    if (this.resyncing) return;
    if (msg.session !== this.session || msg.seq !== this.lastSeq + 1) {
      return this.resync();
    }
    this.lastSeq = msg.seq;
    this.apply(msg);
  }

  private resync(): void {
    if (this.resyncing) return;
    this.resyncing = true;
    this.transport.send({ t: 'snapshot' });
  }

  /**
   * The agent went away (reload, navigation, lost port). Keep everything until
   * the next `welcome`: the same session resumes, a new one starts over.
   */
  private waitForAgent(): void {
    this.status = 'connecting';
    this.agentProtocol = undefined;
    this.resyncing = false;
    this.touch();
  }

  /** The selection survives a new session so a reload keeps the inspector. */
  private adopt(session: string, seq: number, instances: InstanceMeta[]): void {
    if (session !== this.session) {
      this.session = session;
      this.history = [];
      this.log = [];
    }
    this.lastSeq = seq;
    this.resyncing = false;
    this.status = 'connected';
    this.agentProtocol = undefined;
    this.instances.clear();
    for (const meta of instances) this.instances.set(meta.id, meta);
    if (this.selectedId) this.watchSelected();
    this.touch();
  }

  private apply(msg: Event): void {
    switch (msg.t) {
      case 'created':
        this.instances.set(msg.meta.id, msg.meta);
        this.record('created', msg.meta, msg.meta.createdAt);
        if (msg.meta.id === this.selectedId) this.watchSelected();
        break;
      case 'changed': {
        const meta = this.instances.get(msg.id);
        if (!meta) return;
        const next = { ...meta, version: msg.version, updatedAt: msg.at };
        this.instances.set(msg.id, next);
        this.record('changed', next, msg.at, msg.version, msg.paths);
        break;
      }
      case 'disposed': {
        const meta = this.instances.get(msg.id);
        if (!meta) return;
        const next = { ...meta, disposedAt: msg.at };
        this.instances.set(msg.id, next);
        this.record('disposed', next, msg.at);
        break;
      }
      case 'removed':
        this.instances.delete(msg.id);
        break;
      case 'history': {
        if (msg.id !== this.selectedId) return;
        const byVersion = new Map(this.history.map((e) => [e.version, e]));
        for (const entry of msg.entries) byVersion.set(entry.version, entry);
        this.history = [...byVersion.values()]
          .sort((a, b) => a.version - b.version)
          .slice(-this.historySize);
        break;
      }
    }
    this.touch();
  }

  private record(
    kind: LogEntry['kind'],
    meta: InstanceMeta,
    at: number,
    version?: number,
    paths?: Paths,
  ): void {
    const entry: LogEntry = {
      key: ++this.logKey,
      kind,
      id: meta.id,
      className: meta.className,
      name: meta.name,
      at,
      version,
      paths,
    };
    this.log = [...this.log, entry].slice(-this.logSize);
  }

  private touch(): void {
    if (this.notifyQueued) return;
    this.notifyQueued = true;
    queueMicrotask(() => {
      this.notifyQueued = false;
      this.state = this.build();
      for (const listener of this.listeners) listener();
    });
  }

  private build(): ClientState {
    return {
      status: this.status,
      agentProtocol: this.agentProtocol,
      instances: [...this.instances.values()],
      selectedId: this.selectedId,
      history: this.history,
      log: this.log,
    };
  }
}

/** Connect to the agent running in this page (the overlay host). */
export function connectInPage(): DevToolsClient | undefined {
  const hook = (globalThis as Record<symbol, AgentHook | undefined>)[
    AGENT_HOOK
  ];
  if (!hook) return undefined;
  const { client, agent } = createMemoryTransportPair();
  hook.connect(agent);
  return new DevToolsClient(client);
}

export type { ClientTransport } from './transport';
