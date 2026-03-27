import { describe, it, expect, vi } from 'vite-plus/test';
import { PluginManager, createPluginManager } from './PluginManager';
import {
  StateContainerRegistry,
  globalRegistry,
} from '../core/StateContainerRegistry';
import { Cubit } from '../core/Cubit';
import { acquire, release } from '../registry';
import type { BlacPlugin } from './BlacPlugin';

class SimpleBloc extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
}

let manager: PluginManager;

beforeEach(() => {
  globalRegistry.clearAll();
  manager = new PluginManager(globalRegistry);
});

afterEach(() => {
  manager.clear();
  globalRegistry.clearAll();
});

describe('PluginManager edge cases', () => {
  it('plugin with no hooks installs without error', () => {
    const plugin: BlacPlugin = { name: 'bare', version: '1.0.0' };
    expect(() => manager.install(plugin)).not.toThrow();
    expect(manager.hasPlugin('bare')).toBe(true);
  });

  it('multiple plugins all receive onStateChanged', () => {
    const onStateChanged1 = vi.fn();
    const onStateChanged2 = vi.fn();
    manager.install({
      name: 'p1',
      version: '1.0.0',
      onStateChanged: onStateChanged1,
    });
    manager.install({
      name: 'p2',
      version: '1.0.0',
      onStateChanged: onStateChanged2,
    });

    const bloc = acquire(SimpleBloc, 'default');
    bloc.emit({ n: 99 });

    expect(onStateChanged1).toHaveBeenCalledOnce();
    expect(onStateChanged2).toHaveBeenCalledOnce();
  });

  it('plugin with enabled: false never receives any hooks', () => {
    const onInstanceCreated = vi.fn();
    const onStateChanged = vi.fn();
    const onInstanceDisposed = vi.fn();

    manager.install(
      {
        name: 'disabled',
        version: '1.0.0',
        onInstanceCreated,
        onStateChanged,
        onInstanceDisposed,
      },
      { enabled: false },
    );

    const bloc = acquire(SimpleBloc, 'default');
    bloc.emit({ n: 1 });
    release(SimpleBloc, 'default');

    expect(onInstanceCreated).not.toHaveBeenCalled();
    expect(onStateChanged).not.toHaveBeenCalled();
    expect(onInstanceDisposed).not.toHaveBeenCalled();
  });

  it('plugin context queryInstances() returns empty for unregistered type', () => {
    let ctx: any;
    manager.install({
      name: 'p',
      version: '1.0.0',
      onInstall: (c) => {
        ctx = c;
      },
    });

    class UnknownBloc extends Cubit<{ x: number }> {
      constructor() {
        super({ x: 0 });
      }
    }

    const result = ctx.queryInstances(UnknownBloc);
    expect(result).toEqual([]);
  });

  it('plugin context getStats() reflects dynamic changes', () => {
    let ctx: any;
    manager.install({
      name: 'p',
      version: '1.0.0',
      onInstall: (c) => {
        ctx = c;
      },
    });

    const statsBefore = ctx.getStats();
    const instancesBefore = statsBefore.totalInstances;

    acquire(SimpleBloc, 'stats-a');
    acquire(SimpleBloc, 'stats-b');

    const statsAfter = ctx.getStats();
    expect(statsAfter.totalInstances).toBe(instancesBefore + 2);
  });

  it('createPluginManager() creates a fresh PluginManager', () => {
    const fresh = createPluginManager(globalRegistry);
    expect(fresh).toBeInstanceOf(PluginManager);
    expect(fresh.getAllPlugins()).toEqual([]);
    fresh.clear();
  });

  it('isolated registry: plugin on registryA does NOT receive events from registryB', () => {
    const registryA = new StateContainerRegistry();
    const registryB = new StateContainerRegistry();

    const onStateChanged = vi.fn();
    const managerA = new PluginManager(registryA);
    managerA.install({ name: 'plugin-a', version: '1.0.0', onStateChanged });

    const bloc = registryB.acquire(SimpleBloc, 'default');
    bloc.emit({ n: 42 });

    expect(onStateChanged).not.toHaveBeenCalled();

    managerA.clear();
    registryA.clearAll();
    registryB.clearAll();
  });

  it('plugin installed after instance creation does NOT receive retroactive onInstanceCreated', () => {
    acquire(SimpleBloc, 'pre-existing');

    const onInstanceCreated = vi.fn();
    manager.install({ name: 'late', version: '1.0.0', onInstanceCreated });

    expect(onInstanceCreated).not.toHaveBeenCalled();
  });

  it('clear() with no plugins is a no-op', () => {
    expect(() => manager.clear()).not.toThrow();
    expect(manager.getAllPlugins()).toEqual([]);
  });

  it('onInstanceDisposed called when instance is released', () => {
    const onInstanceDisposed = vi.fn();
    manager.install({ name: 'watcher', version: '1.0.0', onInstanceDisposed });

    const bloc = acquire(SimpleBloc, 'default');
    release(SimpleBloc, 'default');

    expect(onInstanceDisposed).toHaveBeenCalledOnce();
    expect(onInstanceDisposed).toHaveBeenCalledWith(bloc, expect.any(Object));
  });
});
