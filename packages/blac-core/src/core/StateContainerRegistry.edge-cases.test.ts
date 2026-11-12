import { describe, it, expect, vi } from 'vite-plus/test';
import { blacTestSetup } from '@blac/core/testing';
import { Cubit } from './Cubit';
import {
  acquire,
  ensure,
  getRefIds,
  getRegistry,
  hasInstance,
  release,
} from '../registry';

class Dep extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
}

class Keyed extends Cubit<{ n: number }, { id: string; extra?: unknown }> {
  static key = (args: { id: string }) => args.id;
  constructor() {
    super({ n: 0 });
  }
}

describe('registry edge cases', () => {
  blacTestSetup();

  it('releases the depend() edges of an owner whose init() throws', () => {
    class Throws extends Cubit<{ n: number }> {
      dep = this.depend(Dep);
      constructor() {
        super({ n: 0 });
      }
      protected override init() {
        this.dep.untracked();
        throw new Error('boom');
      }
    }

    expect(() => acquire(Throws)).toThrow('boom');

    expect(hasInstance(Dep)).toBe(false);
  });

  it('depend() on a static-key class needs no default args', () => {
    class Owner extends Cubit<{ n: number }> {
      keyed = this.depend(Keyed);
      constructor() {
        super({ n: 0 });
      }
    }

    const owner = acquire(Owner);

    expect(owner.keyed.untracked({ args: { id: 'a' } })).toBeInstanceOf(Keyed);
  });

  it('keeps an instance a disposed listener recreates under the same key', () => {
    let recreated: Dep | undefined;
    getRegistry().on('disposed', (container) => {
      if (container instanceof Dep) recreated ??= ensure(Dep);
    });
    acquire(Dep, { refId: 'a' });

    release(Dep, { refId: 'a' });

    expect(recreated?.$blac.disposed).toBe(false);
    expect(hasInstance(Dep)).toBe(true);
  });

  it('warns once about mismatched args and tolerates non-plain ones', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    acquire(Keyed, { args: { id: 'a', extra: new Map() } });

    acquire(Keyed, { args: { id: 'a', extra: 1 } });
    acquire(Keyed, { args: { id: 'a', extra: 2 } });

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('an unnamed release drops an auto ref before a named one', () => {
    acquire(Dep, { refId: 'component' });
    acquire(Dep);

    release(Dep);

    expect(getRefIds(Dep)).toEqual(['component']);
  });
});

describe('stateChanged system event', () => {
  blacTestSetup();

  it('does not fire for emits that cancel out within a tick', async () => {
    class Toggle extends Cubit<{ on: boolean }> {
      events = 0;
      constructor() {
        super({ on: false });
        this.onSystemEvent('stateChanged', () => this.events++);
      }
    }
    const toggle = acquire(Toggle);
    const initial = toggle.state;

    toggle.emit({ on: true });
    toggle.emit(initial);
    await Promise.resolve();

    expect(toggle.events).toBe(0);
  });
});
