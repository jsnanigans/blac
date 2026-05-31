import { describe, it, expect, vi } from 'vitest';
import { blacTestSetup } from '@blac/core/testing';
import { acquire, getRegistry } from '../registry';
import { Cubit } from './Cubit';

// NOTE: StateContainer.state is a getter with no setter.
// Seed initial state via the super() call, not class-field assignment.

type UserCardState = Record<string, never>;

class UserCard extends Cubit<UserCardState, { userId: string }> {
  constructor() {
    super({});
  }
}

type DocState = Record<string, never>;

class Doc extends Cubit<DocState, { docId: string; readonly: boolean }> {
  constructor() {
    super({});
  }
  static key = (a: { docId: string }) => a.docId;
}

describe('StateContainerRegistry keying', () => {
  blacTestSetup();

  it('distinct args → distinct instances; same args → shared', () => {
    const a1 = acquire(UserCard, { args: { userId: 'a' }, refId: 'r' });
    const b1 = acquire(UserCard, { args: { userId: 'b' }, refId: 'r' });
    expect(a1).not.toBe(b1);

    const a2 = acquire(UserCard, { args: { userId: 'a' }, refId: 'r2' });
    expect(a1).toBe(a2);
  });

  it('static key ignores non-identity args', () => {
    const d1 = acquire(Doc, {
      args: { docId: 'd1', readonly: true },
      refId: 'r',
    });
    const d2 = acquire(Doc, {
      args: { docId: 'd1', readonly: false },
      refId: 'r2',
    });
    // static key only looks at docId → same key → same instance
    expect(d1).toBe(d2);
  });

  it('warns (no throw) on same-key arg mismatch', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Doc's static key excludes readonly → both resolve to key="d2"; the
    // stored args differ structurally → warn.
    acquire(Doc, { args: { docId: 'd2', readonly: true }, refId: 'r' });
    acquire(Doc, { args: { docId: 'd2', readonly: false }, refId: 'r2' });
    // Both reduce to key="d2"; args structurally differ → warn
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  it('internal tier: explicit instanceKey overrides derived key', () => {
    // The explicit-key branch of resolveKey is internal-only now; address it
    // directly through the registry to confirm it still short-circuits.
    const registry = getRegistry();
    const fixed1 = registry.acquire(UserCard, 'fixed', {
      args: { userId: 'x' },
      refId: 'r',
    });
    const fixed2 = registry.acquire(UserCard, 'fixed', {
      args: { userId: 'y' },
      refId: 'r2',
    });
    // Same explicit key → same instance.
    expect(fixed1).toBe(fixed2);
  });

  it('no-args blocs use default sentinel', () => {
    class Simple extends Cubit<{ v: number }> {
      constructor() {
        super({ v: 0 });
      }
    }
    const s1 = acquire(Simple);
    const s2 = acquire(Simple);
    expect(s1).toBe(s2);
  });

  it('undefined args and no-arg call both land on default sentinel', () => {
    type PlainState = Record<string, never>;
    class Plain extends Cubit<PlainState> {
      constructor() {
        super({});
      }
    }
    const a = acquire(Plain, { args: undefined, refId: 'ra' });
    const b = acquire(Plain, { refId: 'rb' });
    expect(a).toBe(b);
  });
});
