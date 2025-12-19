/**
 * Test DevTools plugin integration with lifecycle events
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cubit, getPluginManager, blac, acquire, release, clearAll } from '@blac/core';
import { DevToolsBrowserPlugin } from './DevToolsBrowserPlugin';

describe('DevToolsBrowserPlugin Lifecycle Integration', () => {
  beforeEach(() => {
    clearAll();
    getPluginManager().clear();
  });

  it('should receive onInstanceCreated when bloc is resolved', () => {
    const plugin = new DevToolsBrowserPlugin({ enabled: true });
    const spy = vi.spyOn(plugin, 'onInstanceCreated');

    // Install plugin BEFORE creating instances
    getPluginManager().install(plugin);

    class TestCubit extends Cubit<{ count: number }> {
      constructor() {
        super({ count: 0 });
      }
    }

    // Create instance
    const instance = acquire(TestCubit);

    // Verify plugin received the event
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      instance,
      expect.objectContaining({
        getInstanceMetadata: expect.any(Function),
      }),
    );
  });

  it('should receive onInstanceDisposed when bloc is disposed', () => {
    const plugin = new DevToolsBrowserPlugin({ enabled: true });
    const spy = vi.spyOn(plugin, 'onInstanceDisposed');

    getPluginManager().install(plugin);

    class TestCubit extends Cubit<{ count: number }> {
      constructor() {
        super({ count: 0 });
      }
    }

    const instance = acquire(TestCubit);
    release(TestCubit); // Triggers dispose (refCount = 0)

    // Verify plugin received the event
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      instance,
      expect.objectContaining({
        getInstanceMetadata: expect.any(Function),
      }),
    );
  });

  it('should track instances in cache', () => {
    const plugin = new DevToolsBrowserPlugin({ enabled: true });
    getPluginManager().install(plugin);

    class CounterCubit extends Cubit<{ count: number }> {
      constructor() {
        super({ count: 0 });
      }
    }

    // Initially no instances
    expect(plugin.getInstances()).toHaveLength(0);

    // Create instance
    acquire(CounterCubit);
    expect(plugin.getInstances()).toHaveLength(1);
    expect(plugin.getInstances()[0].className).toBe('CounterCubit');

    // Dispose instance
    release(CounterCubit);
    expect(plugin.getInstances()).toHaveLength(0);
  });

  it('should emit events to subscribers', () => {
    const plugin = new DevToolsBrowserPlugin({ enabled: true });
    getPluginManager().install(plugin);

    const subscriber = vi.fn();
    plugin.subscribe(subscriber);

    class TestCubit extends Cubit<{ count: number }> {
      constructor() {
        super({ count: 0 });
      }
    }

    // Create instance
    acquire(TestCubit);

    // Verify subscriber received the event
    expect(subscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'instance-created',
        timestamp: expect.any(Number),
        data: expect.objectContaining({
          className: 'TestCubit',
        }),
      }),
    );

    // Dispose instance
    release(TestCubit);

    // Verify subscriber received disposal event
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

  it('should scan existing instances on install', () => {
    class TestCubit extends Cubit<{ count: number }> {
      constructor() {
        super({ count: 0 });
      }
    }

    // Create instance BEFORE plugin is installed
    acquire(TestCubit);

    // Now install plugin
    const plugin = new DevToolsBrowserPlugin({ enabled: true });
    getPluginManager().install(plugin);

    // Plugin should have found the existing instance
    expect(plugin.getInstances()).toHaveLength(1);
    expect(plugin.getInstances()[0].className).toBe('TestCubit');
  });

  it('should exclude instances marked with excludeFromDevTools', () => {
    const plugin = new DevToolsBrowserPlugin({ enabled: true });
    getPluginManager().install(plugin);

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

    // Create both instances
    acquire(InternalCubit);
    acquire(NormalCubit);

    // Only normal instance should be tracked
    expect(plugin.getInstances()).toHaveLength(1);
    expect(plugin.getInstances()[0].className).toBe('NormalCubit');
  });
});
