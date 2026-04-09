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
  getPluginManager().install(plugin);
};

// ============ Fixtures ============

const fixture = {
  plugin: (enabled = true) => new DevToolsBrowserPlugin({ enabled }),
};

// ============ Tests ============

describe('DevToolsBrowserPlugin Lifecycle Integration', () => {
  beforeEach(resetState);
  afterEach(resetState);

  it('should receive onInstanceCreated when bloc is resolved', () => {
    const plugin = fixture.plugin();
    const spy = vi.spyOn(plugin, 'onInstanceCreated');
    withPluginInstalled(plugin);

    const instance = acquire(TestCubit);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      instance,
      expect.objectContaining({
        getInstanceMetadata: expect.any(Function),
      }),
    );
  });

  it('should receive onInstanceDisposed when bloc is disposed', () => {
    const plugin = fixture.plugin();
    const spy = vi.spyOn(plugin, 'onInstanceDisposed');
    withPluginInstalled(plugin);

    const instance = acquire(TestCubit);
    release(TestCubit);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      instance,
      expect.objectContaining({
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
