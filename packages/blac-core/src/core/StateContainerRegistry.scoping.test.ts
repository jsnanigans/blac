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

// Emits and resolves a dep from init() itself, so the owning registry has to
// be bound *before* init() runs for either to reach the scoped registry.
class EagerOwner extends StateContainer<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
  readonly dep = this.depend(Dep);
  protected init(): void {
    this.dep.untracked();
    this.emit({ n: 1 });
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

  it('routes deps from init() to the owning registry', () => {
    const scoped = new StateContainerRegistry();

    scoped.acquire(EagerOwner, 'k', { refId: 'r1' });

    expect(scoped.getInstancesMap(Dep).size).toBe(1);
    expect(globalRegistry.getInstancesMap(Dep).size).toBe(0);
  });
});
