import { describe, it, expect } from 'vite-plus/test';
import {
  createProxyState,
  startProxy,
  createForTarget,
  stopProxy,
  createDependencyState,
  startDependency,
  createDependencyProxy,
  capturePaths,
  hasDependencyChanges,
} from './tracking-proxy';

// ============ Fixtures ============

const fixture = {
  proxy: <T>(target: T) => {
    const state = createProxyState<any>();
    startProxy(state);
    const proxy = createForTarget(state, target);
    return { proxy, stop: () => stopProxy(state) };
  },
};

// ============ Tests ============

describe('proxy-tracker edge cases', () => {
  describe('Arrays', () => {
    it('should track array length access', () => {
      const { proxy, stop } = fixture.proxy([1, 2, 3]);

      void proxy.length;

      const paths = stop();
      expect(paths.has('length')).toBe(true);
    });

    it('should track array index access', () => {
      const { proxy, stop } = fixture.proxy([1, 2, 3]);

      void proxy[1];

      const paths = stop();
      expect(paths.has('[1]')).toBe(true);
    });

    it('tracks per-index paths when iterating with .map', () => {
      const { proxy, stop } = fixture.proxy([1, 2, 3]);

      const result = proxy.map((x: number) => x * 2);

      const paths = stop();
      expect(result).toEqual([2, 4, 6]);
      expect(paths.has('[0]')).toBe(true);
      expect(paths.has('[1]')).toBe(true);
      expect(paths.has('[2]')).toBe(true);
    });

    describe('array index tracking', () => {
      it('tracks the index path when value is a proxyable object', () => {
        const state = createProxyState<unknown>();
        state.isTracking = true;
        const obj = { items: [{ name: 'a' }, { name: 'b' }] };
        const proxy = createForTarget(state, obj) as typeof obj;
        // Access items[0] but do NOT deref further:
        void proxy.items[0];
        expect(state.trackedPaths.has('items[0]')).toBe(true);
      });

      it('still tracks the path when value is a primitive', () => {
        const state = createProxyState<unknown>();
        state.isTracking = true;
        const obj = { items: [1, 2, 3] };
        const proxy = createForTarget(state, obj) as typeof obj;
        void proxy.items[0];
        expect(state.trackedPaths.has('items[0]')).toBe(true);
      });
    });
  });

  describe('Circular State', () => {
    it('should handle circular references gracefully', () => {
      const target: any = { name: 'root' };
      target.self = target;

      const { proxy, stop } = fixture.proxy(target);

      const circular = proxy.self;
      expect(circular).toBeDefined();

      const name = circular.name;
      expect(name).toBe('root');

      const paths = stop();
      expect(paths.has('self')).toBe(true);
      expect(paths.has('name')).toBe(true);
    });
  });

  describe('Object Keys', () => {
    it('should track when Object.keys is called', () => {
      const { proxy, stop } = fixture.proxy({ a: 1, b: 2 });

      Object.keys(proxy);

      const paths = stop();
      expect(paths.size).toBe(0);
    });

    it('should track nested object keys', () => {
      const { proxy, stop } = fixture.proxy({ nested: { a: 1, b: 2 } });

      Object.keys(proxy.nested);

      const paths = stop();
      expect(paths.has('nested')).toBe(true);
    });
  });

  describe('Non-Proxyable Types', () => {
    it('should handle Map and Set without crashing', () => {
      const map = new Map();
      const set = new Set();

      const { proxy, stop } = fixture.proxy({ map, set });

      expect(proxy.map).toBe(map);
      expect(proxy.set).toBe(set);

      const paths = stop();
      expect(paths.has('map')).toBe(true);
      expect(paths.has('set')).toBe(true);
    });
  });

  describe('nested proxy cache — path correctness across state shapes', () => {
    it('uses the correct path when a shared nested object moves between states', () => {
      const state = createProxyState<unknown>();
      state.isTracking = true;

      const shared = { x: 1 };
      const stateA = { a: shared };
      const pA = createForTarget(state, stateA) as typeof stateA;
      void pA.a.x;
      expect(state.trackedPaths.has('a.x')).toBe(true);

      // Move to stateB where `shared` lives at a different key.
      state.trackedPaths.clear();
      const stateB = { other: shared };
      const pB = createForTarget(state, stateB) as typeof stateB;
      void pB.other.x;

      expect(state.trackedPaths.has('other.x')).toBe(true);
      expect(state.trackedPaths.has('a.x')).toBe(false); // pre-fix this leaks
    });

    it('drops nested proxies from the cache after a state swap', () => {
      const state = createProxyState<unknown>();
      state.isTracking = true;
      const inner = { x: 1 };
      const s1 = { a: inner };
      const p1 = createForTarget(state, s1) as typeof s1;
      void p1.a;
      const cachedBefore = state.proxyCache.has(inner);
      expect(cachedBefore).toBe(true);

      const s2 = { b: 2 };
      createForTarget(state, s2);
      expect(state.proxyCache.has(inner)).toBe(false);
    });
  });

  describe('boundFunctionsCache — per-target', () => {
    it('binds Array.prototype methods to the correct target', () => {
      const state = createProxyState<unknown>();
      state.isTracking = true;
      const obj = { users: [1, 2, 3], posts: [10, 20, 30] };
      const proxy = createForTarget(state, obj) as typeof obj;

      const r1 = proxy.users.map((x) => x * 100);
      const r2 = proxy.posts.map((x) => x * 100);

      expect(r1).toEqual([100, 200, 300]);
      expect(r2).toEqual([1000, 2000, 3000]); // pre-fix: [100,200,300]
    });

    it('returns stable identity for the same (target, method) pair', () => {
      const state = createProxyState<unknown>();
      state.isTracking = true;
      const obj = { items: [1, 2, 3] };
      const proxy = createForTarget(state, obj) as typeof obj;

      const m1 = proxy.items.map;
      const m2 = proxy.items.map;
      expect(m1).toBe(m2);
    });

    it('returns distinct identity for the same method on different targets', () => {
      const state = createProxyState<unknown>();
      state.isTracking = true;
      const obj = { a: [1], b: [2] };
      const proxy = createForTarget(state, obj) as typeof obj;

      expect(proxy.a.map).not.toBe(proxy.b.map);
    });
  });

  describe('Symbol.iterator — proxied iteration', () => {
    it('yields proxied items so property access is tracked', () => {
      const state = createProxyState<unknown>();
      state.isTracking = true;
      const obj = {
        items: [{ id: 'a', title: 'first' }, { id: 'b', title: 'second' }],
      };
      const proxy = createForTarget(state, obj) as typeof obj;

      let titles = '';
      for (const item of proxy.items) {
        titles += item.title + ',';
      }

      expect(titles).toBe('first,second,');
      expect(state.trackedPaths.has('items[0].title')).toBe(true);
      expect(state.trackedPaths.has('items[1].title')).toBe(true);
    });

    it('tracks length and each index even if the user does not dereference', () => {
      const state = createProxyState<unknown>();
      state.isTracking = true;
      const obj = { items: [{ a: 1 }, { a: 2 }, { a: 3 }] };
      const proxy = createForTarget(state, obj) as typeof obj;

      for (const _ of proxy.items) {
        // no dereference
      }
      expect(state.trackedPaths.has('items.length')).toBe(true);
      expect(state.trackedPaths.has('items[0]')).toBe(true);
      expect(state.trackedPaths.has('items[1]')).toBe(true);
      expect(state.trackedPaths.has('items[2]')).toBe(true);
    });

    it('preserves primitive items', () => {
      const state = createProxyState<unknown>();
      state.isTracking = true;
      const obj = { nums: [1, 2, 3] };
      const proxy = createForTarget(state, obj) as typeof obj;

      const out: number[] = [];
      for (const n of proxy.nums) out.push(n);
      expect(out).toEqual([1, 2, 3]);
    });

    it('Array.from on the proxy yields proxied items', () => {
      // Array.from uses Symbol.iterator
      const state = createProxyState<unknown>();
      state.isTracking = true;
      const obj = { items: [{ x: 1 }, { x: 2 }] };
      const proxy = createForTarget(state, obj) as typeof obj;

      const copies = Array.from(proxy.items, (item) => item.x);
      expect(copies).toEqual([1, 2]);
      expect(state.trackedPaths.has('items[0].x')).toBe(true);
      expect(state.trackedPaths.has('items[1].x')).toBe(true);
    });

    it('destructuring iterates via Symbol.iterator', () => {
      const state = createProxyState<unknown>();
      state.isTracking = true;
      const obj = { items: [{ y: 'a' }, { y: 'b' }] };
      const proxy = createForTarget(state, obj) as typeof obj;

      const [first, second] = proxy.items;
      void first.y;
      void second.y;
      expect(state.trackedPaths.has('items[0].y')).toBe(true);
      expect(state.trackedPaths.has('items[1].y')).toBe(true);
    });

    it('iterator on an empty array tracks length only', () => {
      const state = createProxyState<unknown>();
      state.isTracking = true;
      const obj = { items: [] as { x: number }[] };
      const proxy = createForTarget(state, obj) as typeof obj;
      for (const _ of proxy.items) {
        /* no-op */
      }
      expect(state.trackedPaths.has('items.length')).toBe(true);
      expect(state.trackedPaths.has('items[0]')).toBe(false);
    });
  });

  describe('array iterating methods — proxied callbacks', () => {
    function makeProxy<T extends object>(obj: T) {
      const state = createProxyState<unknown>();
      state.isTracking = true;
      const p = createForTarget(state, obj) as T;
      return { state, p };
    }

    it('map: callback receives a proxied item; per-index path tracked', () => {
      const { state, p } = makeProxy({
        items: [{ title: 'a' }, { title: 'b' }, { title: 'c' }],
      });
      const titles = p.items.map((it) => it.title);
      expect(titles).toEqual(['a', 'b', 'c']);
      expect(state.trackedPaths.has('items[0].title')).toBe(true);
      expect(state.trackedPaths.has('items[1].title')).toBe(true);
      expect(state.trackedPaths.has('items[2].title')).toBe(true);
    });

    it('filter: callback receives a proxied item', () => {
      const { state, p } = makeProxy({
        items: [{ n: 1 }, { n: 2 }, { n: 3 }],
      });
      const big = p.items.filter((it) => it.n > 1);
      expect(big.length).toBe(2);
      expect(state.trackedPaths.has('items[0].n')).toBe(true);
      expect(state.trackedPaths.has('items[1].n')).toBe(true);
      expect(state.trackedPaths.has('items[2].n')).toBe(true);
    });

    it('forEach: callback receives a proxied item', () => {
      const { state, p } = makeProxy({ items: [{ x: 1 }, { x: 2 }] });
      let sum = 0;
      p.items.forEach((it) => {
        sum += it.x;
      });
      expect(sum).toBe(3);
      expect(state.trackedPaths.has('items[0].x')).toBe(true);
      expect(state.trackedPaths.has('items[1].x')).toBe(true);
    });

    it('find: returns the proxied item; tracks only visited indices', () => {
      const { state, p } = makeProxy({
        items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      });
      const got = p.items.find((it) => it.id === 'b');
      expect(got?.id).toBe('b');
      expect(state.trackedPaths.has('items[0].id')).toBe(true);
      expect(state.trackedPaths.has('items[1].id')).toBe(true);
      // Short-circuit: index 2 not visited
      expect(state.trackedPaths.has('items[2].id')).toBe(false);
    });

    it('findIndex: short-circuits and returns the index', () => {
      const { state, p } = makeProxy({
        items: [{ n: 1 }, { n: 2 }, { n: 3 }],
      });
      const i = p.items.findIndex((it) => it.n === 2);
      expect(i).toBe(1);
      expect(state.trackedPaths.has('items[0].n')).toBe(true);
      expect(state.trackedPaths.has('items[1].n')).toBe(true);
      expect(state.trackedPaths.has('items[2].n')).toBe(false);
    });

    it('some / every: respect short-circuit', () => {
      const { state, p } = makeProxy({
        items: [{ ok: false }, { ok: true }, { ok: false }],
      });
      expect(p.items.some((it) => it.ok)).toBe(true);
      expect(state.trackedPaths.has('items[0].ok')).toBe(true);
      expect(state.trackedPaths.has('items[1].ok')).toBe(true);
      expect(state.trackedPaths.has('items[2].ok')).toBe(false);
    });

    it('findLast / findLastIndex: iterate from the end', () => {
      const { state, p } = makeProxy({
        items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      });
      const last = p.items.findLast((it) => it.id === 'b');
      expect(last?.id).toBe('b');
      // Index 2 visited first; index 1 matches; index 0 not visited
      expect(state.trackedPaths.has('items[2].id')).toBe(true);
      expect(state.trackedPaths.has('items[1].id')).toBe(true);
      expect(state.trackedPaths.has('items[0].id')).toBe(false);
    });

    it('flatMap: tracks input items', () => {
      const { state, p } = makeProxy({
        groups: [{ items: [1, 2] }, { items: [3, 4] }],
      });
      const flat = p.groups.flatMap((g) => g.items);
      expect(flat).toEqual([1, 2, 3, 4]);
      expect(state.trackedPaths.has('groups[0].items')).toBe(true);
      expect(state.trackedPaths.has('groups[1].items')).toBe(true);
    });

    it('thisArg is honored', () => {
      const { p } = makeProxy({ items: [{ n: 1 }, { n: 2 }] });
      const ctx = { factor: 10 };
      const out = p.items.map(function (this: typeof ctx, it: { n: number }) {
        return it.n * this.factor;
      }, ctx);
      expect(out).toEqual([10, 20]);
    });

    it('third callback arg is the proxy (dereferences are tracked)', () => {
      const { state, p } = makeProxy({ items: [{ n: 1 }, { n: 2 }] });
      p.items.forEach((_it, i, arr) => {
        if (i === 0) {
          void arr[1].n; // observed via the proxy
        }
      });
      expect(state.trackedPaths.has('items[1].n')).toBe(true);
    });

    it('method identity is stable across reads of the same proxy', () => {
      const { p } = makeProxy({ items: [{ x: 1 }] });
      expect(p.items.map).toBe(p.items.map);
    });

    it('method identity differs across distinct arrays in the same state', () => {
      const { p } = makeProxy({ a: [{ x: 1 }], b: [{ y: 2 }] });
      expect(p.a.map).not.toBe(p.b.map);
    });

    it('per-index tracking — toggling one item does not invalidate path of another', () => {
      // End-to-end via the dependency tracker, mirroring the demo case.
      type Item = { id: string; title: string; done: boolean };
      type S = { items: Item[] };
      const tracker = createDependencyState<S>();
      const item1: Item = { id: 'a', title: 'Wire up', done: true };
      const item2: Item = { id: 'b', title: 'Survive', done: false };
      const item3: Item = { id: 'c', title: 'Track', done: false };
      const state1: S = { items: [item1, item2, item3] };

      startDependency(tracker);
      const p1 = createDependencyProxy(tracker, state1);
      // .map-style render
      const titles = p1.items.map((it: Item) => it.title);
      expect(titles).toEqual(['Wire up', 'Survive', 'Track']);
      capturePaths(tracker, state1);

      const state2 = {
        items: state1.items.map((it) =>
          it.id === 'a' ? { ...it, done: !it.done } : it,
        ),
      };
      // items[0].title is unchanged (toggle only flips .done); items[1]/[2] same ref.
      expect(hasDependencyChanges(tracker, state2)).toBe(false);
    });
  });

  describe('values() / entries() / keys() — proxied iteration', () => {
    function makeProxy<T>(obj: T) {
      const state = createProxyState<unknown>();
      state.isTracking = true;
      const p = createForTarget(state, obj) as T;
      return { state, p };
    }

    it('values() yields proxied items', () => {
      const { state, p } = makeProxy({ items: [{ t: 'a' }, { t: 'b' }] });
      const out: string[] = [];
      for (const it of (p as any).items.values()) out.push((it as any).t);
      expect(out).toEqual(['a', 'b']);
      expect(state.trackedPaths.has('items[0].t')).toBe(true);
      expect(state.trackedPaths.has('items[1].t')).toBe(true);
    });

    it('entries() yields [index, proxiedItem]', () => {
      const { state, p } = makeProxy({ items: [{ x: 1 }, { x: 2 }] });
      const pairs: [number, number][] = [];
      for (const [i, it] of (p as any).items.entries()) pairs.push([i, (it as any).x]);
      expect(pairs).toEqual([
        [0, 1],
        [1, 2],
      ]);
      expect(state.trackedPaths.has('items[0].x')).toBe(true);
      expect(state.trackedPaths.has('items[1].x')).toBe(true);
    });

    it('keys() returns raw indices (no item tracking from keys themselves)', () => {
      const { state, p } = makeProxy({ items: [{ x: 1 }, { x: 2 }] });
      const ks = Array.from((p as any).items.keys());
      expect(ks).toEqual([0, 1]);
      // keys() iteration alone does not record per-index data paths
      expect(state.trackedPaths.has('items[0].x')).toBe(false);
    });

    it('lazy iteration — early break only tracks consumed indices', () => {
      const { state, p } = makeProxy({
        items: [{ x: 1 }, { x: 2 }, { x: 3 }],
      });
      for (const it of (p as any).items.values()) {
        void (it as any).x;
        break;
      }
      expect(state.trackedPaths.has('items[0].x')).toBe(true);
      expect(state.trackedPaths.has('items[1].x')).toBe(false);
      expect(state.trackedPaths.has('items[2].x')).toBe(false);
    });

    it('method identity is stable', () => {
      const { p } = makeProxy({ items: [{ x: 1 }] });
      expect((p as any).items.values).toBe((p as any).items.values);
      expect((p as any).items.entries).toBe((p as any).items.entries);
    });
  });

  describe('reduce / reduceRight — proxied items, raw accumulator', () => {
    function makeProxy<T>(obj: T) {
      const state = createProxyState<unknown>();
      state.isTracking = true;
      const p = createForTarget(state, obj) as T;
      return { state, p };
    }

    it('reduce with initial value sums proxied items', () => {
      const { state, p } = makeProxy({ items: [{ n: 1 }, { n: 2 }, { n: 3 }] });
      const sum = (p as any).items.reduce((acc: number, it: { n: number }) => acc + it.n, 0);
      expect(sum).toBe(6);
      expect(state.trackedPaths.has('items[0].n')).toBe(true);
      expect(state.trackedPaths.has('items[1].n')).toBe(true);
      expect(state.trackedPaths.has('items[2].n')).toBe(true);
    });

    it('reduce without initial value uses first element as seed', () => {
      const { state, p } = makeProxy({ items: [{ n: 1 }, { n: 2 }, { n: 3 }] });
      // First call is (acc=items[0], item=items[1]) — both must remain proxied
      // when the user dereferences them.
      const out = (p as any).items.reduce((acc: { n: number }, it: { n: number }) => ({ n: acc.n + it.n }));
      expect(out.n).toBe(6);
      // items[0] is used as seed (raw acc on the first invocation), but
      // subsequent items[1], items[2] are proxied → tracked.
      expect(state.trackedPaths.has('items[1].n')).toBe(true);
      expect(state.trackedPaths.has('items[2].n')).toBe(true);
    });

    it('reduceRight iterates right-to-left and tracks the visited indices', () => {
      const { state, p } = makeProxy({ items: [{ s: 'a' }, { s: 'b' }, { s: 'c' }] });
      const joined = (p as any).items.reduceRight((acc: string, it: { s: string }) => acc + it.s, '');
      expect(joined).toBe('cba');
      expect(state.trackedPaths.has('items[0].s')).toBe(true);
      expect(state.trackedPaths.has('items[1].s')).toBe(true);
      expect(state.trackedPaths.has('items[2].s')).toBe(true);
    });

    it('reduce on empty array without initial value throws', () => {
      const { p } = makeProxy({ items: [] as { n: number }[] });
      expect(() => (p as any).items.reduce((acc: number, it: { n: number }) => acc + it.n)).toThrow(TypeError);
    });

    it('reduce on empty array with initial value returns the initial', () => {
      const { p } = makeProxy({ items: [] as { n: number }[] });
      expect((p as any).items.reduce((acc: number, it: { n: number }) => acc + it.n, 42)).toBe(42);
    });

    it('explicit undefined initial value is treated as a seed (matches native behavior)', () => {
      const { p } = makeProxy({ items: [{ n: 1 }] });
      // Native: passing explicit undefined IS treated as a provided seed.
      const out = (p as any).items.reduce(
        (acc: undefined | { n: number }, it: { n: number }) => (acc ? { n: acc.n + it.n } : it),
        undefined,
      );
      expect(out?.n).toBe(1);
    });

    it('method identity is stable across renders for reduce', () => {
      const { p } = makeProxy({ items: [{ n: 1 }] });
      expect((p as any).items.reduce).toBe((p as any).items.reduce);
    });

    it('per-index tracking via reduce — no re-render when an unread item changes ref', () => {
      const tracker = createDependencyState();
      const a = { done: true };
      const b = { done: false };
      const c = { done: false };
      const state1 = { items: [a, b, c] };

      startDependency(tracker);
      const p1 = createDependencyProxy(tracker, state1);
      // Compute a value depending on all .done props
      const count = (p1 as any).items.reduce((acc: number, it: { done: boolean }) => acc + (it.done ? 1 : 0), 0);
      expect(count).toBe(1);
      capturePaths(tracker, state1);

      // Replace items[1] ref only, but with same .done value
      const state2 = { items: [a, { done: b.done }, c] };
      // Hmm — items[1].done same value, but items[1] itself is a different ref.
      // Path tracked is 'items[1].done' which compares by value (Object.is on the
      // boolean). No change.
      expect(hasDependencyChanges(tracker, state2)).toBe(false);

      // Now actually flip items[1].done
      const state3 = { items: [a, { done: !b.done }, c] };
      expect(hasDependencyChanges(tracker, state3)).toBe(true);
    });
  });
});
