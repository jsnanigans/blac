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
import { PROTOCOL_VERSION, type AgentMsg } from './protocol';

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
    expect(state.instances.map((i) => i.className)).toEqual(['CounterCubit']);

    cubit.inc();
    acquire(CounterCubit, { args: { id: 'b' } } as never);
    await frame();
    state = await snapshot(client);
    expect(state.instances[0].version).toBe(1);
    expect(state.log.map((l) => l.kind)).toEqual(['created', 'changed']);
    expect(state.log[1].paths).toEqual(['count']);

    release(CounterCubit);
    await frame();
    state = await snapshot(client);
    expect(state.instances[0].disposedAt).toBeTypeOf('number');
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

  it('drops disposed instances the agent no longer keeps', async () => {
    getPluginManager().clear();
    agent = new DevToolsAgent({ maxDisposed: 1 });
    getPluginManager().install(agent);
    const { client } = connect();

    acquire(CounterCubit);
    release(CounterCubit);
    acquire(CounterCubit);
    release(CounterCubit);
    await frame();

    expect((await snapshot(client)).instances).toHaveLength(1);
  });

  it('skips excluded instances and keeps ids unique across re-creation', async () => {
    acquire(HiddenCubit);
    acquire(CounterCubit);
    release(CounterCubit);
    acquire(CounterCubit);
    const { client } = connect();
    const ids = (await snapshot(client)).instances.map((i) => i.id);

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
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

  it('keeps data across a reconnect and resets on a new session', async () => {
    const cubit = acquire(CounterCubit);
    const { client, pair } = connect();
    cubit.inc();
    await frame();

    pair.agent.send({ t: 'bye' });
    expect((await snapshot(client)).status).toBe('connecting');
    pair.agent.send({ t: 'ready', protocol: PROTOCOL_VERSION });
    const resumed = await snapshot(client);
    expect(resumed.status).toBe('connected');
    expect(resumed.log).toHaveLength(1);

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
});
