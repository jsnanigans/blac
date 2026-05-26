import { describe, it, expect } from 'vite-plus/test';
import {
  createProxyState,
  startProxy,
  createForTarget,
  stopProxy,
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

    it('should NOT track array iteration methods (implementation detail)', () => {
      const { proxy, stop } = fixture.proxy([1, 2, 3]);

      const result = proxy.map((x: number) => x * 2);

      const paths = stop();
      expect(paths.size).toBe(0);
      expect(result).toEqual([2, 4, 6]);
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
});
