import { describe, it, expect, beforeEach } from 'vitest';
import { PathTrie } from '../PathTrie';

describe('PathTrie', () => {
  let trie: PathTrie;

  beforeEach(() => {
    trie = new PathTrie();
  });

  describe('insert and has', () => {
    it('should insert and retrieve single path', () => {
      trie.insert('user');
      expect(trie.has('user')).toBe(true);
      expect(trie.has('profile')).toBe(false);
    });

    it('should insert nested paths', () => {
      trie.insert('user.profile.name');
      expect(trie.has('user.profile.name')).toBe(true);
      expect(trie.has('user.profile')).toBe(false); // Not explicitly inserted
      expect(trie.has('user')).toBe(false); // Not explicitly inserted
    });

    it('should handle multiple independent paths', () => {
      trie.insert('user.name');
      trie.insert('profile.email');
      trie.insert('items.0');

      expect(trie.has('user.name')).toBe(true);
      expect(trie.has('profile.email')).toBe(true);
      expect(trie.has('items.0')).toBe(true);
    });

    it('should handle overlapping paths', () => {
      trie.insert('user');
      trie.insert('user.profile');
      trie.insert('user.profile.name');

      expect(trie.has('user')).toBe(true);
      expect(trie.has('user.profile')).toBe(true);
      expect(trie.has('user.profile.name')).toBe(true);
    });
  });

  describe('getLeafPaths', () => {
    it('should return single path when only one inserted', () => {
      trie.insert('user');
      expect(trie.getLeafPaths()).toEqual(new Set(['user']));
    });

    it('should filter intermediate paths and keep only leaf', () => {
      trie.insert('user');
      trie.insert('user.profile');
      trie.insert('user.profile.name');

      // All three are terminal, but only the deepest is a leaf
      const leafs = trie.getLeafPaths();
      expect(leafs).toEqual(new Set(['user.profile.name']));
    });

    it('should handle sibling paths correctly', () => {
      trie.insert('user.name');
      trie.insert('user.age');
      trie.insert('user.profile.email');

      const leafs = trie.getLeafPaths();
      expect(leafs).toEqual(
        new Set(['user.name', 'user.age', 'user.profile.email']),
      );
    });

    it('should handle array paths', () => {
      trie.insert('items.0.name');
      trie.insert('items.1.name');
      trie.insert('items.map'); // Method access

      const leafs = trie.getLeafPaths();
      expect(leafs).toEqual(
        new Set(['items.0.name', 'items.1.name', 'items.map']),
      );
    });

    it('should handle very deep nesting (10+ levels)', () => {
      trie.insert('l1.l2.l3.l4.l5.l6.l7.l8.l9.l10.value');

      const leafs = trie.getLeafPaths();
      expect(leafs).toEqual(new Set(['l1.l2.l3.l4.l5.l6.l7.l8.l9.l10.value']));
    });

    it('should return empty set when no paths inserted', () => {
      expect(trie.getLeafPaths()).toEqual(new Set());
    });

    it('should handle multiple root paths', () => {
      trie.insert('user.name');
      trie.insert('profile.email');
      trie.insert('settings.theme');

      const leafs = trie.getLeafPaths();
      expect(leafs).toEqual(
        new Set(['user.name', 'profile.email', 'settings.theme']),
      );
    });

    it('should handle paths with shared prefixes', () => {
      trie.insert('user.profile.address.city');
      trie.insert('user.profile.address.zip');
      trie.insert('user.settings.theme');

      const leafs = trie.getLeafPaths();
      expect(leafs).toEqual(
        new Set([
          'user.profile.address.city',
          'user.profile.address.zip',
          'user.settings.theme',
        ]),
      );
    });

    it('should handle terminal intermediate paths', () => {
      // If both parent and child are explicitly inserted, only child is leaf
      trie.insert('user');
      trie.insert('user.name');

      const leafs = trie.getLeafPaths();
      expect(leafs).toEqual(new Set(['user.name']));
    });

    it('should handle complex mixed scenario', () => {
      trie.insert('a.b.c');
      trie.insert('a.b.d');
      trie.insert('a.e');
      trie.insert('f');
      trie.insert('g.h.i.j.k');

      const leafs = trie.getLeafPaths();
      expect(leafs).toEqual(
        new Set(['a.b.c', 'a.b.d', 'a.e', 'f', 'g.h.i.j.k']),
      );
    });
  });

  describe('clear', () => {
    it('should clear all paths', () => {
      trie.insert('user.name');
      trie.insert('profile.email');
      expect(trie.size).toBe(2);

      trie.clear();
      expect(trie.size).toBe(0);
      expect(trie.getLeafPaths()).toEqual(new Set());
    });
  });

  describe('size', () => {
    it('should return 0 for empty trie', () => {
      expect(trie.size).toBe(0);
    });

    it('should count single path', () => {
      trie.insert('user');
      expect(trie.size).toBe(1);
    });

    it('should count multiple paths', () => {
      trie.insert('user.name');
      trie.insert('user.age');
      trie.insert('profile.email');
      expect(trie.size).toBe(3);
    });

    it('should count nested paths correctly', () => {
      trie.insert('user');
      trie.insert('user.profile');
      trie.insert('user.profile.name');
      expect(trie.size).toBe(3);
    });
  });

  describe('performance characteristics', () => {
    it('should handle large number of paths efficiently', () => {
      const pathCount = 1000;

      // Insert 1000 paths
      for (let i = 0; i < pathCount; i++) {
        trie.insert(`path${i}.nested.value`);
      }

      expect(trie.size).toBe(pathCount);

      // getLeafPaths should be O(n), not O(n²)
      const start = performance.now();
      const leafs = trie.getLeafPaths();
      const duration = performance.now() - start;

      expect(leafs.size).toBe(pathCount);
      expect(duration).toBeLessThan(10); // Should be very fast (< 10ms)
    });

    it('should handle deep nesting efficiently', () => {
      // Create very deep path (20 levels)
      const segments = [];
      for (let i = 0; i < 20; i++) {
        segments.push(`level${i}`);
      }
      const deepPath = segments.join('.');

      trie.insert(deepPath);

      const start = performance.now();
      const leafs = trie.getLeafPaths();
      const duration = performance.now() - start;

      expect(leafs).toEqual(new Set([deepPath]));
      expect(duration).toBeLessThan(1);
    });
  });

  describe('edge cases', () => {
    it('should handle single-segment paths', () => {
      trie.insert('user');
      trie.insert('profile');

      const leafs = trie.getLeafPaths();
      expect(leafs).toEqual(new Set(['user', 'profile']));
    });

    it('should handle duplicate inserts idempotently', () => {
      trie.insert('user.name');
      trie.insert('user.name'); // Duplicate

      expect(trie.size).toBe(1);
      expect(trie.getLeafPaths()).toEqual(new Set(['user.name']));
    });

    it('should handle numeric segments (array indices)', () => {
      trie.insert('items.0');
      trie.insert('items.1');
      trie.insert('items.999');

      const leafs = trie.getLeafPaths();
      expect(leafs).toEqual(new Set(['items.0', 'items.1', 'items.999']));
    });

    it('should preserve insertion order independence', () => {
      // Insert in different orders
      const trie1 = new PathTrie();
      trie1.insert('a.b.c');
      trie1.insert('a.b');
      trie1.insert('a');

      const trie2 = new PathTrie();
      trie2.insert('a');
      trie2.insert('a.b');
      trie2.insert('a.b.c');

      // Both should produce same leaf set
      expect(trie1.getLeafPaths()).toEqual(trie2.getLeafPaths());
      expect(trie1.getLeafPaths()).toEqual(new Set(['a.b.c']));
    });
  });
});
