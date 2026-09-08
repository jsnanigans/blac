import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  globalRegistry,
  StateContainerRegistry,
} from './StateContainerRegistry';
import { StateContainer } from './StateContainer';
import { clearAll } from '../registry';

class Dep extends StateContainer<{ v: number }> {
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

afterEach(() => clearAll());

describe('scoped registry isolation', () => {
  it('routes created/disposed to the owning registry, not the global one', () => {
    const scoped = new StateContainerRegistry();
    const scopedSeen: string[] = [];
    const globalSeen: string[] = [];
    const offScoped = scoped.on('created', (c) =>
      scopedSeen.push(c.$blac.name),
    );
    const offGlobal = globalRegistry.on('created', (c) =>
      globalSeen.push(c.$blac.name),
    );

    const instance = scoped.acquire(Dep, 'k', { refId: 'r1' });
    instance.dispose();

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

  it('delivers stateChanged to the owning registry', async () => {
    const scoped = new StateContainerRegistry();
    const listener = vi.fn();
    scoped.on('stateChanged', listener);

    scoped.acquire(Dep, 'k', { refId: 'r1' }).dispose();
    const live = scoped.acquire(Dep, 'k2', { refId: 'r2' });
    (live as unknown as { emit(s: { v: number }): void }).emit({ v: 9 });
    await Promise.resolve();

    expect(listener).toHaveBeenCalledTimes(1);
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
