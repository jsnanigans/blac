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

/** Instances of a class that lived under `SHORT_LIVED_MS`. */
export interface ChurnEntry {
  className: string;
  at: number;
  count: number;
}

export const SHORT_LIVED_MS = 1000;
const CHURN_SIZE = 200;

export interface ClientState {
  status: ClientStatus;
  /** Set when `status` is `'incompatible'`. */
  agentProtocol?: number;
  /** The agent's `CONNECT_VERSION`; unset for agents that predate it. */
  agentVersion?: string;
  instances: InstanceMeta[];
  selectedId: string | null;
  /** Recorded changes of the selected instance, oldest first. */
  history: HistoryEntry[];
  log: LogEntry[];
  /** Short-lived instances, oldest first. */
  churn: ChurnEntry[];
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
  private agentVersion: string | undefined;
  private session: string | undefined;
  private lastSeq = 0;
  private resyncing = false;
  private selectedId: string | null = null;
  private history: HistoryEntry[] = [];
  /** Grows to twice `logSize` before trimming, so appends stay O(1). */
  private log: LogEntry[] = [];
  private logView: LogEntry[] = [];
  private logDirty = false;
  private logKey = 0;
  private churn: ChurnEntry[] = [];
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
    this.logDirty = true;
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
      this.agentVersion = msg.version;
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
   * The agent went away (reload, navigation, lost port). Its instances are
   * gone; the log stays until a new session starts over.
   */
  private waitForAgent(): void {
    this.status = 'connecting';
    this.agentProtocol = undefined;
    this.agentVersion = undefined;
    this.resyncing = false;
    this.instances.clear();
    this.touch();
  }

  /** The selection survives a new session so a reload keeps the inspector. */
  private adopt(session: string, seq: number, instances: InstanceMeta[]): void {
    if (session !== this.session) {
      this.session = session;
      this.history = [];
      this.log = [];
      this.logDirty = true;
      this.churn = [];
      // Start the log with what already exists, so it isn't blank on connect.
      for (const meta of [...instances].sort(
        (a, b) => a.createdAt - b.createdAt,
      )) {
        this.record('created', meta, meta.createdAt);
      }
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
        else if (this.isRecreationOfSelected(msg.meta.id)) {
          this.selectedId = msg.meta.id;
          this.history = [];
          this.watchSelected();
        }
        break;
      case 'changed': {
        const meta = this.instances.get(msg.id);
        if (!meta) return;
        const next = { ...meta, version: msg.version, updatedAt: msg.at };
        this.instances.set(msg.id, next);
        this.record('changed', next, msg.at, msg.version, msg.paths);
        break;
      }
      case 'status': {
        const meta = this.instances.get(msg.id);
        if (!meta) return;
        this.instances.set(msg.id, { ...meta, status: msg.status });
        break;
      }
      case 'ephemeral':
        for (const [className, count] of Object.entries(msg.counts)) {
          this.addChurn({ className, at: msg.at, count });
        }
        break;
      case 'disposed': {
        const meta = this.instances.get(msg.id);
        if (!meta) return;
        this.instances.delete(msg.id);
        if (msg.id === this.selectedId) this.history = [];
        this.record('disposed', meta, msg.at);
        if (msg.at - meta.createdAt < SHORT_LIVED_MS) {
          this.addChurn({ className: meta.className, at: msg.at, count: 1 });
        }
        break;
      }
      // Older agents keep disposed instances and send this when they drop one.
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
    this.log.push(entry);
    if (this.log.length > this.logSize * 2) {
      this.log = this.log.slice(-this.logSize);
    }
    this.logDirty = true;
  }

  private addChurn(entry: ChurnEntry): void {
    this.churn = [...this.churn.slice(1 - CHURN_SIZE), entry];
  }

  /** A keyed instance came back (`Id#n`) after the selected one was disposed. */
  private isRecreationOfSelected(id: string): boolean {
    return (
      !!this.selectedId &&
      !this.instances.has(this.selectedId) &&
      baseId(this.selectedId) === baseId(id)
    );
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
    if (this.logDirty) {
      this.logDirty = false;
      this.logView = this.log.slice(-this.logSize);
    }
    return {
      status: this.status,
      agentProtocol: this.agentProtocol,
      agentVersion: this.agentVersion,
      instances: [...this.instances.values()],
      selectedId: this.selectedId,
      history: this.history,
      log: this.logView,
      churn: this.churn,
    };
  }
}

const baseId = (id: string) => id.replace(/#\d+$/, '');

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
