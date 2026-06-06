import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vite-plus/test';
import {
  Cubit,
  getPluginManager,
  blac,
  acquire,
  release,
  clearAll,
} from '@blac/core';
import { DevToolsBrowserPlugin } from './DevToolsBrowserPlugin';

// ============ Test Implementations ============

class TestCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}

@blac({ excludeFromDevTools: true })
class InternalCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}

class NormalCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}

// ============ Test Helpers ============

const resetState = () => {
  clearAll();
  getPluginManager().clear();
};

const withPluginInstalled = (plugin: DevToolsBrowserPlugin) => {
  getPluginManager().install(
    plugin as unknown as import('@blac/core').BlacPlugin,
  );
};

// ============ Fixtures ============

const fixture = {
  plugin: (enabled = true) => new DevToolsBrowserPlugin({ enabled }),
};

// ============ Tests ============

describe('DevToolsBrowserPlugin Lifecycle Integration', () => {
  beforeEach(resetState);
  afterEach(resetState);

  it('should receive onCreated when bloc is resolved', () => {
    const plugin = fixture.plugin();
    const spy = vi.spyOn(plugin, 'onCreated');
    withPluginInstalled(plugin);

    acquire(TestCubit);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        container: expect.objectContaining({
          instanceId: expect.any(String),
        }),
        getInstanceMetadata: expect.any(Function),
      }),
    );
  });

  it('should receive onDestroyed when bloc is disposed', () => {
    const plugin = fixture.plugin();
    const spy = vi.spyOn(plugin, 'onDestroyed');
    withPluginInstalled(plugin);

    acquire(TestCubit);
    release(TestCubit);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        container: expect.objectContaining({
          instanceId: expect.any(String),
        }),
        getInstanceMetadata: expect.any(Function),
      }),
    );
  });

  it('should track instances in cache', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    expect(plugin.getInstances()).toHaveLength(0);

    acquire(CounterCubit);
    expect(plugin.getInstances()).toHaveLength(1);
    expect(plugin.getInstances()[0].className).toBe('CounterCubit');

    release(CounterCubit);
    expect(plugin.getInstances()).toHaveLength(0);
  });

  it('should emit events to subscribers', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    const subscriber = vi.fn();
    plugin.subscribe(subscriber);

    acquire(TestCubit);

    expect(subscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'instance-created',
        timestamp: expect.any(Number),
        data: expect.objectContaining({ className: 'TestCubit' }),
      }),
    );

    release(TestCubit);

    expect(subscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'instance-disposed',
        timestamp: expect.any(Number),
        data: expect.objectContaining({
          className: 'TestCubit',
          isDisposed: true,
        }),
      }),
    );
  });

  it('should include createdFrom in instance-created event data', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    const subscriber = vi.fn();
    plugin.subscribe(subscriber);

    acquire(TestCubit);

    const createdEvent = subscriber.mock.calls.find(
      (call: any[]) => call[0]?.type === 'instance-created',
    );
    expect(createdEvent).toBeDefined();
    expect(createdEvent?.[0].data).toHaveProperty('createdFrom');
    expect(typeof createdEvent?.[0].data.createdFrom).toBe('string');
  });

  it('should scan existing instances on install', () => {
    acquire(TestCubit);

    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    expect(plugin.getInstances()).toHaveLength(1);
    expect(plugin.getInstances()[0].className).toBe('TestCubit');
  });

  it('should exclude instances marked with excludeFromDevTools', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    acquire(InternalCubit);
    acquire(NormalCubit);

    expect(plugin.getInstances()).toHaveLength(1);
    expect(plugin.getInstances()[0].className).toBe('NormalCubit');
  });
});

describe('DevToolsBrowserPlugin paths wire field', () => {
  beforeEach(resetState);
  afterEach(resetState);

  it('instance-updated event includes paths field as string[] or "all"', async () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    const instance = acquire(CounterCubit);

    const subscriber = vi.fn();
    plugin.subscribe(subscriber);

    instance.emit({ count: 1 });
    // onStateChange records on the microtask flush; the instance-updated event
    // is coalesced and emitted on the next animation frame.
    await new Promise((resolve) => setTimeout(resolve, 50));

    const updatedEvent = subscriber.mock.calls.find(
      (call: any[]) => call[0]?.type === 'instance-updated',
    );
    expect(updatedEvent).toBeDefined();
    const eventData = updatedEvent?.[0].data;
    expect(eventData).toHaveProperty('paths');
    const { paths } = eventData as { paths: unknown };
    expect(paths === 'all' || Array.isArray(paths)).toBe(true);
  });

  it('paths is "all" when emitting a full state replacement', async () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    const instance = acquire(CounterCubit);

    const subscriber = vi.fn();
    plugin.subscribe(subscriber);

    // emit() triggers ALL_PATHS in StructuralContainer single-consumer mode
    instance.emit({ count: 42 });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const updatedEvent = subscriber.mock.calls.find(
      (call: any[]) => call[0]?.type === 'instance-updated',
    );
    expect(updatedEvent).toBeDefined();
    // With a single consumer (the plugin's bridge), StructuralContainer short-circuits
    // to ALL_PATHS, so paths should be 'all'
    expect(updatedEvent?.[0].data.paths).toBe('all');
  });
});

describe('DevToolsBrowserPlugin time-travel', () => {
  beforeEach(resetState);
  afterEach(resetState);

  it('matches live instance by $blac.id and applies the state', async () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    const instance = acquire(CounterCubit);
    // $blac.id is the authoritative identity string
    const id = instance.$blac.id;
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);

    // timeTravel receives the same id string that was emitted via the wire
    // protocol (cmd.instanceId) and must resolve back to the live instance.
    const result = plugin.timeTravel(id, { count: 99 });

    expect(result).toBe(true);
    // The state was applied via emit()
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(instance.state.count).toBe(99);
  });

  it('returns false for an unknown instanceId', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    acquire(CounterCubit);

    const result = plugin.timeTravel('non-existent-id', { count: 0 });
    expect(result).toBe(false);
  });
});
