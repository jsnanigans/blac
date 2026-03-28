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
});
