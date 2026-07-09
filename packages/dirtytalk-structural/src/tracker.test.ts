import { describe, expect, it } from 'vite-plus/test';
import { PathInterner } from './path-interner';
import {
  __setPersistTrackingProxies,
  ProxyCache,
  raw,
  trackRender,
} from './tracker';
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

  it('4. iteration records per-field paths via bound proxy', () => {
    const interner = new PathInterner();
    const { value, paths } = trackRender(
      { items: [{ price: 1 }, { price: 2 }, { price: 3 }] },
      interner,
    );
    const total = value.items.reduce((sum, it) => sum + it.price, 0);
    expect(total).toBe(6);
    const strings = asPathStrings(paths, interner);
    // Per-field leaf paths — only `price` was accessed inside the callback.
    expect(strings).toContain('items.0.price');
    expect(strings).toContain('items.1.price');
    expect(strings).toContain('items.2.price');
    // length tracked (reduce reads it internally); items itself superseded.
    expect(strings).toContain('items.length');
    expect(strings).not.toContain('items');
  });

  it('4b. for..of records per-index paths for primitive arrays', () => {
    const interner = new PathInterner();
    const { value, paths } = trackRender({ tags: ['a', 'b', 'c'] }, interner);
    const collected: string[] = [];
    for (const t of value.tags) collected.push(t);
    expect(collected).toEqual(['a', 'b', 'c']);
    const strings = asPathStrings(paths, interner);
    // Primitives have no sub-properties — per-index paths are the leaves.
    expect(strings).toContain('tags.0');
    expect(strings).toContain('tags.1');
    expect(strings).toContain('tags.2');
    expect(strings).toContain('tags.length');
    expect(strings).not.toContain('tags');
  });

  it('4c. .find records per-field paths — callback receives sub-proxies', () => {
    const interner = new PathInterner();
    const { value, paths } = trackRender(
      { users: [{ active: false }, { active: true }] },
      interner,
    );
    const found = value.users.find((u) => u.active);
    expect(found?.active).toBe(true);
    const strings = asPathStrings(paths, interner);
    expect(strings).toContain('users.0.active');
    expect(strings).toContain('users.1.active');
    expect(strings).toContain('users.length');
    expect(strings).not.toContain('users');
  });

  it('4d. reading .length then iterating — tracks length and per-field paths', () => {
    const interner = new PathInterner();
    const { value, paths } = trackRender(
      { items: [{ status: 'sent' }, { status: 'sent' }] },
      interner,
    );
    if (value.items.length === 0) throw new Error('unreachable');
    const statuses = value.items.map((it) => it.status);
    expect(statuses).toEqual(['sent', 'sent']);
    const strings = asPathStrings(paths, interner);
    // length covers structural changes; per-field paths cover content changes.
    expect(strings).toContain('items.length');
    expect(strings).toContain('items.0.status');
    expect(strings).toContain('items.1.status');
    expect(strings).not.toContain('items');
  });

  it('4e. iterating then reading .length — same precise result regardless of order', () => {
    const interner = new PathInterner();
    const { value, paths } = trackRender(
      { items: [{ status: 'sent' }] },
      interner,
    );
    value.items.forEach(() => {});
    void value.items.length;
    const strings = asPathStrings(paths, interner);
    // forEach accessed items[0] but the callback read no fields — items.0 is
    // the leaf. length was read both internally and explicitly.
    expect(strings).toContain('items.length');
    expect(strings).toContain('items.0');
    expect(strings).not.toContain('items');
  });

  it('4f. reading only .length stays narrow (no array path)', () => {
    // A length-only consumer must NOT be widened to the whole array — pinning
    // only kicks in on iteration / method access.
    const interner = new PathInterner();
    const { value, paths } = trackRender({ items: [1, 2, 3] }, interner);
    void value.items.length;
    const strings = asPathStrings(paths, interner);
    expect(strings).toEqual(['items.length']);
  });

  it('4g. .includes(object) compares against raw elements, not proxies', () => {
    // Regression: binding array methods to the recording proxy hands callbacks
    // and identity-search methods *wrapped* elements. `.includes`/`.indexOf`
    // compare a raw argument with `===`, so they must see raw elements or they
    // silently return false / -1 for object arrays.
    const interner = new PathInterner();
    const target = { id: 2 };
    const { value, paths } = trackRender(
      { items: [{ id: 1 }, target, { id: 3 }] },
      interner,
    );
    expect(value.items.includes(target)).toBe(true);
    expect(value.items.indexOf(target)).toBe(1);
    expect(value.items.lastIndexOf(target)).toBe(1);
    expect(value.items.includes({ id: 2 })).toBe(false);
    // Identity-search coarsens to the array's entry path so any element-content
    // change still wakes the consumer.
    const strings = asPathStrings(paths, interner);
    expect(strings).toContain('items');
  });

  it('4h. .includes on a primitive array still works', () => {
    const interner = new PathInterner();
    const { value, paths } = trackRender({ tags: ['a', 'b', 'c'] }, interner);
    expect(value.tags.includes('b')).toBe(true);
    expect(value.tags.indexOf('c')).toBe(2);
    expect(value.tags.includes('z')).toBe(false);
    expect(asPathStrings(paths, interner)).toContain('tags');
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

  it('12. (A1) an object aliased at two paths records both leaf paths', () => {
    const interner = new PathInterner();
    const shared = { name: 'z' };
    const { value, paths } = trackRender({ a: shared, b: shared }, interner);
    void value.a.name;
    void value.b.name;
    const strings = asPathStrings(paths, interner);
    // The same object reached via two paths records both leaves.
    expect(strings).toContain('a.name');
    expect(strings).toContain('b.name');
    // Same (target, prefix) repeat read is ===-identical …
    expect(value.a).toBe(value.a);
    // … while distinct paths yield distinct proxies.
    expect(value.a).not.toBe(value.b);
  });

  it('13. (A2) reading a nested property of a frozen state does not throw; path recorded', () => {
    const interner = new PathInterner();
    const state = { user: Object.freeze({ profile: { name: 'a' } }) };
    const { value, paths } = trackRender(state, interner);
    let profile: { name: string } | undefined;
    // Without the descriptor guard this throws a Proxy [[Get]] invariant
    // TypeError (non-configurable, non-writable frozen property must return
    // the exact target value, not a wrapping proxy).
    expect(() => {
      profile = value.user.profile;
    }).not.toThrow();
    expect(profile?.name).toBe('a');
    const strings = asPathStrings(paths, interner);
    expect(strings).toContain('user.profile');
  });

  it('14. (A3) Object.keys over an object records its path', () => {
    const interner = new PathInterner();
    const { value, paths } = trackRender({ dict: { a: 1, b: 2 } }, interner);
    const keys = Object.keys(value.dict).sort();
    expect(keys).toEqual(['a', 'b']);
    const strings = asPathStrings(paths, interner);
    expect(strings).toContain('dict');
  });

  it('14b. (A3) `key in obj` records the queried child path', () => {
    const interner = new PathInterner();
    const { value, paths } = trackRender(
      { dict: { k: 1 } as Record<string, number> },
      interner,
    );
    expect('k' in value.dict).toBe(true);
    const strings = asPathStrings(paths, interner);
    expect(strings).toContain('dict.k');
  });

  it('16. (PN5) lazy prefix memo — interner.size stable + identical paths across renders', () => {
    const interner = new PathInterner();
    const fixture = () => ({
      user: { profile: { name: 'a' } },
      items: [{ price: 1 }, { price: 2 }],
    });

    const first = trackRender(fixture(), interner);
    void first.value.user.profile.name; // nested read
    const total = first.value.items.reduce((s, it) => s + it.price, 0); // iteration
    expect(total).toBe(3);
    const firstPaths = asPathStrings(first.paths, interner);
    const sizeAfterFirst = interner.size;

    // A second render doing the identical reads must record identical paths and
    // must not grow the interner — every prefix was interned already, and the
    // lazy per-proxy memo interns each prefix at most once per proxy.
    const second = trackRender(fixture(), interner);
    void second.value.user.profile.name;
    second.value.items.reduce((s, it) => s + it.price, 0);
    const secondPaths = asPathStrings(second.paths, interner);

    expect(secondPaths).toEqual(firstPaths);
    expect(interner.size).toBe(sizeAfterFirst);
  });

  it('15. (A4) raw() unwraps a tracked proxy and passes non-proxies through', () => {
    const interner = new PathInterner();
    const target = { name: 'a' };
    const { value } = trackRender({ user: target }, interner);
    const proxy = value.user;
    // It is a recording proxy, not the raw target …
    expect(proxy).not.toBe(target);
    // … and raw() unwraps it to the underlying target.
    expect(raw(proxy)).toBe(target);
    // Non-proxies pass through unchanged.
    const plain = { x: 1 };
    expect(raw(plain)).toBe(plain);
    expect(raw(42)).toBe(42);
    expect(raw(null)).toBeNull();
    expect(raw(undefined)).toBeUndefined();
  });
});

describe('trackRender — ProxyCache', () => {
  it('17. (PC1) ProxyCache reuses the proxy for an unchanged (target, prefix)', () => {
    __setPersistTrackingProxies(true);
    try {
      const interner = new PathInterner();
      const cache = new ProxyCache();
      const state = { items: [{ id: 1 }, { id: 2 }] };
      const first = trackRender(state, interner, cache);
      const firstItemProxy = first.value.items[0];
      const second = trackRender(state, interner, cache);
      const secondItemProxy = second.value.items[0];
      expect(secondItemProxy).toBe(firstItemProxy);
    } finally {
      __setPersistTrackingProxies(null);
    }
  });

  it('18. (PC2) an object moved to a new index gets a fresh proxy at the new path, not the old one', () => {
    __setPersistTrackingProxies(true);
    try {
      const interner = new PathInterner();
      const cache = new ProxyCache();
      const shared = { id: 42 };
      const before = { items: [shared, { id: 2 }] };
      const first = trackRender(before, interner, cache);
      const proxyAtIndex0 = first.value.items[0];
      void proxyAtIndex0.id;

      const after = { items: [{ id: 2 }, shared] };
      const second = trackRender(after, interner, cache);
      const proxyAtIndex1 = second.value.items[1];
      void proxyAtIndex1.id;

      // Different (target, prefix) key ⇒ different proxy — no cross-index reuse.
      expect(proxyAtIndex1).not.toBe(proxyAtIndex0);
      // The leaf path recorded reflects the CURRENT index, not the old one.
      const strings = asPathStrings(second.paths, interner);
      expect(strings).toContain('items.1.id');
      expect(strings).not.toContain('items.0.id');
      // raw() still unwraps to the actual shared target regardless of path.
      expect(raw(proxyAtIndex1)).toBe(shared);
      expect(raw(proxyAtIndex0)).toBe(shared);
    } finally {
      __setPersistTrackingProxies(null);
    }
  });

  it('19. (PC3) removing an item between renders does not throw or leak a stale proxy', () => {
    __setPersistTrackingProxies(true);
    try {
      const interner = new PathInterner();
      const cache = new ProxyCache();
      const state1 = { items: [{ id: 1 }, { id: 2 }, { id: 3 }] };
      const first = trackRender(state1, interner, cache);
      for (const item of first.value.items) void item.id;

      // ids 1 and 3 are the SAME object references as in state1.
      const state2 = { items: [state1.items[0], state1.items[2]] };
      expect(() => {
        const second = trackRender(state2, interner, cache);
        for (const item of second.value.items) void item.id;
      }).not.toThrow();
    } finally {
      __setPersistTrackingProxies(null);
    }
  });

  it('20. (PC4) aliasing still produces two independent proxies with a ProxyCache present', () => {
    __setPersistTrackingProxies(true);
    try {
      const interner = new PathInterner();
      const cache = new ProxyCache();
      const shared = { name: 'z' };
      const { value, paths } = trackRender({ a: shared, b: shared }, interner, cache);
      void value.a.name;
      void value.b.name;
      const strings = asPathStrings(paths, interner);
      expect(strings).toContain('a.name');
      expect(strings).toContain('b.name');
      expect(value.a).toBe(value.a);
      expect(value.a).not.toBe(value.b);
    } finally {
      __setPersistTrackingProxies(null);
    }
  });

  it('21. (PC5) disarm freezes a reused proxy; the next render reusing it re-arms correctly', () => {
    __setPersistTrackingProxies(true);
    try {
      const interner = new PathInterner();
      const cache = new ProxyCache();
      const state = { items: [{ id: 1 }] };
      const first = trackRender(state, interner, cache);
      const itemProxy = first.value.items[0];
      void itemProxy.id;
      first.disarm();
      // After disarm, further reads on the SAME proxy record nothing and return raw values.
      expect(itemProxy.id).toBe(1);

      const second = trackRender(state, interner, cache);
      const reusedProxy = second.value.items[0];
      expect(reusedProxy).toBe(itemProxy); // same proxy object, reused
      void reusedProxy.id; // should record into the SECOND render's paths now
      const strings = asPathStrings(second.paths, interner);
      expect(strings).toContain('items.0.id');
    } finally {
      __setPersistTrackingProxies(null);
    }
  });

  it('22. (PC6) two independent ProxyCache instances never cross-contaminate sessions', () => {
    __setPersistTrackingProxies(true);
    try {
      const interner = new PathInterner();
      const cacheA = new ProxyCache();
      const cacheB = new ProxyCache();
      const shared = { items: [{ id: 1 }] };

      const rA1 = trackRender(shared, interner, cacheA);
      void rA1.value.items[0].id;
      const rB1 = trackRender(shared, interner, cacheB);
      void rB1.value.items[0].id;

      // Each cache's proxy for the same target+prefix is independent.
      expect(rA1.value.items[0]).not.toBe(rB1.value.items[0]);

      const rA2 = trackRender(shared, interner, cacheA);
      // cacheA's second render reuses cacheA's own proxy, not cacheB's.
      expect(rA2.value.items[0]).toBe(rA1.value.items[0]);
      expect(rA2.value.items[0]).not.toBe(rB1.value.items[0]);

      // cacheA's paths are populated only from reads through cacheA's proxies.
      void rA2.value.items[0].id;
      const stringsA = asPathStrings(rA2.paths, interner);
      expect(stringsA).toContain('items.0.id');
    } finally {
      __setPersistTrackingProxies(null);
    }
  });

  it('23. (PC7) explicitly disabling via the override prevents reuse regardless of the production default', () => {
    __setPersistTrackingProxies(false);
    try {
      const interner = new PathInterner();
      const cache = new ProxyCache();
      const state = { items: [{ id: 1 }] };
      const first = trackRender(state, interner, cache);
      const second = trackRender(state, interner, cache);
      expect(second.value.items[0]).not.toBe(first.value.items[0]);
    } finally {
      __setPersistTrackingProxies(null);
    }
  });
});
