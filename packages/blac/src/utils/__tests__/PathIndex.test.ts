import { describe, it, expect, beforeEach } from 'vitest';
import { PathIndex } from '../PathIndex';

describe('PathIndex', () => {
  let index: PathIndex;

  beforeEach(() => {
    index = new PathIndex();
  });

  describe('build and basic queries', () => {
    it('should build index from single path', () => {
      index.build(new Set(['user']));
      expect(index.has('user')).toBe(true);
      expect(index.size).toBe(1);
    });

    it('should build index from nested paths', () => {
      index.build(new Set(['user.profile.name']));
      expect(index.has('user.profile.name')).toBe(true);
      // Index creates intermediate paths: 'user', 'user.profile', 'user.profile.name'
      expect(index.size).toBe(3);
    });

    it('should build index from multiple paths', () => {
      index.build(new Set(['user.name', 'user.age', 'profile.email']));
      // Creates: 'user', 'user.name', 'user.age', 'profile', 'profile.email'
      expect(index.size).toBe(5);
      expect(index.has('user.name')).toBe(true);
      expect(index.has('user.age')).toBe(true);
      expect(index.has('profile.email')).toBe(true);
    });

    it('should handle empty path set', () => {
      index.build(new Set());
      expect(index.size).toBe(0);
    });
  });

  describe('isChildOf', () => {
    beforeEach(() => {
      index.build(
        new Set([
          'user',
          'user.profile',
          'user.profile.name',
          'user.profile.email',
          'user.settings',
          'user.settings.theme',
        ]),
      );
    });

    it('should return true for direct child', () => {
      expect(index.isChildOf('user.profile', 'user')).toBe(true);
    });

    it('should return true for deep descendant', () => {
      expect(index.isChildOf('user.profile.name', 'user')).toBe(true);
      expect(index.isChildOf('user.profile.name', 'user.profile')).toBe(true);
    });

    it('should return false for sibling paths', () => {
      expect(index.isChildOf('user.profile', 'user.settings')).toBe(false);
      expect(index.isChildOf('user.profile.name', 'user.settings')).toBe(false);
    });

    it('should return false for parent-to-child (reverse)', () => {
      expect(index.isChildOf('user', 'user.profile')).toBe(false);
    });

    it('should return false for non-existent paths', () => {
      expect(index.isChildOf('nonexistent', 'user')).toBe(false);
      expect(index.isChildOf('user.profile.name', 'nonexistent')).toBe(false);
    });

    it('should return false for same path', () => {
      expect(index.isChildOf('user', 'user')).toBe(false);
    });
  });

  describe('isParentOf', () => {
    beforeEach(() => {
      index.build(new Set(['user', 'user.profile', 'user.profile.name']));
    });

    it('should return true for direct parent', () => {
      expect(index.isParentOf('user', 'user.profile')).toBe(true);
    });

    it('should return true for distant ancestor', () => {
      expect(index.isParentOf('user', 'user.profile.name')).toBe(true);
    });

    it('should return false for child-to-parent', () => {
      expect(index.isParentOf('user.profile', 'user')).toBe(false);
    });
  });

  describe('getParent', () => {
    beforeEach(() => {
      index.build(new Set(['user', 'user.profile', 'user.profile.name']));
    });

    it('should return immediate parent', () => {
      expect(index.getParent('user.profile')).toBe('user');
      expect(index.getParent('user.profile.name')).toBe('user.profile');
    });

    it('should return null for root path', () => {
      expect(index.getParent('user')).toBe(null);
    });

    it('should return null for non-existent path', () => {
      expect(index.getParent('nonexistent')).toBe(null);
    });
  });

  describe('getAncestors', () => {
    beforeEach(() => {
      index.build(
        new Set([
          'user',
          'user.profile',
          'user.profile.address',
          'user.profile.address.city',
        ]),
      );
    });

    it('should return all ancestors', () => {
      const ancestors = index.getAncestors('user.profile.address.city');
      expect(ancestors).toEqual(
        new Set(['user', 'user.profile', 'user.profile.address']),
      );
    });

    it('should return empty set for root path', () => {
      expect(index.getAncestors('user')).toEqual(new Set());
    });

    it('should return empty set for non-existent path', () => {
      expect(index.getAncestors('nonexistent')).toEqual(new Set());
    });
  });

  describe('getLeafPaths', () => {
    beforeEach(() => {
      index.build(
        new Set([
          'user',
          'user.profile',
          'user.profile.name',
          'user.profile.email',
          'user.settings',
          'user.settings.theme',
        ]),
      );
    });

    it('should return only leaf paths', () => {
      const allPaths = new Set([
        'user',
        'user.profile',
        'user.profile.name',
        'user.profile.email',
        'user.settings.theme',
      ]);
      const leafs = index.getLeafPaths(allPaths);
      expect(leafs).toEqual(
        new Set([
          'user.profile.name',
          'user.profile.email',
          'user.settings.theme',
        ]),
      );
    });

    it('should handle single leaf', () => {
      const leafs = index.getLeafPaths(new Set(['user.profile.name']));
      expect(leafs).toEqual(new Set(['user.profile.name']));
    });

    it('should return empty set for non-leaf paths', () => {
      const leafs = index.getLeafPaths(new Set(['user', 'user.profile']));
      expect(leafs).toEqual(new Set());
    });
  });

  describe('shouldNotify', () => {
    it('should return true for exact match', () => {
      index.build(new Set(['user.name']));
      const tracked = new Set(['user.name']);
      const changed = new Set(['user.name']);
      expect(index.shouldNotify(tracked, changed)).toBe(true);
    });

    it('should return true when tracking parent and child changed', () => {
      index.build(new Set(['user', 'user.name']));
      const tracked = new Set(['user']);
      const changed = new Set(['user.name']);
      expect(index.shouldNotify(tracked, changed)).toBe(true);
    });

    it('should return true when tracking child and parent changed', () => {
      index.build(new Set(['user', 'user.profile.name']));
      const tracked = new Set(['user.profile.name']);
      const changed = new Set(['user.profile']);
      expect(index.shouldNotify(tracked, changed)).toBe(true);
    });

    it('should return false for sibling paths', () => {
      index.build(new Set(['user.name', 'user.age']));
      const tracked = new Set(['user.name']);
      const changed = new Set(['user.age']);
      expect(index.shouldNotify(tracked, changed)).toBe(false);
    });

    it('should return false for unrelated paths', () => {
      index.build(new Set(['user.name', 'profile.email']));
      const tracked = new Set(['user.name']);
      const changed = new Set(['profile.email']);
      expect(index.shouldNotify(tracked, changed)).toBe(false);
    });

    it('should handle * wildcard', () => {
      index.build(new Set(['user.name']));
      const tracked = new Set(['user.name']);
      const changed = new Set(['*']);
      expect(index.shouldNotify(tracked, changed)).toBe(true);
    });

    it('should handle multiple tracked paths', () => {
      index.build(new Set(['user.name', 'user.age', 'profile.email']));
      const tracked = new Set(['user.name', 'user.age']);
      const changed = new Set(['profile.email']);
      expect(index.shouldNotify(tracked, changed)).toBe(false);

      const changed2 = new Set(['user.age']);
      expect(index.shouldNotify(tracked, changed2)).toBe(true);
    });

    it('should handle deep nesting (6+ levels)', () => {
      const paths = new Set([
        'l1',
        'l1.l2',
        'l1.l2.l3',
        'l1.l2.l3.l4',
        'l1.l2.l3.l4.l5',
        'l1.l2.l3.l4.l5.l6',
        'l1.l2.l3.l4.l5.l6.value',
        'l1.l2.l3.l4.l5.l6.sibling',
      ]);
      index.build(paths);

      const tracked = new Set(['l1.l2.l3.l4.l5.l6.value']);
      const changed = new Set(['l1.l2.l3.l4.l5.l6.value']);
      expect(index.shouldNotify(tracked, changed)).toBe(true);

      const changed2 = new Set(['l1.l2.l3.l4.l5.l6.sibling']);
      expect(index.shouldNotify(tracked, changed2)).toBe(false);
    });

    it('should auto-index new paths when needed', () => {
      // Start with empty index
      expect(index.size).toBe(0);

      // shouldNotify with parent-child relationship should trigger auto-indexing
      const tracked = new Set(['user']);
      const changed = new Set(['user.name']);
      expect(index.shouldNotify(tracked, changed)).toBe(true);

      // Index should now contain both paths
      expect(index.size).toBe(2);
      expect(index.has('user')).toBe(true);
      expect(index.has('user.name')).toBe(true);
    });
  });

  describe('getDepth', () => {
    beforeEach(() => {
      index.build(new Set(['user', 'user.profile', 'user.profile.name']));
    });

    it('should return correct depth', () => {
      expect(index.getDepth('user')).toBe(0);
      expect(index.getDepth('user.profile')).toBe(1);
      expect(index.getDepth('user.profile.name')).toBe(2);
    });

    it('should return -1 for non-existent path', () => {
      expect(index.getDepth('nonexistent')).toBe(-1);
    });
  });

  describe('isLeaf', () => {
    beforeEach(() => {
      index.build(new Set(['user', 'user.profile', 'user.profile.name']));
    });

    it('should return true for leaf nodes', () => {
      expect(index.isLeaf('user.profile.name')).toBe(true);
    });

    it('should return false for intermediate nodes', () => {
      expect(index.isLeaf('user')).toBe(false);
      expect(index.isLeaf('user.profile')).toBe(false);
    });

    it('should return false for non-existent paths', () => {
      expect(index.isLeaf('nonexistent')).toBe(false);
    });
  });

  describe('clear and getAllPaths', () => {
    it('should clear all paths', () => {
      index.build(new Set(['user.name', 'profile.email']));
      // Creates: 'user', 'user.name', 'profile', 'profile.email'
      expect(index.size).toBe(4);

      index.clear();
      expect(index.size).toBe(0);
      expect(index.getAllPaths()).toEqual(new Set());
    });

    it('should return all indexed paths', () => {
      const paths = new Set(['user.name', 'user.age', 'profile.email']);
      index.build(paths);
      // getAllPaths returns all paths including intermediates
      const expectedPaths = new Set([
        'user',
        'user.name',
        'user.age',
        'profile',
        'profile.email',
      ]);
      expect(index.getAllPaths()).toEqual(expectedPaths);
    });
  });

  describe('performance characteristics', () => {
    it('should handle large number of paths efficiently', () => {
      const pathCount = 1000;
      const paths = new Set<string>();

      for (let i = 0; i < pathCount; i++) {
        paths.add(`path${i}.nested.value`);
      }

      const start = performance.now();
      index.build(paths);
      const buildDuration = performance.now() - start;

      // Each path creates 3 nodes: 'pathN', 'pathN.nested', 'pathN.nested.value'
      expect(index.size).toBe(pathCount * 3);
      expect(buildDuration).toBeLessThan(50); // Build should be fast (< 50ms)

      // Test query performance
      const queryStart = performance.now();
      for (let i = 0; i < 100; i++) {
        index.isChildOf(`path${i}.nested.value`, `path${i}.nested`);
      }
      const queryDuration = performance.now() - queryStart;

      expect(queryDuration).toBeLessThan(5); // 100 queries should be very fast (< 5ms)
    });

    it('should handle deep nesting efficiently', () => {
      const segments = [];
      for (let i = 0; i < 20; i++) {
        segments.push(`level${i}`);
      }
      const deepPath = segments.join('.');

      const start = performance.now();
      index.build(new Set([deepPath]));
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1);
      expect(index.getDepth(deepPath)).toBe(19);
    });

    it('should optimize shouldNotify for large sets', () => {
      const trackedCount = 50;
      const changedCount = 20;

      const tracked = new Set<string>();
      const changed = new Set<string>();

      for (let i = 0; i < trackedCount; i++) {
        tracked.add(`tracked${i}.path.value`);
      }
      for (let i = 0; i < changedCount; i++) {
        changed.add(`changed${i}.path.value`);
      }

      const start = performance.now();
      index.shouldNotify(tracked, changed);
      const duration = performance.now() - start;

      // O(n + m) should be much faster than O(n×m)
      // 50 × 20 = 1000 iterations (old way)
      // 50 + 20 = 70 operations (new way)
      expect(duration).toBeLessThan(5); // Should be very fast
    });
  });

  describe('edge cases', () => {
    it('should handle single-segment paths', () => {
      index.build(new Set(['user', 'profile']));
      expect(index.getDepth('user')).toBe(0);
      expect(index.getDepth('profile')).toBe(0);
      expect(index.isChildOf('user', 'profile')).toBe(false);
    });

    it('should handle numeric segments (array indices)', () => {
      index.build(new Set(['items', 'items.0', 'items.0.name']));
      expect(index.isChildOf('items.0', 'items')).toBe(true);
      expect(index.isChildOf('items.0.name', 'items')).toBe(true);
    });

    it('should handle rebuild with new paths', () => {
      index.build(new Set(['user.name']));
      // Creates: 'user', 'user.name'
      expect(index.size).toBe(2);

      // Rebuild with different paths
      index.build(new Set(['profile.email', 'settings.theme']));
      // Creates: 'profile', 'profile.email', 'settings', 'settings.theme'
      expect(index.size).toBe(4);
      expect(index.has('user.name')).toBe(false);
      expect(index.has('profile.email')).toBe(true);
    });

    it('should handle paths with shared prefixes', () => {
      index.build(
        new Set(['user', 'userData', 'user.profile', 'userSettings']),
      );

      expect(index.isChildOf('user.profile', 'user')).toBe(true);
      expect(index.isChildOf('userData', 'user')).toBe(false);
      expect(index.isChildOf('userSettings', 'user')).toBe(false);
    });
  });
});
