import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vite-plus/test';
import { Cubit, blac, acquire, release, clearAll } from '@blac/core';
import { getPluginManager } from '@blac/core/plugins';
import { DevToolsAgent } from './agent';
import { serialize } from './serialize';
import { DevToolsClient } from './client';
import { createMemoryTransportPair } from './transport';
import { CONNECT_VERSION, PROTOCOL_VERSION, type AgentMsg } from './protocol';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  inc = () => this.patch({ count: this.state.count + 1 });
}

@blac({ excludeFromDevTools: true })
class HiddenCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}

@blac({ keepAlive: true })
class SessionCubit extends Cubit<{ user: string }> {
  constructor() {
    super({ user: '' });
  }
}

vi.mock('./serialize', async (importOriginal) => ({
  serialize: vi.fn(
    (await importOriginal<typeof import('./serialize')>()).serialize,
  ),
}));

let agent: DevToolsAgent;

const frame = async () => {
  await vi.advanceTimersByTimeAsync(20);
};

const connect = (transform?: (msg: AgentMsg) => AgentMsg | null) => {
  const pair = createMemoryTransportPair();
  if (transform) {
    const send = pair.agent.send.bind(pair.agent);
    pair.agent.send = (msg) => {
      const out = transform(msg);
      if (out) send(out);
    };
  }
  agent.connect(pair.agent);
  const client = new DevToolsClient(pair.client);
  return { client, pair };
};

const snapshot = async (client: DevToolsClient) => {
  await Promise.resolve();
  return client.getSnapshot();
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(serialize).mockClear();
  clearAll();
  getPluginManager().clear();
  agent = new DevToolsAgent();
  getPluginManager().install(agent);
});

afterEach(() => {
  getPluginManager().clear();
  clearAll();
  vi.useRealTimers();
});

describe('agent + client', () => {
  it('does no serialization or sending before a client says hello', async () => {
    const send = vi.fn();
    const { agent: transport } = createMemoryTransportPair();
    transport.send = send;
    agent.connect(transport);

    const cubit = acquire(CounterCubit);
    cubit.inc();
    await frame();

    expect(serialize).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('welcomes with existing instances and streams create / change / dispose', async () => {
    const cubit = acquire(CounterCubit);
    const { client } = connect();

    let state = await snapshot(client);
    expect(state.status).toBe('connected');
    expect(state.agentVersion).toBe(CONNECT_VERSION);
    expect(state.instances.map((i) => i.className)).toEqual(['CounterCubit']);

    cubit.inc();
    acquire(CounterCubit, { args: { id: 'b' } } as never);
    await frame();
    state = await snapshot(client);
    expect(state.instances[0].version).toBe(1);
    expect(state.log.map((l) => l.kind)).toEqual([
      'created',
      'created',
      'changed',
    ]);
    expect(state.log[2].paths).toEqual(['count']);

    release(CounterCubit);
    await frame();
    state = await snapshot(client);
    expect(state.instances).toHaveLength(1);
    expect(state.log[state.log.length - 1].kind).toBe('disposed');
  });

  it('streams every recorded change of the selected instance', async () => {
    const cubit = acquire(CounterCubit);
    cubit.inc();
    const { client } = connect();
    await snapshot(client);

    client.select(client.getSnapshot().instances[0].id);
    cubit.inc();
    await vi.advanceTimersByTimeAsync(1);
    cubit.inc();
    await frame();
    const state = await snapshot(client);

    expect(state.history.map((h) => h.version)).toEqual([0, 1, 2, 3]);
    expect(state.history[3].state).toEqual({ count: 3 });
    expect(state.log.filter((l) => l.kind === 'changed')).toHaveLength(1);
  });

  it('lists only live, non-excluded instances', async () => {
    acquire(HiddenCubit);
    acquire(CounterCubit);
    release(CounterCubit);
    acquire(CounterCubit);
    const { client } = connect();

    expect((await snapshot(client)).instances).toHaveLength(1);
  });

  it('keeps the selection on a re-created instance', async () => {
    const cubit = acquire(CounterCubit);
    cubit.inc();
    const { client } = connect();
    await snapshot(client);
    const firstId = client.getSnapshot().instances[0].id;
    client.select(firstId);

    release(CounterCubit);
    acquire(CounterCubit);
    await frame();
    const state = await snapshot(client);

    expect(state.instances).toHaveLength(1);
    expect(state.selectedId).toBe(firstId);
    expect(state.history.map((h) => h.version)).toEqual([0]);
  });

  it('recovers from a sequence gap with a snapshot', async () => {
    let dropNext = false;
    const cubit = acquire(CounterCubit);
    const { client } = connect((msg) => {
      if (dropNext && msg.t === 'changed') {
        dropNext = false;
        return null;
      }
      return msg;
    });
    await snapshot(client);

    dropNext = true;
    cubit.inc();
    await frame();
    cubit.inc();
    await frame();
    const state = await snapshot(client);

    expect(state.status).toBe('connected');
    expect(state.instances[0].version).toBe(2);
  });

  it('drops instances on bye and the log on a new session', async () => {
    const cubit = acquire(CounterCubit);
    const { client, pair } = connect();
    cubit.inc();
    await frame();

    pair.agent.send({ t: 'bye' });
    const gone = await snapshot(client);
    expect(gone.status).toBe('connecting');
    expect(gone.instances).toEqual([]);
    pair.agent.send({ t: 'ready', protocol: PROTOCOL_VERSION });
    const resumed = await snapshot(client);
    expect(resumed.status).toBe('connected');
    expect(resumed.log.map((l) => l.kind)).toEqual(['created', 'changed']);

    pair.agent.send({
      t: 'welcome',
      protocol: PROTOCOL_VERSION,
      session: 'other',
      seq: 1,
      instances: [],
    });
    const state = await snapshot(client);

    expect(state.instances).toEqual([]);
    expect(state.log).toEqual([]);
  });

  it('reports an incompatible agent', async () => {
    const { client } = connect((msg) =>
      msg.t === 'welcome' ? { ...msg, protocol: 99 } : msg,
    );
    const state = await snapshot(client);

    expect(state.status).toBe('incompatible');
    expect(state.agentProtocol).toBe(99);
  });

  it('stops sending after the client says bye', async () => {
    const cubit = acquire(CounterCubit);
    const sent = vi.fn();
    const { client } = connect((msg) => {
      sent(msg.t);
      return msg;
    });
    await snapshot(client);
    sent.mockClear();

    client.close();
    cubit.inc();
    await frame();

    expect(sent).not.toHaveBeenCalled();
  });

  it('reports lifetime, refs and an idle keepAlive instance', async () => {
    acquire(SessionCubit, { refId: 'shell' } as never);
    const { client } = connect();
    let [meta] = (await snapshot(client)).instances;
    expect(meta.keepAlive).toBe(true);
    expect(meta.isolated).toBe(false);
    expect(meta.status).toEqual({
      active: true,
      refs: ['shell'],
      hydration: 'idle',
    });

    release(SessionCubit, { refId: 'shell' } as never);
    await frame();
    [meta] = (await snapshot(client)).instances;
    expect(meta.status).toMatchObject({ active: false, refs: [] });
  });

  it('exposes the watched instance as $bloc', async () => {
    const cubit = acquire(CounterCubit);
    const { client } = connect();
    await snapshot(client);
    const g = globalThis as { $bloc?: unknown };

    client.select(client.getSnapshot().instances[0].id);
    expect(g.$bloc).toBe(cubit);
    client.select(null);
    expect(g.$bloc).toBeUndefined();
  });

  it('counts instances created and disposed within one flush as churn', async () => {
    const { client } = connect();
    await snapshot(client);

    for (let i = 0; i < 3; i++) {
      acquire(CounterCubit);
      release(CounterCubit);
    }
    await frame();
    const state = await snapshot(client);

    expect(state.instances).toEqual([]);
    expect(state.churn).toEqual([
      { className: 'CounterCubit', at: expect.any(Number), count: 3 },
    ]);
  });
});
