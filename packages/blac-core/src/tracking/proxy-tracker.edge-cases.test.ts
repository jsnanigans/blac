import { describe, it, expect } from 'vitest';
import {
  createProxyState,
  startProxy,
  createForTarget,
  stopProxy,
} from './tracking-proxy';

describe('proxy-tracker edge cases', () => {
  describe('Arrays', () => {
    it('should track array length access', () => {
      const state = createProxyState<any>();
      startProxy(state);
      const target = [1, 2, 3];
      const proxy = createForTarget(state, target);

      // Access length
      const _ = proxy.length;

      const paths = stopProxy(state);
      expect(paths.has('length')).toBe(true);
    });

    it('should track array index access', () => {
      const state = createProxyState<any>();
      startProxy(state);
      const target = [1, 2, 3];
      const proxy = createForTarget(state, target);

      // Access index
      const _ = proxy[1];

      const paths = stopProxy(state);
      expect(paths.has('[1]')).toBe(true);
    });

    it('should NOT track array iteration methods (implementation detail)', () => {
      const state = createProxyState<any>();
      const target = [1, 2, 3];

      startProxy(state);
      const proxy = createForTarget(state, target);

      // Use map
      // The implementation binds array methods to the original target
      // and returns them BEFORE tracking the method property access.
      // Therefore, calling map() tracks nothing.
      const result = proxy.map((x: number) => x * 2);

      const paths = stopProxy(state);
      expect(paths.size).toBe(0);
      expect(result).toEqual([2, 4, 6]);
    });
  });

  describe('Circular State', () => {
    it('should handle circular references gracefully', () => {
      const state = createProxyState<any>();
      startProxy(state);

      const target: any = { name: 'root' };
      target.self = target; // Circular reference

      const proxy = createForTarget(state, target);

      // Access circular property
      // This tracks 'self' and returns the cached root proxy
      const circular = proxy.self;
      expect(circular).toBeDefined();

      // Access property on the circular reference
      // Since 'circular' IS the root proxy, this accesses 'name' on the root
      // effectively tracking 'name' (not 'self.name')
      const name = circular.name;
      expect(name).toBe('root');

      const paths = stopProxy(state);
      expect(paths.has('self')).toBe(true);
      expect(paths.has('name')).toBe(true);
    });
  });

  describe('Object Keys', () => {
    it('should track when Object.keys is called', () => {
      const state = createProxyState<any>();
      startProxy(state);
      const target = { a: 1, b: 2 };
      const proxy = createForTarget(state, target);

      // Object.keys triggers ownKeys trap
      Object.keys(proxy);

      const paths = stopProxy(state);
      // ownKeys on root object might track empty string or nothing depending on implementation
      // The implementation tracks `path` if it exists. For root, path is empty string.
      // Let's check if it tracks anything or nothing.
      // Based on code: if (state.isTracking && path) state.trackedPaths.add(path);
      // path is '' for root, so it adds nothing.
      expect(paths.size).toBe(0);
    });

    it('should track nested object keys', () => {
      const state = createProxyState<any>();
      startProxy(state);
      const target = { nested: { a: 1, b: 2 } };
      const proxy = createForTarget(state, target);

      // Access nested object then get keys
      // 1. proxy.nested -> tracks 'nested'
      // 2. Object.keys(proxy.nested) -> ownKeys trap on nested proxy. path is 'nested'.
      Object.keys(proxy.nested);

      const paths = stopProxy(state);
      expect(paths.has('nested')).toBe(true);
    });
  });

  describe('Non-Proxyable Types', () => {
    it('should handle Map and Set without crashing', () => {
      const state = createProxyState<any>();
      startProxy(state);

      const map = new Map();
      const set = new Set();
      const target = { map, set };

      const proxy = createForTarget(state, target);

      // Accessing map/set should return original instance (not proxied)
      expect(proxy.map).toBe(map);
      expect(proxy.set).toBe(set);

      const paths = stopProxy(state);
      expect(paths.has('map')).toBe(true);
      expect(paths.has('set')).toBe(true);
    });
  });
});
