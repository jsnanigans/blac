import { describe, it, expect, beforeEach, afterEach } from 'vite-plus/test';
import { StateContainer } from './StateContainer';
import { globalRegistry } from './StateContainerRegistry';

class Dep extends StateContainer<{ n: number }, { id?: string }> {
  constructor() {
    super({ n: 0 });
  }
  static key = (a?: { id?: string }) => a?.id ?? 'default';
}

class Owner extends StateContainer<{ ok: boolean }> {
  constructor() {
    super({ ok: true });
  }
  private dep = this.depend(Dep);
  read = (id?: string) => this.dep.untracked(id ? { args: { id } } : undefined);
}

const reset = () => globalRegistry.clearAll();

describe('registry ownership', () => {
  beforeEach(reset);
  afterEach(reset);

  it('release() keeps a dependency a live owner still holds', () => {
    const owner = globalRegistry.acquire(Owner, 'o', { refId: 'r1' });
    const dep1 = owner.read();
    dep1.emit({ n: 42 });

    globalRegistry.acquire(Dep, 'default', { refId: 'ui' });
    globalRegistry.release(Dep, 'default', false, 'ui');

    expect(dep1.$blac.disposed).toBe(false);
    expect(owner.read()).toBe(dep1);
    expect(owner.read().state.n).toBe(42);
  });

  it('owner disposal releases dependents resolved with per-call args', () => {
    const owner = globalRegistry.acquire(Owner, 'o', { refId: 'r1' });
    const a = owner.read('a');
    const b = owner.read('b');

    globalRegistry.release(Owner, 'o', false, 'r1');

    expect(a.$blac.disposed).toBe(true);
    expect(b.$blac.disposed).toBe(true);
  });
});

describe('post-dispose mutation', () => {
  beforeEach(reset);
  afterEach(reset);

  it('emit and patch after dispose are ignored', () => {
    const dep = new Dep();
    const before = dep.state;
    dep.dispose();

    dep.emit({ n: 1 });
    dep.patch({ n: 2 });

    expect(dep.state).toBe(before);
  });
});
