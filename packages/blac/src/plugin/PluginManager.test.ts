import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PluginManager } from './PluginManager';
import { StateContainerRegistry } from '../core/StateContainerRegistry';
import { Cubit } from '../core/Cubit';
import { Vertex } from '../core/Vertex';
import type { BlacPlugin } from './BlacPlugin';

class CounterCubit extends Cubit<{ count: number }, number> {
  constructor(p: number) {
    super({ count: p });
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}

type CounterEvent =
  | { type: 'increment'; timestamp: number }
  | { type: 'decrement'; timestamp: number };

class CounterVertex extends Vertex<{ count: number }, CounterEvent, number> {
  constructor(prop: number = 0) {
    super({ count: prop });
  }

  protected onEvent = (event: CounterEvent) => {
    if (event.type === 'increment') {
      this.emit({ count: this.state.count + 1 });
    } else {
      this.emit({ count: this.state.count - 1 });
    }
  };
}

describe('PluginManager', () => {
  let registry: StateContainerRegistry;
  let manager: PluginManager;

  beforeEach(() => {
    // Create new registry and set it globally for test isolation
    registry = new StateContainerRegistry();
    CounterCubit.setRegistry(registry);
    CounterVertex.setRegistry(registry);

    // Create plugin manager with this registry
    manager = new PluginManager(registry);
  });

  afterEach(() => {
    // Clean up all instances after each test
    manager.clear();
    registry.clearAll();
  });

  describe('install', () => {
    it('should install a plugin', () => {
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      manager.install(plugin);

      expect(manager.hasPlugin('test-plugin')).toBe(true);
      expect(manager.getPlugin('test-plugin')).toBe(plugin);
    });

    it('should call onInstall hook if provided', () => {
      const onInstall = vi.fn();
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        onInstall,
      };

      manager.install(plugin);

      expect(onInstall).toHaveBeenCalledOnce();
      expect(onInstall).toHaveBeenCalledWith(
        expect.objectContaining({
          getInstanceMetadata: expect.any(Function),
          getState: expect.any(Function),
          queryInstances: expect.any(Function),
          getAllTypes: expect.any(Function),
          getStats: expect.any(Function),
        }),
      );
    });

    it('should throw error if plugin already installed', () => {
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      manager.install(plugin);

      expect(() => manager.install(plugin)).toThrow(
        'Plugin "test-plugin" is already installed',
      );
    });

    it('should rollback if onInstall throws error', () => {
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        onInstall: () => {
          throw new Error('Install failed');
        },
      };

      expect(() => manager.install(plugin)).toThrow('Install failed');
      expect(manager.hasPlugin('test-plugin')).toBe(false);
    });

    it('should respect enabled flag', () => {
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      manager.install(plugin, { enabled: false });

      expect(manager.hasPlugin('test-plugin')).toBe(false);
    });

    it('should install when enabled is true', () => {
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      manager.install(plugin, { enabled: true });

      expect(manager.hasPlugin('test-plugin')).toBe(true);
    });
  });

  describe('uninstall', () => {
    it('should uninstall a plugin', () => {
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      manager.install(plugin);
      manager.uninstall('test-plugin');

      expect(manager.hasPlugin('test-plugin')).toBe(false);
    });

    it('should call onUninstall hook if provided', () => {
      const onUninstall = vi.fn();
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        onUninstall,
      };

      manager.install(plugin);
      manager.uninstall('test-plugin');

      expect(onUninstall).toHaveBeenCalledOnce();
    });

    it('should throw error if plugin not installed', () => {
      expect(() => manager.uninstall('unknown-plugin')).toThrow(
        'Plugin "unknown-plugin" is not installed',
      );
    });

    it('should not throw if onUninstall throws error', () => {
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        onUninstall: () => {
          throw new Error('Uninstall failed');
        },
      };

      manager.install(plugin);
      expect(() => manager.uninstall('test-plugin')).not.toThrow();
      expect(manager.hasPlugin('test-plugin')).toBe(false);
    });
  });

  describe('getPlugin', () => {
    it('should return installed plugin', () => {
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      manager.install(plugin);

      expect(manager.getPlugin('test-plugin')).toBe(plugin);
    });

    it('should return undefined for non-existent plugin', () => {
      expect(manager.getPlugin('unknown')).toBeUndefined();
    });
  });

  describe('getAllPlugins', () => {
    it('should return all installed plugins', () => {
      const plugin1: BlacPlugin = {
        name: 'plugin-1',
        version: '1.0.0',
      };
      const plugin2: BlacPlugin = {
        name: 'plugin-2',
        version: '2.0.0',
      };

      manager.install(plugin1);
      manager.install(plugin2);

      const plugins = manager.getAllPlugins();
      expect(plugins).toHaveLength(2);
      expect(plugins).toContain(plugin1);
      expect(plugins).toContain(plugin2);
    });

    it('should return empty array when no plugins installed', () => {
      expect(manager.getAllPlugins()).toEqual([]);
    });
  });

  describe('hasPlugin', () => {
    it('should return true for installed plugin', () => {
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      manager.install(plugin);

      expect(manager.hasPlugin('test-plugin')).toBe(true);
    });

    it('should return false for non-installed plugin', () => {
      expect(manager.hasPlugin('unknown')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should uninstall all plugins', () => {
      const plugin1: BlacPlugin = {
        name: 'plugin-1',
        version: '1.0.0',
      };
      const plugin2: BlacPlugin = {
        name: 'plugin-2',
        version: '2.0.0',
      };

      manager.install(plugin1);
      manager.install(plugin2);
      manager.clear();

      expect(manager.getAllPlugins()).toEqual([]);
      expect(manager.hasPlugin('plugin-1')).toBe(false);
      expect(manager.hasPlugin('plugin-2')).toBe(false);
    });

    it('should call onUninstall for all plugins', () => {
      const onUninstall1 = vi.fn();
      const onUninstall2 = vi.fn();

      const plugin1: BlacPlugin = {
        name: 'plugin-1',
        version: '1.0.0',
        onUninstall: onUninstall1,
      };
      const plugin2: BlacPlugin = {
        name: 'plugin-2',
        version: '2.0.0',
        onUninstall: onUninstall2,
      };

      manager.install(plugin1);
      manager.install(plugin2);
      manager.clear();

      expect(onUninstall1).toHaveBeenCalledOnce();
      expect(onUninstall2).toHaveBeenCalledOnce();
    });
  });

  describe('lifecycle hooks', () => {
    describe('onInstanceCreated', () => {
      it('should call onInstanceCreated when instance is created', () => {
        const onInstanceCreated = vi.fn();
        const plugin: BlacPlugin = {
          name: 'test-plugin',
          version: '1.0.0',
          onInstanceCreated,
        };

        manager.install(plugin);

        const counter = CounterCubit.resolve('main');

        expect(onInstanceCreated).toHaveBeenCalledOnce();
        expect(onInstanceCreated).toHaveBeenCalledWith(
          counter,
          expect.any(Object),
        );
      });

      it('should not break if plugin hook throws error', () => {
        const plugin: BlacPlugin = {
          name: 'test-plugin',
          version: '1.0.0',
          onInstanceCreated: () => {
            throw new Error('Hook error');
          },
        };

        manager.install(plugin);

        expect(() => CounterCubit.resolve('main', { props: 0 })).not.toThrow();
      });
    });

    describe('onStateChanged', () => {
      it('should call onStateChanged when state changes', () => {
        const onStateChanged = vi.fn();
        const plugin: BlacPlugin = {
          name: 'test-plugin',
          version: '1.0.0',
          onStateChanged,
        };

        manager.install(plugin);

        const counter = CounterCubit.resolve('main', { props: 0 });
        counter.increment();

        expect(onStateChanged).toHaveBeenCalledWith(
          counter,
          { count: 0 },
          { count: 1 },
          expect.any(String),
          expect.any(Object),
        );
      });
    });

    describe('onEventAdded', () => {
      it('should call onEventAdded when event is added', () => {
        const onEventAdded = vi.fn();
        const plugin: BlacPlugin = {
          name: 'test-plugin',
          version: '1.0.0',
          onEventAdded,
        };

        manager.install(plugin);

        const counter = CounterVertex.resolve('main', { props: 0 });
        counter.add({ type: 'increment', timestamp: Date.now() });

        expect(onEventAdded).toHaveBeenCalledWith(
          counter,
          expect.objectContaining({ type: 'increment' }),
          expect.any(Object),
        );
      });
    });

    describe('onInstanceDisposed', () => {
      it('should call onInstanceDisposed when instance is disposed', () => {
        const onInstanceDisposed = vi.fn();
        const plugin: BlacPlugin = {
          name: 'test-plugin',
          version: '1.0.0',
          onInstanceDisposed,
        };

        manager.install(plugin);

        const counter = CounterCubit.resolve('main', { props: 0 });
        CounterCubit.release('main');

        expect(onInstanceDisposed).toHaveBeenCalledWith(
          counter,
          expect.any(Object),
        );
      });
    });

    it('should only call hooks for enabled plugins', () => {
      const onStateChanged = vi.fn();
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        onStateChanged,
      };

      manager.install(plugin, { enabled: false });

      const counter = CounterCubit.resolve('main', { props: 0 });
      counter.increment();

      expect(onStateChanged).not.toHaveBeenCalled();
    });
  });

  describe('plugin context', () => {
    it('should provide getInstanceMetadata', () => {
      let capturedContext: any;
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        onInstall: (context) => {
          capturedContext = context;
        },
      };

      manager.install(plugin);

      const counter = CounterCubit.resolve('main', { props: 0 });
      const metadata = capturedContext.getInstanceMetadata(counter);

      expect(metadata).toMatchObject({
        id: counter.instanceId,
        className: 'CounterCubit',
        isDisposed: false,
        name: counter.name,
        state: { count: 0 },
      });
      expect(metadata.lastStateChangeTimestamp).toBeGreaterThan(0);
      expect(metadata.createdAt).toBeGreaterThan(0);
    });

    it('should provide getState', () => {
      let capturedContext: any;
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        onInstall: (context) => {
          capturedContext = context;
        },
      };

      manager.install(plugin);

      const counter = CounterCubit.resolve('test-state', { props: 0 });
      counter.increment();

      const state = capturedContext.getState(counter);
      expect(state).toEqual({ count: 1 });
    });

    it('should provide queryInstances', () => {
      let capturedContext: any;
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        onInstall: (context) => {
          capturedContext = context;
        },
      };

      manager.install(plugin);

      const counter1 = CounterCubit.resolve('query-test-1', { props: 0 });
      const counter2 = CounterCubit.resolve('query-test-2', { props: 0 });

      const instances = capturedContext.queryInstances(CounterCubit);
      expect(instances).toHaveLength(2);
      expect(instances).toContain(counter1);
      expect(instances).toContain(counter2);
    });

    it('should provide getAllTypes', () => {
      let capturedContext: any;
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        onInstall: (context) => {
          capturedContext = context;
        },
      };

      manager.install(plugin);

      CounterCubit.resolve('types-test-1', { props: 0 });
      CounterVertex.resolve('types-test-2', { props: 0 });

      const types = capturedContext.getAllTypes();
      expect(types.length).toBeGreaterThanOrEqual(2);
      expect(types).toContain(CounterCubit);
      expect(types).toContain(CounterVertex);
    });

    it('should provide getStats', () => {
      let capturedContext: any;
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        onInstall: (context) => {
          capturedContext = context;
        },
      };

      manager.install(plugin);

      CounterCubit.resolve('stats-test-1', { props: 0 });
      CounterCubit.resolve('stats-test-2', { props: 0 });

      const stats = capturedContext.getStats();
      expect(stats.registeredTypes).toBeGreaterThanOrEqual(1);
      expect(stats.totalInstances).toBeGreaterThanOrEqual(2);
      expect(stats.typeBreakdown).toBeDefined();
    });
  });

  describe('environment filtering', () => {
    it('should skip plugin in non-matching environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      manager.install(plugin, { environment: 'development' });

      expect(manager.hasPlugin('test-plugin')).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    it('should install plugin in matching environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      manager.install(plugin, { environment: 'development' });

      expect(manager.hasPlugin('test-plugin')).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });

    it('should install plugin when environment is "all"', () => {
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      manager.install(plugin, { environment: 'all' });

      expect(manager.hasPlugin('test-plugin')).toBe(true);
    });
  });
});
