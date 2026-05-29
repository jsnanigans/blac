import { describe, expect, it } from 'vite-plus/test';
import { PathInterner } from './path-interner';
import { trackRender } from './tracker';
import type { PathSet } from './path-set';
import { ALL_PATHS } from './path-set';

const asPathStrings = (paths: PathSet, interner: PathInterner): string[] => {
  if (paths === ALL_PATHS || !(paths instanceof Set)) {
    throw new Error('expected Set<PathId>, got ALL_PATHS');
  }
  return [...paths].map((id) => interner.lookup(id)).sort();
};

describe('trackRender', () => {
  it('1. preserves property identity across repeated nested reads', () => {
    const interner = new PathInterner();
    const { value } = trackRender({ user: { name: 'a' } }, interner);
    expect(value.user).toBe(value.user);
  });

  it('2. records only the leaf (maximal) path on a nested read', () => {
    const interner = new PathInterner();
    const { value, paths } = trackRender(
      { user: { profile: { email: 'a@b' } } },
      interner,
    );
    void value.user.profile.email;
    // Ancestors (`user`, `user.profile`) are dropped as the read descends;
    // only the deepest path survives, so an unrelated change that merely
    // replaces an ancestor object does not falsely wake this consumer.
    expect(asPathStrings(paths, interner)).toEqual(['user.profile.email']);
  });

  it('3. records only the leaf path of an array index read', () => {
    const interner = new PathInterner();
    const { value, paths } = trackRender(
      {
        items: [{ name: 'x' }, { name: 'y' }, { name: 'z' }] as {
          name: string;
        }[],
      },
      interner,
    );
    void value.items[2].name;
    const strings = asPathStrings(paths, interner);
    expect(strings).toEqual(['items.2.name']);
  });

  it('4. iteration coarsens — records entry, not per-index', () => {
    const interner = new PathInterner();
    const { value, paths } = trackRender(
      { items: [{ price: 1 }, { price: 2 }, { price: 3 }] },
      interner,
    );
    const total = value.items.reduce((sum, it) => sum + it.price, 0);
    expect(total).toBe(6);
    const strings = asPathStrings(paths, interner);
    expect(strings).toContain('items');
    expect(strings).not.toContain('items.0');
    expect(strings).not.toContain('items.1');
    expect(strings).not.toContain('items.2');
    expect(strings).not.toContain('items.length');
  });

  it('4b. for..of coarsens for arrays of primitives', () => {
    const interner = new PathInterner();
    const { value, paths } = trackRender({ tags: ['a', 'b', 'c'] }, interner);
    const collected: string[] = [];
    for (const t of value.tags) collected.push(t);
    expect(collected).toEqual(['a', 'b', 'c']);
    const strings = asPathStrings(paths, interner);
    expect(strings).toContain('tags');
    expect(strings).not.toContain('tags.0');
    expect(strings).not.toContain('tags.length');
  });

  it('4c. .find coarsens — callback receives raw items', () => {
    const interner = new PathInterner();
    const { value, paths } = trackRender(
      { users: [{ active: false }, { active: true }] },
      interner,
    );
    const found = value.users.find((u) => u.active);
    expect(found?.active).toBe(true);
    const strings = asPathStrings(paths, interner);
    expect(strings).toContain('users');
    expect(strings).not.toContain('users.0');
    expect(strings).not.toContain('users.1');
  });

  it('5. conditional reads only record the taken branch', () => {
    const interner = new PathInterner();
    const { value, paths } = trackRender({ a: 1, b: 2 }, interner);
    const condition = true;
    const _x = condition ? value.a : value.b;
    void _x;
    const strings = asPathStrings(paths, interner);
    expect(strings).toContain('a');
    expect(strings).not.toContain('b');
  });

  it('6. re-reads do not re-record', () => {
    const interner = new PathInterner();
    const { value, paths } = trackRender({ a: 1 }, interner);
    void value.a;
    void value.a;
    void value.a;
    if (paths === ALL_PATHS || !(paths instanceof Set)) {
      throw new Error('expected Set');
    }
    expect(paths.size).toBe(1);
  });

  it('7. primitives are returned as-is', () => {
    const interner = new PathInterner();
    const state = { count: 42 };
    const { value } = trackRender(state, interner);
    expect(typeof value.count).toBe('number');
    expect(value.count).toBe(state.count);
  });

  it('8. null and undefined do not trap', () => {
    const interner = new PathInterner();
    const { value, paths } = trackRender(
      {
        maybe: null as null | { x: number },
        also: undefined as undefined | string,
      },
      interner,
    );
    expect(value.maybe).toBeNull();
    expect(value.also).toBeUndefined();
    const strings = asPathStrings(paths, interner);
    expect(strings).toContain('maybe');
    expect(strings).toContain('also');
  });

  it('8b. primitive / null state short-circuits with empty paths', () => {
    const interner = new PathInterner();
    expect(trackRender(null, interner).value).toBeNull();
    expect(trackRender(undefined, interner).value).toBeUndefined();
    expect(trackRender(42, interner).value).toBe(42);
    const { paths } = trackRender(null, interner);
    if (paths === ALL_PATHS || !(paths instanceof Set)) {
      throw new Error('expected Set');
    }
    expect(paths.size).toBe(0);
  });

  it('9. per-call caches do not leak — independent recordings', () => {
    const interner = new PathInterner();
    const shared = { user: { name: 'x' } };
    const a = trackRender(shared, interner);
    const b = trackRender(shared, interner);

    void a.value.user.name;
    // b's paths must still be empty
    if (b.paths === ALL_PATHS || !(b.paths instanceof Set)) {
      throw new Error('expected Set');
    }
    expect(b.paths.size).toBe(0);

    // and the two proxies are distinct objects
    expect(a.value).not.toBe(b.value);
    expect(a.value.user).not.toBe(b.value.user);
  });

  it('10. paths grow lazily after trackRender returns', () => {
    const interner = new PathInterner();
    const { value, paths } = trackRender({ a: 1, b: 2 }, interner);
    if (paths === ALL_PATHS || !(paths instanceof Set)) {
      throw new Error('expected Set');
    }
    // No reads yet: empty.
    expect(paths.size).toBe(0);

    // Simulate a later read (e.g., from useEffect closing over the proxy).
    void value.a;
    expect(paths.size).toBe(1);
    expect(asPathStrings(paths, interner)).toEqual(['a']);

    void value.b;
    expect(paths.size).toBe(2);
    expect(asPathStrings(paths, interner)).toEqual(['a', 'b']);
  });

  it('11. reading a method without invoking does not record', () => {
    const interner = new PathInterner();
    const { value, paths } = trackRender({ items: [1, 2, 3] }, interner);
    // Access the .map function reference but do not call it.
    const fn = value.items.map;
    expect(typeof fn).toBe('function');
    const strings = asPathStrings(paths, interner);
    expect(strings).toContain('items');
    expect(strings).not.toContain('items.map');
  });

  it('returned paths is always a Set, never ALL_PATHS', () => {
    const interner = new PathInterner();
    const { paths } = trackRender({ a: 1 }, interner);
    expect(paths).toBeInstanceOf(Set);
    expect(paths).not.toBe(ALL_PATHS);
  });

  it('method on a non-array object is bound so this.x records', () => {
    const interner = new PathInterner();
    const state = {
      first: 'Ada',
      last: 'Lovelace',
      full(this: { first: string; last: string }) {
        return `${this.first} ${this.last}`;
      },
    };
    const { value, paths } = trackRender(state, interner);
    expect(value.full()).toBe('Ada Lovelace');
    const strings = asPathStrings(paths, interner);
    expect(strings).toContain('full');
    expect(strings).toContain('first');
    expect(strings).toContain('last');
  });

  it('Map value is a leaf: .get works and records the entry path only', () => {
    const interner = new PathInterner();
    const state = { counts: new Map([['a', 1]]) };
    const { value, paths } = trackRender(state, interner);
    // Must not throw "Map.prototype.get called on incompatible receiver".
    expect(value.counts.get('a')).toBe(1);
    const strings = asPathStrings(paths, interner);
    expect(strings).toContain('counts');
    expect(strings).not.toContain('counts.a');
  });

  it('Set value is a leaf: .has works on the raw collection', () => {
    const interner = new PathInterner();
    const state = { tags: new Set(['x']) };
    const { value } = trackRender(state, interner);
    expect(value.tags.has('x')).toBe(true);
    expect(value.tags.size).toBe(1);
  });

  it('class instance is a leaf: methods retain their receiver', () => {
    const interner = new PathInterner();
    class Counter {
      n = 5;
      get() {
        return this.n;
      }
    }
    const state = { c: new Counter() };
    const { value, paths } = trackRender(state, interner);
    expect(value.c.get()).toBe(5);
    expect(asPathStrings(paths, interner)).toContain('c');
  });
});
