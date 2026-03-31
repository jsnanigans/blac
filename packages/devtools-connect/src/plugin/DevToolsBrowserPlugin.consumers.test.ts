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
  acquire,
  release,
  clearAll,
} from '@blac/core';
import type { ConsumerInfo } from '../types';
import { DevToolsBrowserPlugin } from './DevToolsBrowserPlugin';

class TestCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}

class OtherCubit extends Cubit<{ value: string }> {
  constructor() {
    super({ value: '' });
  }
}

const resetState = () => {
  clearAll();
  getPluginManager().clear();
};

const withPluginInstalled = (plugin: DevToolsBrowserPlugin) => {
  getPluginManager().install(plugin);
};

const fixture = {
  plugin: (enabled = true) => new DevToolsBrowserPlugin({ enabled }),
};

describe('DevToolsBrowserPlugin Consumer Tracking', () => {
  beforeEach(resetState);
  afterEach(resetState);

  it('should register a consumer for an existing instance', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    const instance = acquire(TestCubit);
    const instanceId = instance.instanceId;

    plugin.registerConsumer(instanceId, 'consumer-1', 'MyComponent');

    const consumers = plugin.getConsumers(instanceId);
    expect(consumers).toHaveLength(1);
    expect(consumers).toEqual([
      expect.objectContaining({
        id: 'consumer-1',
        componentName: 'MyComponent',
        mountedAt: expect.any(Number),
      }),
    ]);
  });

  it('should not register a consumer for a non-existent instance', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    plugin.registerConsumer('non-existent-id', 'consumer-1', 'MyComponent');

    const consumers = plugin.getConsumers('non-existent-id');
    expect(consumers).toHaveLength(0);
  });

  it('should register multiple consumers for the same instance', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    const instance = acquire(TestCubit);
    const instanceId = instance.instanceId;

    plugin.registerConsumer(instanceId, 'consumer-1', 'ComponentA');
    plugin.registerConsumer(instanceId, 'consumer-2', 'ComponentB');
    plugin.registerConsumer(instanceId, 'consumer-3', 'ComponentA');

    const consumers = plugin.getConsumers(instanceId) as ConsumerInfo[];
    expect(consumers).toHaveLength(3);
    expect(consumers.map((c) => c.componentName)).toEqual([
      'ComponentA',
      'ComponentB',
      'ComponentA',
    ]);
  });

  it('should unregister a consumer', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    const instance = acquire(TestCubit);
    const instanceId = instance.instanceId;

    plugin.registerConsumer(instanceId, 'consumer-1', 'ComponentA');
    plugin.registerConsumer(instanceId, 'consumer-2', 'ComponentB');

    plugin.unregisterConsumer(instanceId, 'consumer-1');

    const consumers = plugin.getConsumers(instanceId) as ConsumerInfo[];
    expect(consumers).toHaveLength(1);
    expect(consumers[0]).toEqual(
      expect.objectContaining({
        id: 'consumer-2',
        componentName: 'ComponentB',
      }),
    );
  });

  it('should handle unregistering from non-existent instance gracefully', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    expect(() => {
      plugin.unregisterConsumer('non-existent-id', 'consumer-1');
    }).not.toThrow();
  });

  it('should handle unregistering a non-existent consumer gracefully', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    const instance = acquire(TestCubit);
    const instanceId = instance.instanceId;

    plugin.registerConsumer(instanceId, 'consumer-1', 'MyComponent');

    expect(() => {
      plugin.unregisterConsumer(instanceId, 'non-existent-consumer');
    }).not.toThrow();

    const consumers = plugin.getConsumers(instanceId);
    expect(consumers).toHaveLength(1);
  });

  it('should clean up consumer map entry when last consumer unregisters', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    const instance = acquire(TestCubit);
    const instanceId = instance.instanceId;

    plugin.registerConsumer(instanceId, 'consumer-1', 'MyComponent');
    plugin.unregisterConsumer(instanceId, 'consumer-1');

    const consumers = plugin.getConsumers(instanceId);
    expect(consumers).toHaveLength(0);
  });

  it('should emit consumers-changed event on register', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    const subscriber = vi.fn();
    plugin.subscribe(subscriber);

    const instance = acquire(TestCubit);
    const instanceId = instance.instanceId;

    // Clear the instance-created event
    subscriber.mockClear();

    plugin.registerConsumer(instanceId, 'consumer-1', 'MyComponent');

    expect(subscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'consumers-changed',
        timestamp: expect.any(Number),
        data: expect.objectContaining({
          instanceId,
          consumers: [
            expect.objectContaining({
              id: 'consumer-1',
              componentName: 'MyComponent',
              mountedAt: expect.any(Number),
              stackTrace: expect.any(String),
            }),
          ],
          refIds: expect.any(Array),
        }),
      }),
    );
  });

  it('should emit consumers-changed event on unregister', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    const instance = acquire(TestCubit);
    const instanceId = instance.instanceId;

    plugin.registerConsumer(instanceId, 'consumer-1', 'ComponentA');
    plugin.registerConsumer(instanceId, 'consumer-2', 'ComponentB');

    const subscriber = vi.fn();
    plugin.subscribe(subscriber);

    plugin.unregisterConsumer(instanceId, 'consumer-1');

    expect(subscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'consumers-changed',
        data: expect.objectContaining({
          instanceId,
          consumers: [
            expect.objectContaining({
              id: 'consumer-2',
              componentName: 'ComponentB',
              stackTrace: expect.any(String),
            }),
          ],
          refIds: expect.any(Array),
        }),
      }),
    );
  });

  it('should emit empty consumers array when last consumer unregisters', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    const instance = acquire(TestCubit);
    const instanceId = instance.instanceId;

    plugin.registerConsumer(instanceId, 'consumer-1', 'MyComponent');

    const subscriber = vi.fn();
    plugin.subscribe(subscriber);

    plugin.unregisterConsumer(instanceId, 'consumer-1');

    expect(subscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'consumers-changed',
        data: expect.objectContaining({
          instanceId,
          consumers: [],
          refIds: expect.any(Array),
        }),
      }),
    );
  });

  it('should clean up consumers when instance is disposed', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    acquire(TestCubit);
    const instance = plugin.getInstances()[0];

    plugin.registerConsumer(instance.id, 'consumer-1', 'ComponentA');
    plugin.registerConsumer(instance.id, 'consumer-2', 'ComponentB');

    expect(plugin.getConsumers(instance.id)).toHaveLength(2);

    release(TestCubit);

    expect(plugin.getConsumers(instance.id)).toHaveLength(0);
  });

  it('should include consumers in getInstances response', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    const instance = acquire(TestCubit);
    const instanceId = instance.instanceId;

    plugin.registerConsumer(instanceId, 'consumer-1', 'MyComponent');

    const instances = plugin.getInstances();
    expect(instances).toHaveLength(1);
    expect((instances[0] as any).consumers).toEqual([
      expect.objectContaining({
        id: 'consumer-1',
        componentName: 'MyComponent',
      }),
    ]);
  });

  it('should not include consumers key when no consumers exist', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    acquire(TestCubit);

    const instances = plugin.getInstances();
    expect(instances).toHaveLength(1);
    expect((instances[0] as any).consumers).toBeUndefined();
  });

  it('should return all consumers grouped by instance when no instanceId given', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    const testInstance = acquire(TestCubit);
    const otherInstance = acquire(OtherCubit);

    plugin.registerConsumer(
      testInstance.instanceId,
      'consumer-1',
      'ComponentA',
    );
    plugin.registerConsumer(
      otherInstance.instanceId,
      'consumer-2',
      'ComponentB',
    );

    const allConsumers = plugin.getConsumers() as Record<string, any[]>;
    expect(Object.keys(allConsumers)).toHaveLength(2);
    expect(allConsumers[testInstance.instanceId]).toHaveLength(1);
    expect(allConsumers[otherInstance.instanceId]).toHaveLength(1);
  });

  it('should replace consumer if same consumerId is registered again', () => {
    const plugin = fixture.plugin();
    withPluginInstalled(plugin);

    const instance = acquire(TestCubit);
    const instanceId = instance.instanceId;

    plugin.registerConsumer(instanceId, 'consumer-1', 'OldName');
    plugin.registerConsumer(instanceId, 'consumer-1', 'NewName');

    const consumers = plugin.getConsumers(instanceId) as ConsumerInfo[];
    expect(consumers).toHaveLength(1);
    expect(consumers[0]).toEqual(
      expect.objectContaining({
        id: 'consumer-1',
        componentName: 'NewName',
      }),
    );
  });
});
