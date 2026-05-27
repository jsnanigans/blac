import { describe, it, expect, vi } from 'vitest';
import { blacTestSetup } from '@blac/core/testing';
import { acquire } from '../registry';
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
    const a1 = acquire(UserCard, undefined, 'r', { userId: 'a' });
    const b1 = acquire(UserCard, undefined, 'r', { userId: 'b' });
    expect(a1).not.toBe(b1);

    const a2 = acquire(UserCard, undefined, 'r2', { userId: 'a' });
    expect(a1).toBe(a2);
  });

  it('static key ignores non-identity args', () => {
    const d1 = acquire(Doc, undefined, 'r', {
      docId: 'd1',
      readonly: true,
    });
    const d2 = acquire(Doc, undefined, 'r2', {
      docId: 'd1',
      readonly: false,
    });
    // static key only looks at docId → same key → same instance
    expect(d1).toBe(d2);
  });

  it('warns (no throw) on same-key arg mismatch', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Doc's static key excludes readonly → d2/false has same key as d2/true → no mismatch
    // (the key function strips readonly, so structuralKey(stored) === structuralKey(incoming)
    //  after key resolution both resolve to the same instance key "d2"; however the stored args
    //  differ structurally → warn)
    acquire(Doc, undefined, 'r', { docId: 'd2', readonly: true });
    acquire(Doc, undefined, 'r2', { docId: 'd2', readonly: false });
    // Both reduce to key="d2"; args structurally differ → warn
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  it('explicit instanceKey always overrides derived key', () => {
    const fixed1 = acquire(UserCard, 'fixed', 'r', { userId: 'x' });
    const fixed2 = acquire(UserCard, 'fixed', 'r2', { userId: 'y' });
    // Same explicit key → same instance (and triggers warn because args differ)
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
    const a = acquire(Plain, undefined, 'ra', undefined);
    const b = acquire(Plain, undefined, 'rb');
    expect(a).toBe(b);
  });
});
