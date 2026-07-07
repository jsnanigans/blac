import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vite-plus/test';
import { PluginManager } from './PluginManager';
import { globalRegistry } from '../core/StateContainerRegistry';
import { Cubit } from '../core/Cubit';
import type { BlacPlugin } from './BlacPlugin';
import { acquire, release } from '../registry';

class CounterCubit extends Cubit<{ count: number }, { id?: string }> {
  constructor() {
    super({ count: 0 });
  }

  static key = (a?: { id?: string }) => a?.id ?? 'default';

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}

describe('PluginManager', () => {
  let manager: PluginManager;

  beforeEach(() => {
    // Clear global registry for test isolation
    globalRegistry.clearAll();

    // Create plugin manager with global registry
    manager = new PluginManager(globalRegistry);
  });

  afterEach(() => {
    // Clean up all instances after each test
    manager.clear();
    globalRegistry.clearAll();
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
          container: undefined,
          getInstanceMetadata: expect.any(Function),
          getState: expect.any(Function),
          getHydrationStatus: expect.any(Function),
          startHydration: expect.any(Function),
          applyHydratedState: expect.any(Function),
          finishHydration: expect.any(Function),
          waitForHydration: expect.any(Function),
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
    describe('onCreated', () => {
      it('should call onCreated when instance is created', () => {
        const onCreated = vi.fn();
        const plugin: BlacPlugin = {
          name: 'test-plugin',
          version: '1.0.0',
          onCreated,
        };

        manager.install(plugin);

        const counter = acquire(CounterCubit, { args: { id: 'main' } });

        expect(onCreated).toHaveBeenCalledOnce();
        expect(onCreated).toHaveBeenCalledWith(
          expect.objectContaining({ container: counter }),
        );
      });

      it('should not break if plugin hook throws error', () => {
        const plugin: BlacPlugin = {
          name: 'test-plugin',
          version: '1.0.0',
          onCreated: () => {
            throw new Error('Hook error');
          },
        };

        manager.install(plugin);

        expect(() =>
          acquire(CounterCubit, { args: { id: 'main' } }),
        ).not.toThrow();
      });
    });

    describe('onStateChange', () => {
      it('should call onStateChange with prev/next/paths on flush', async () => {
        const onStateChange = vi.fn();
        const plugin: BlacPlugin = {
          name: 'test-plugin',
          version: '1.0.0',
          onStateChange,
        };

        manager.install(plugin);

        const counter = acquire(CounterCubit, { args: { id: 'main' } });
        counter.increment();

        await new Promise<void>((r) => queueMicrotask(r));
        expect(onStateChange).toHaveBeenCalledOnce();
        const callArgs = onStateChange.mock.calls[0];
        expect(callArgs[0]).toEqual(
          expect.objectContaining({ container: counter }),
        );
        expect(callArgs[1]).toEqual({ count: 0 });
        expect(callArgs[2]).toEqual({ count: 1 });
        // `paths` is a PathSet (Set<PathId> or the ALL_PATHS sentinel)
        expect(callArgs[3]).toBeDefined();
      });

      it('rolling prev: second flush sees first flush state as prev', async () => {
        const calls: Array<{ prev: any; next: any }> = [];
        const plugin: BlacPlugin = {
          name: 'rolling',
          version: '1.0.0',
          onStateChange: (_ctx, prev, next) => {
            calls.push({ prev, next });
          },
        };

        manager.install(plugin);

        const counter = acquire(CounterCubit, { args: { id: 'main' } });
        counter.increment();
        await new Promise<void>((r) => queueMicrotask(r));
        counter.increment();
        await new Promise<void>((r) => queueMicrotask(r));

        expect(calls).toEqual([
          { prev: { count: 0 }, next: { count: 1 } },
          { prev: { count: 1 }, next: { count: 2 } },
        ]);
      });

      it('multiple plugins receive identical (prev, next, paths) per flush', async () => {
        const p1 = vi.fn();
        const p2 = vi.fn();
        manager.install({ name: 'p1', version: '1.0.0', onStateChange: p1 });
        manager.install({ name: 'p2', version: '1.0.0', onStateChange: p2 });

        const counter = acquire(CounterCubit, { args: { id: 'main' } });
        counter.increment();
        await new Promise<void>((r) => queueMicrotask(r));

        expect(p1).toHaveBeenCalledOnce();
        expect(p2).toHaveBeenCalledOnce();
        // prev/next/paths must match across plugins
        expect(p1.mock.calls[0][1]).toEqual(p2.mock.calls[0][1]);
        expect(p1.mock.calls[0][2]).toEqual(p2.mock.calls[0][2]);
        expect(p1.mock.calls[0][3]).toBe(p2.mock.calls[0][3]);
      });

      it('builds the PluginContext once per dispatch for multiple plugins', async () => {
        const buildContextSpy = vi.spyOn(manager as any, 'buildContext');

        const p1 = vi.fn();
        const p2 = vi.fn();
        manager.install({ name: 'p1', version: '1.0.0', onStateChange: p1 });
        manager.install({ name: 'p2', version: '1.0.0', onStateChange: p2 });
        buildContextSpy.mockClear();

        const counter = acquire(CounterCubit, { args: { id: 'main' } });
        counter.increment();
        await new Promise<void>((r) => queueMicrotask(r));

        expect(buildContextSpy).toHaveBeenCalledOnce();
        expect(p1).toHaveBeenCalledOnce();
        expect(p2).toHaveBeenCalledOnce();
        expect(p1.mock.calls[0][0]).toBe(p2.mock.calls[0][0]);
      });

      it('builds zero PluginContexts when no enabled plugin implements onStateChange', async () => {
        const buildContextSpy = vi.spyOn(manager as any, 'buildContext');

        manager.install({ name: 'no-hook', version: '1.0.0' });
        buildContextSpy.mockClear();

        const counter = acquire(CounterCubit, { args: { id: 'main' } });
        counter.increment();
        await new Promise<void>((r) => queueMicrotask(r));

        expect(buildContextSpy).not.toHaveBeenCalled();
      });
    });

    describe('onDestroyed', () => {
      it('should call onDestroyed when instance is disposed', () => {
        const onDestroyed = vi.fn();
        const plugin: BlacPlugin = {
          name: 'test-plugin',
          version: '1.0.0',
          onDestroyed,
        };

        manager.install(plugin);

        const counter = acquire(CounterCubit, { args: { id: 'main' } });
        release(CounterCubit, { args: { id: 'main' } });

        expect(onDestroyed).toHaveBeenCalledWith(
          expect.objectContaining({ container: counter }),
        );
      });
    });

    describe('onHydrationChange', () => {
      it('should call onHydrationChange on begin -> hydrated transitions', () => {
        const onHydrationChange = vi.fn();
        let capturedContext: any;
        const plugin: BlacPlugin = {
          name: 'test-plugin',
          version: '1.0.0',
          onHydrationChange,
          onInstall: (context) => {
            capturedContext = context;
          },
        };

        manager.install(plugin);

        const counter = acquire(CounterCubit, {
          args: { id: 'hydration-dispatch' },
        });

        capturedContext.startHydration(counter);
        capturedContext.finishHydration(counter);

        expect(onHydrationChange).toHaveBeenCalledTimes(2);
        expect(onHydrationChange.mock.calls[0]).toEqual([
          expect.objectContaining({ container: counter }),
          'hydrating',
          'idle',
        ]);
        expect(onHydrationChange.mock.calls[1]).toEqual([
          expect.objectContaining({ container: counter }),
          'hydrated',
          'hydrating',
        ]);
      });

      it('should call onHydrationChange on error transition', () => {
        const onHydrationChange = vi.fn();
        let capturedContext: any;
        const plugin: BlacPlugin = {
          name: 'test-plugin',
          version: '1.0.0',
          onHydrationChange,
          onInstall: (context) => {
            capturedContext = context;
          },
        };

        manager.install(plugin);

        const counter = acquire(CounterCubit, {
          args: { id: 'hydration-error' },
        });

        capturedContext.startHydration(counter);
        onHydrationChange.mockClear();
        capturedContext.failHydration(counter, new Error('boom'));

        expect(onHydrationChange).toHaveBeenCalledWith(
          expect.objectContaining({ container: counter }),
          'error',
          'hydrating',
        );
      });

      it('should not break if plugin hook throws error', () => {
        const plugin: BlacPlugin = {
          name: 'test-plugin',
          version: '1.0.0',
          onHydrationChange: () => {
            throw new Error('Hook error');
          },
        };

        manager.install(plugin);

        const counter = acquire(CounterCubit, {
          args: { id: 'hydration-throw' },
        });

        expect(() => counter.$blac.hydration.begin()).not.toThrow();
      });
    });

    it('should only call hooks for enabled plugins', () => {
      const onStateChange = vi.fn();
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        onStateChange,
      };

      manager.install(plugin, { enabled: false });

      const counter = acquire(CounterCubit, { args: { id: 'main' } });
      counter.increment();

      expect(onStateChange).not.toHaveBeenCalled();
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

      const counter = acquire(CounterCubit, { args: { id: 'main' } });
      const metadata = capturedContext.getInstanceMetadata(counter);

      expect(metadata).toMatchObject({
        id: counter.$blac.id,
        className: 'CounterCubit',
        isDisposed: false,
        name: counter.$blac.name,
        state: { count: 0 },
        hydrationStatus: 'idle',
        isHydrated: false,
        changedWhileHydrating: false,
      });
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

      const counter = acquire(CounterCubit, { args: { id: 'test-state' } });
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

      const counter1 = acquire(CounterCubit, { args: { id: 'query-test-1' } });
      const counter2 = acquire(CounterCubit, { args: { id: 'query-test-2' } });

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

      acquire(CounterCubit, { args: { id: 'types-test-1' } });
      acquire(CounterCubit, { args: { id: 'types-test-2' } });

      const types = capturedContext.getAllTypes();
      expect(types.length).toBeGreaterThanOrEqual(1);
      expect(types).toContain(CounterCubit);
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

      acquire(CounterCubit, { args: { id: 'stats-test-1' } });
      acquire(CounterCubit, { args: { id: 'stats-test-2' } });

      const stats = capturedContext.getStats();
      expect(stats.registeredTypes).toBeGreaterThanOrEqual(1);
      expect(stats.totalInstances).toBeGreaterThanOrEqual(2);
      expect(stats.typeBreakdown).toBeDefined();
    });

    it('should provide hydration controls', async () => {
      let capturedContext: any;
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        onInstall: (context) => {
          capturedContext = context;
        },
      };

      manager.install(plugin);

      const counter = acquire(CounterCubit, { args: { id: 'hydrate-test' } });

      capturedContext.startHydration(counter);
      expect(capturedContext.getHydrationStatus(counter)).toBe('hydrating');

      const applied = capturedContext.applyHydratedState(counter, { count: 5 });
      expect(applied).toBe(true);

      capturedContext.finishHydration(counter);

      await expect(
        capturedContext.waitForHydration(counter),
      ).resolves.toBeUndefined();
      expect(counter.state).toEqual({ count: 5 });
      expect(capturedContext.getInstanceMetadata(counter)).toMatchObject({
        hydrationStatus: 'hydrated',
        isHydrated: true,
      });
    });

    it('should prevent hydrated state from overwriting user changes', () => {
      let capturedContext: any;
      const plugin: BlacPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        onInstall: (context) => {
          capturedContext = context;
        },
      };

      manager.install(plugin);

      const counter = acquire(CounterCubit, {
        args: { id: 'dirty-hydration-test' },
      });

      capturedContext.startHydration(counter);
      counter.increment();

      const applied = capturedContext.applyHydratedState(counter, {
        count: 99,
      });

      expect(applied).toBe(false);
      expect(counter.state).toEqual({ count: 1 });
      expect(capturedContext.getInstanceMetadata(counter)).toMatchObject({
        changedWhileHydrating: true,
      });
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
