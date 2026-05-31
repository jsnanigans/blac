import { afterEach, expect, it, vi } from 'vitest';
import { acquire, clearAll } from '../registry';
import { Cubit } from './Cubit';
import { APPLY_DEPS, REMOVE_DEPS_OWNER } from './symbols';

type Deps = { a?: number; b?: number };

class R extends Cubit<Record<string, never>, void, Deps> {
  constructor() {
    super({});
  }
  changes: Array<[Deps, Deps]> = [];
  protected onDepsChanged(next: Readonly<Deps>, prev: Readonly<Deps>) {
    this.changes.push([{ ...next }, { ...prev }]);
  }
}

afterEach(() => clearAll());

it('merges disjoint slices from two owners', () => {
  const r = acquire(R);
  (r as any)[APPLY_DEPS]('o1', { a: 1 });
  (r as any)[APPLY_DEPS]('o2', { b: 2 });
  expect(r.deps).toEqual({ a: 1, b: 2 });
});

it("withdraws only the unmounting owner's keys", () => {
  const r = acquire(R);
  (r as any)[APPLY_DEPS]('o1', { a: 1 });
  (r as any)[APPLY_DEPS]('o2', { b: 2 });
  (r as any)[REMOVE_DEPS_OWNER]('o1');
  expect(r.deps).toEqual({ a: undefined, b: 2 });
});

it('fires onDepsChanged only on real change (idempotent re-apply)', () => {
  const r = acquire(R);
  (r as any)[APPLY_DEPS]('o1', { a: 1 });
  (r as any)[APPLY_DEPS]('o1', { a: 1 }); // no-op
  expect(r.changes.length).toBe(1);
  expect(r.changes[0]).toEqual([{ a: 1 }, {}]);
});

it('warns on cross-owner collision (last write wins)', () => {
  const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const r = acquire(R);
  (r as any)[APPLY_DEPS]('o1', { a: 1 });
  (r as any)[APPLY_DEPS]('o2', { a: 9 });
  expect(spy).toHaveBeenCalled();
  expect(r.deps).toEqual({ a: 9 });
  spy.mockRestore();
});

it('does not warn when the same owner re-applies a changed value', () => {
  const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const r = acquire(R);
  (r as any)[APPLY_DEPS]('o1', { a: 1 });
  (r as any)[APPLY_DEPS]('o1', { a: 2 });
  expect(spy).not.toHaveBeenCalled();
  expect(r.deps).toEqual({ a: 2 });
  spy.mockRestore();
});

it('drops a key to undefined when its last owner is removed, firing onDepsChanged', () => {
  const r = acquire(R);
  (r as any)[APPLY_DEPS]('o1', { a: 1 });
  expect(r.changes.length).toBe(1);
  (r as any)[REMOVE_DEPS_OWNER]('o1');
  expect(r.deps).toEqual({ a: undefined });
  expect(r.changes.length).toBe(2);
  expect(r.changes[1]).toEqual([{ a: undefined }, { a: 1 }]);
});

it('removing an unknown owner is a no-op (no onDepsChanged)', () => {
  const r = acquire(R);
  (r as any)[APPLY_DEPS]('o1', { a: 1 });
  const before = r.changes.length;
  (r as any)[REMOVE_DEPS_OWNER]('ghost');
  expect(r.changes.length).toBe(before);
});

it('reconciles when an owner drops a key it previously declared', () => {
  const r = acquire(R);
  (r as any)[APPLY_DEPS]('o1', { a: 1, b: 2 });
  (r as any)[APPLY_DEPS]('o1', { a: 1 }); // dropped b
  expect(r.deps).toEqual({ a: 1, b: undefined });
});

it('fires a final onDepsChanged with absent keys and rejects post-dispose applies', () => {
  const r = acquire(R);
  (r as any)[APPLY_DEPS]('o1', { a: 1 });
  const before = r.changes.length;
  r.dispose();
  expect(r.changes.length).toBe(before + 1);
  expect(r.changes[r.changes.length - 1][0]).toEqual({ a: undefined });
  // Post-dispose emits are rejected.
  (r as any)[APPLY_DEPS]('o2', { b: 5 });
  expect(r.deps).toEqual({ a: undefined });
});
