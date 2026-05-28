/// <reference types="vitest/globals" />
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

  it('multiple plugins all receive onStateChange', async () => {
    const onStateChange1 = vi.fn();
    const onStateChange2 = vi.fn();
    manager.install({
      name: 'p1',
      version: '1.0.0',
      onStateChange: onStateChange1,
    });
    manager.install({
      name: 'p2',
      version: '1.0.0',
      onStateChange: onStateChange2,
    });

    const bloc = acquire(SimpleBloc, 'default');
    bloc.emit({ n: 99 });

    await new Promise<void>((r) => queueMicrotask(r));
    expect(onStateChange1).toHaveBeenCalledOnce();
    expect(onStateChange2).toHaveBeenCalledOnce();
  });

  it('plugin with enabled: false never receives any hooks', () => {
    const onCreated = vi.fn();
    const onStateChange = vi.fn();
    const onDestroyed = vi.fn();

    manager.install(
      {
        name: 'disabled',
        version: '1.0.0',
        onCreated,
        onStateChange,
        onDestroyed,
      },
      { enabled: false },
    );

    const bloc = acquire(SimpleBloc, 'default');
    bloc.emit({ n: 1 });
    release(SimpleBloc, 'default');

    expect(onCreated).not.toHaveBeenCalled();
    expect(onStateChange).not.toHaveBeenCalled();
    expect(onDestroyed).not.toHaveBeenCalled();
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

  it('isolated registry: plugin on registryA does NOT receive events from registryB', async () => {
    const registryA = new StateContainerRegistry();
    const registryB = new StateContainerRegistry();

    const onStateChange = vi.fn();
    const managerA = new PluginManager(registryA);
    managerA.install({ name: 'plugin-a', version: '1.0.0', onStateChange });

    const bloc = registryB.acquire(SimpleBloc, 'default');
    bloc.emit({ n: 42 });

    await new Promise<void>((r) => queueMicrotask(r));
    expect(onStateChange).not.toHaveBeenCalled();

    managerA.clear();
    registryA.clearAll();
    registryB.clearAll();
  });

  it('plugin installed after instance creation does NOT receive retroactive onCreated', () => {
    acquire(SimpleBloc, 'pre-existing');

    const onCreated = vi.fn();
    manager.install({ name: 'late', version: '1.0.0', onCreated });

    expect(onCreated).not.toHaveBeenCalled();
  });

  it('clear() with no plugins is a no-op', () => {
    expect(() => manager.clear()).not.toThrow();
    expect(manager.getAllPlugins()).toEqual([]);
  });

  it('onDestroyed called when instance is released', () => {
    const onDestroyed = vi.fn();
    manager.install({ name: 'watcher', version: '1.0.0', onDestroyed });

    const bloc = acquire(SimpleBloc, 'default');
    release(SimpleBloc, 'default');

    expect(onDestroyed).toHaveBeenCalledOnce();
    expect(onDestroyed).toHaveBeenCalledWith(
      expect.objectContaining({ container: bloc }),
    );
  });
});
