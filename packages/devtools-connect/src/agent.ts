import { ALL_PATHS } from '@blac/core';
import type { BlacPlugin, PathSet, PluginContext } from '@blac/core';
import {
  AGENT_HOOK,
  PROTOCOL_VERSION,
  type AgentMsg,
  type ClientMsg,
  type HistoryEntry,
  type InstanceMeta,
  type Paths,
  type SequencedAgentMsg,
} from './protocol';
import { serialize } from './serialize';
import {
  createWindowAgentTransport,
  type AgentHook,
  type AgentTransport,
} from './transport';

export interface DevToolsAgentConfig {
  /** Recorded changes kept per instance. */
  historySize?: number;
  /** Disposed instances kept listed. */
  maxDisposed?: number;
}

type Container = NonNullable<PluginContext['container']>;
type Body = SequencedAgentMsg extends infer M
  ? M extends M
    ? Omit<M, 'session' | 'seq'>
    : never
  : never;

interface Change {
  version: number;
  at: number;
  paths: Paths;
  state: unknown;
}

interface Entry {
  id: string;
  className: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  disposedAt?: number;
  version: number;
  args: unknown;
  ring: Change[];
}

interface Connection {
  transport: AgentTransport;
  active: boolean;
  seq: number;
  watching: string | null;
  created: string[];
  changed: Map<string, Paths>;
  disposed: Array<{ id: string; at: number }>;
  off: Array<() => void>;
}

const FLUSH_MS = 16;

const mergePaths = (a: Paths | undefined, b: Paths): Paths => {
  if (a === undefined) return b;
  if (a === 'all' || b === 'all') return 'all';
  return [...new Set([...a, ...b])];
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * The core only reports precise paths while a path-scoped consumer (e.g.
 * `useBloc`) is registered; otherwise it reports everything. In that case fall
 * back to the top-level keys that differ, which costs one shallow compare.
 */
function decodePaths(
  container: Container,
  paths: PathSet,
  prev: unknown,
  next: unknown,
): Paths {
  if (paths !== ALL_PATHS) {
    const { interner } = container as unknown as {
      interner: { lookup(id: number): string };
    };
    try {
      return [
        ...new Set(
          [...(paths as Set<number>)].map((id) => interner.lookup(id)),
        ),
      ];
    } catch {
      return 'all';
    }
  }
  if (!isObject(prev) || !isObject(next)) return 'all';
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const changed = [...keys].filter((key) => !Object.is(prev[key], next[key]));
  return changed.length > 0 ? changed : 'all';
}

/**
 * Records every container with plain references (no serialization) and only
 * serializes and sends once a client has said `hello`.
 */
export class DevToolsAgent implements BlacPlugin {
  readonly name = 'DevToolsAgent';
  readonly version = '3.0.0';

  private readonly session = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  private readonly historySize: number;
  private readonly maxDisposed: number;
  private readonly byContainer = new WeakMap<object, Entry>();
  private readonly byId = new Map<string, Entry>();
  private readonly disposedOrder: Entry[] = [];
  private readonly connections = new Set<Connection>();
  private hook: AgentHook | undefined;
  private duplicates = 0;
  private flushTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(config: DevToolsAgentConfig = {}) {
    this.historySize = config.historySize ?? 50;
    this.maxDisposed = config.maxDisposed ?? 100;
  }

  onInstall(): void {
    this.hook = { connect: (transport) => this.connect(transport) };
    (globalThis as Record<symbol, unknown>)[AGENT_HOOK] = this.hook;
    if (typeof window === 'undefined') return;
    const transport = createWindowAgentTransport();
    this.connect(transport);
    transport.send({ t: 'ready', protocol: PROTOCOL_VERSION });
  }

  onUninstall(): void {
    for (const conn of this.connections) {
      if (conn.active) this.rawSend(conn, { t: 'bye' });
      this.drop(conn);
    }
    clearTimeout(this.flushTimer);
    this.flushTimer = undefined;
    const g = globalThis as Record<symbol, unknown>;
    if (g[AGENT_HOOK] === this.hook) delete g[AGENT_HOOK];
  }

  onCreated(ctx: PluginContext): void {
    const container = ctx.container;
    if (!container || isExcluded(container)) return;

    const meta = ctx.getInstanceMetadata(container);
    const baseId = meta.id;
    const id = this.byId.has(baseId)
      ? `${baseId}#${++this.duplicates}`
      : baseId;
    const entry: Entry = {
      id,
      className: meta.className,
      name: meta.name,
      createdAt: meta.createdAt,
      updatedAt: meta.createdAt,
      version: 0,
      args: meta.args,
      ring: [
        {
          version: 0,
          at: meta.createdAt,
          paths: 'all',
          state: container.state,
        },
      ],
    };
    this.byContainer.set(container, entry);
    this.byId.set(id, entry);

    for (const conn of this.connections) if (conn.active) conn.created.push(id);
    this.scheduleFlush();
  }

  onStateChange(
    ctx: PluginContext,
    prev: unknown,
    next: unknown,
    paths: PathSet,
  ): void {
    const container = ctx.container;
    const entry = container && this.byContainer.get(container);
    if (!container || !entry) return;

    const at = Date.now();
    const decoded = decodePaths(container, paths, prev, next);
    entry.version++;
    entry.updatedAt = at;
    entry.ring.push({
      version: entry.version,
      at,
      paths: decoded,
      state: next,
    });
    if (entry.ring.length > this.historySize) entry.ring.shift();

    for (const conn of this.connections) {
      if (!conn.active) continue;
      conn.changed.set(
        entry.id,
        mergePaths(conn.changed.get(entry.id), decoded),
      );
    }
    this.scheduleFlush();
  }

  onDestroyed(ctx: PluginContext): void {
    const entry = ctx.container && this.byContainer.get(ctx.container);
    if (!entry) return;

    entry.disposedAt = Date.now();
    this.disposedOrder.push(entry);
    while (this.disposedOrder.length > this.maxDisposed) {
      const evicted = this.disposedOrder.shift();
      if (evicted) this.byId.delete(evicted.id);
    }

    for (const conn of this.connections) {
      if (conn.active)
        conn.disposed.push({ id: entry.id, at: entry.disposedAt });
    }
    this.scheduleFlush();
  }

  /** Attach a client transport. Nothing is sent until it says `hello`. */
  connect(transport: AgentTransport): () => void {
    const conn: Connection = {
      transport,
      active: false,
      seq: 0,
      watching: null,
      created: [],
      changed: new Map(),
      disposed: [],
      off: [],
    };
    this.connections.add(conn);
    conn.off.push(
      transport.onMessage((msg) => this.handle(conn, msg)),
      transport.onClose(() => this.drop(conn)),
    );
    return () => this.drop(conn);
  }

  private handle(conn: Connection, msg: ClientMsg): void {
    switch (msg.t) {
      case 'hello': {
        const compatible = msg.protocol === PROTOCOL_VERSION;
        this.reset(conn, compatible);
        this.send(conn, {
          t: 'welcome',
          protocol: PROTOCOL_VERSION,
          instances: compatible ? this.allMeta() : [],
        });
        break;
      }
      case 'bye':
        this.reset(conn, false);
        break;
      case 'watch':
        if (conn.active) conn.watching = msg.id;
        break;
      case 'history': {
        const entry = conn.active ? this.byId.get(msg.id) : undefined;
        if (!entry) break;
        const entries: HistoryEntry[] = entry.ring.map((c) => ({
          version: c.version,
          at: c.at,
          paths: c.paths,
          state: serialize(c.state),
        }));
        this.send(conn, { t: 'history', id: msg.id, entries });
        break;
      }
      case 'snapshot':
        if (!conn.active) break;
        this.reset(conn, true, conn.watching);
        this.send(conn, { t: 'snapshot', instances: this.allMeta() });
        break;
    }
  }

  private reset(
    conn: Connection,
    active: boolean,
    watching: string | null = null,
  ) {
    conn.active = active;
    conn.seq = 0;
    conn.watching = watching;
    conn.created = [];
    conn.changed.clear();
    conn.disposed = [];
  }

  private hasActive(): boolean {
    for (const conn of this.connections) if (conn.active) return true;
    return false;
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== undefined) return;
    if (!this.hasActive()) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = undefined;
      this.flush();
    }, FLUSH_MS);
  }

  private flush(): void {
    for (const conn of this.connections) {
      if (!conn.active) continue;
      const { created, changed, disposed } = conn;
      conn.created = [];
      conn.changed = new Map();
      conn.disposed = [];

      for (const id of created) {
        const entry = this.byId.get(id);
        if (entry) this.send(conn, { t: 'created', meta: this.meta(entry) });
        changed.delete(id);
      }
      for (const [id, paths] of changed) {
        const entry = this.byId.get(id);
        if (!entry) continue;
        this.send(conn, {
          t: 'changed',
          id,
          version: entry.version,
          at: entry.updatedAt,
          paths,
          ...(conn.watching === id && {
            state: serialize(entry.ring[entry.ring.length - 1]?.state),
          }),
        });
      }
      for (const { id, at } of disposed) {
        this.send(conn, { t: 'disposed', id, at });
      }
    }
  }

  private allMeta(): InstanceMeta[] {
    return [...this.byId.values()].map((entry) => this.meta(entry));
  }

  private meta(entry: Entry): InstanceMeta {
    return {
      id: entry.id,
      className: entry.className,
      name: entry.name,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      version: entry.version,
      ...(entry.disposedAt !== undefined && { disposedAt: entry.disposedAt }),
      ...(entry.args !== undefined && { args: serialize(entry.args) }),
    };
  }

  private send(conn: Connection, body: Body): void {
    this.rawSend(conn, {
      ...body,
      session: this.session,
      seq: ++conn.seq,
    } as AgentMsg);
  }

  private rawSend(conn: Connection, msg: AgentMsg): void {
    try {
      conn.transport.send(msg);
    } catch {
      this.drop(conn);
    }
  }

  private drop(conn: Connection): void {
    if (!this.connections.delete(conn)) return;
    for (const off of conn.off) off();
    conn.active = false;
  }
}

function isExcluded(container: Container): boolean {
  return (
    (container.constructor as { __excludeFromDevTools?: boolean })
      .__excludeFromDevTools === true
  );
}

export function createDevToolsAgent(
  config?: DevToolsAgentConfig,
): DevToolsAgent {
  return new DevToolsAgent(config);
}
