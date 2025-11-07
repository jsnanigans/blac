/**
 * Test DevTools plugin integration with lifecycle events
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateContainer, Cubit, getPluginManager } from '@blac/core';
import { DevToolsBrowserPlugin } from './DevToolsBrowserPlugin';

describe('DevToolsBrowserPlugin Lifecycle Integration', () => {
  beforeEach(() => {
    StateContainer.clearAllInstances();
    getPluginManager().clear();
  });

  it('should receive onInstanceCreated when bloc is resolved', () => {
    const plugin = new DevToolsBrowserPlugin({ enabled: true });
    const spy = vi.spyOn(plugin, 'onInstanceCreated');

    // Install plugin BEFORE creating instances
    getPluginManager().install(plugin);

    class TestCubit extends Cubit<number> {
      constructor() {
        super(0);
      }
    }

    // Create instance
    const instance = TestCubit.resolve();

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

    class TestCubit extends Cubit<number> {
      constructor() {
        super(0);
      }
    }

    const instance = TestCubit.resolve();
    TestCubit.release(); // Triggers dispose (refCount = 0)

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

    class CounterCubit extends Cubit<number> {
      constructor() {
        super(0);
      }
    }

    // Initially no instances
    expect(plugin.getInstances()).toHaveLength(0);

    // Create instance
    CounterCubit.resolve();
    expect(plugin.getInstances()).toHaveLength(1);
    expect(plugin.getInstances()[0].className).toBe('CounterCubit');

    // Dispose instance
    CounterCubit.release();
    expect(plugin.getInstances()).toHaveLength(0);
  });

  it('should emit events to subscribers', () => {
    const plugin = new DevToolsBrowserPlugin({ enabled: true });
    getPluginManager().install(plugin);

    const subscriber = vi.fn();
    plugin.subscribe(subscriber);

    class TestCubit extends Cubit<number> {
      constructor() {
        super(0);
      }
    }

    // Create instance
    TestCubit.resolve();

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
    TestCubit.release();

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
    class TestCubit extends Cubit<number> {
      constructor() {
        super(0);
      }
    }

    // Create instance BEFORE plugin is installed
    TestCubit.resolve();

    // Now install plugin
    const plugin = new DevToolsBrowserPlugin({ enabled: true });
    getPluginManager().install(plugin);

    // Plugin should have found the existing instance
    expect(plugin.getInstances()).toHaveLength(1);
    expect(plugin.getInstances()[0].className).toBe('TestCubit');
  });

  it('should exclude instances marked with __excludeFromDevTools', () => {
    const plugin = new DevToolsBrowserPlugin({ enabled: true });
    getPluginManager().install(plugin);

    class InternalCubit extends Cubit<number> {
      static __excludeFromDevTools = true;

      constructor() {
        super(0);
      }
    }

    class NormalCubit extends Cubit<number> {
      constructor() {
        super(0);
      }
    }

    // Create both instances
    InternalCubit.resolve();
    NormalCubit.resolve();

    // Only normal instance should be tracked
    expect(plugin.getInstances()).toHaveLength(1);
    expect(plugin.getInstances()[0].className).toBe('NormalCubit');
  });
});
