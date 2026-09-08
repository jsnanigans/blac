import { describe, expect, it, vi } from 'vite-plus/test';
import {
  globalRegistry,
  StateContainerRegistry,
} from './StateContainerRegistry';
import { Cubit } from './Cubit';
import { StateContainer } from './StateContainer';

class Dep extends Cubit<{ v: number }> {
  constructor() {
    super({ v: 1 });
  }
}

class Owner extends StateContainer<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
  readonly dep = this.depend(Dep);
  touchDep() {
    return this.dep.untracked();
  }
}

describe('scoped registry isolation', () => {
  it('routes created to the owning registry, not the global one', () => {
    const scoped = new StateContainerRegistry();
    const scopedSeen: string[] = [];
    const globalSeen: string[] = [];
    const offScoped = scoped.on('created', (c) =>
      scopedSeen.push(c.$blac.name),
    );
    const offGlobal = globalRegistry.on('created', (c) =>
      globalSeen.push(c.$blac.name),
    );

    scoped.acquire(Dep, 'k', { refId: 'r1' });

    offScoped();
    offGlobal();
    expect(scopedSeen).toEqual(['Dep']);
    expect(globalSeen).toEqual([]);
  });

  it('resolves depend() within the owning registry', () => {
    const scoped = new StateContainerRegistry();
    scoped.acquire(Owner, 'k', { refId: 'r1' }).touchDep();

    expect(scoped.getInstancesMap(Dep).size).toBe(1);
    expect(globalRegistry.getInstancesMap(Dep).size).toBe(0);
  });

  it('prunes the owning registry when an instance is disposed directly', () => {
    const scoped = new StateContainerRegistry();
    const instance = scoped.acquire(Dep, 'k', { refId: 'r1' });
    const id = instance.$blac.id;

    instance.dispose();

    expect(scoped.getInstancesMap(Dep).has('k')).toBe(false);
    expect(scoped.getRefIdsById(id)).toEqual([]);
  });

  it('sweeps dependent edges so a disposed owner releases its deps', () => {
    const scoped = new StateContainerRegistry();
    const owner = scoped.acquire(Owner, 'k', { refId: 'r1' });
    const dep = owner.touchDep();

    owner.dispose();

    expect(dep.$blac.disposed).toBe(true);
    expect(scoped.getInstancesMap(Dep).size).toBe(0);
  });

  it('delivers stateChanged to the owning registry, not the global one', async () => {
    const scoped = new StateContainerRegistry();
    const scopedListener = vi.fn();
    const globalListener = vi.fn();
    scoped.on('stateChanged', scopedListener);
    const offGlobal = globalRegistry.on('stateChanged', globalListener);

    scoped.acquire(Dep, 'k', { refId: 'r1' }).emit({ v: 9 });
    await Promise.resolve();

    offGlobal();
    expect(scopedListener).toHaveBeenCalledTimes(1);
    expect(globalListener).not.toHaveBeenCalled();
  });
});

describe('hasStateChangedListeners', () => {
  it('returns false once every listener is unsubscribed', () => {
    const registry = new StateContainerRegistry();
    const off = registry.on('stateChanged', () => {});
    expect(registry.hasStateChangedListeners).toBe(true);
    off();
    expect(registry.hasStateChangedListeners).toBe(false);
  });

  it('does not drift when the same listener is registered twice', () => {
    const registry = new StateContainerRegistry();
    const listener = () => {};
    const off1 = registry.on('stateChanged', listener);
    const off2 = registry.on('stateChanged', listener);
    off1();
    off2();
    expect(registry.hasStateChangedListeners).toBe(false);
  });
});
