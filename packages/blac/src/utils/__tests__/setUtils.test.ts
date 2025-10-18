import { describe, it, expect } from 'vitest';
import { setsEqual, setsEqualNullable } from '../setUtils';

describe('setUtils', () => {
  describe('setsEqual', () => {
    it('should return true for empty sets', () => {
      expect(setsEqual(new Set(), new Set())).toBe(true);
    });

    it('should return true for identical sets', () => {
      const a = new Set([1, 2, 3]);
      const b = new Set([1, 2, 3]);
      expect(setsEqual(a, b)).toBe(true);
    });

    it('should return true for identical sets with different insertion order', () => {
      const a = new Set([1, 2, 3]);
      const b = new Set([3, 2, 1]);
      expect(setsEqual(a, b)).toBe(true);
    });

    it('should return false for sets with different sizes', () => {
      const a = new Set([1, 2, 3]);
      const b = new Set([1, 2]);
      expect(setsEqual(a, b)).toBe(false);
    });

    it('should return false for sets with different elements', () => {
      const a = new Set([1, 2, 3]);
      const b = new Set([1, 2, 4]);
      expect(setsEqual(a, b)).toBe(false);
    });

    it('should return false when one set is a subset of another', () => {
      const a = new Set([1, 2, 3]);
      const b = new Set([1, 2, 3, 4]);
      expect(setsEqual(a, b)).toBe(false);
    });

    it('should work with string sets', () => {
      const a = new Set(['user', 'profile', 'name']);
      const b = new Set(['user', 'profile', 'name']);
      expect(setsEqual(a, b)).toBe(true);
    });

    it('should work with path strings', () => {
      const a = new Set(['user.profile.name', 'user.age', 'items.0']);
      const b = new Set(['user.age', 'items.0', 'user.profile.name']);
      expect(setsEqual(a, b)).toBe(true);
    });

    it('should handle single-element sets', () => {
      const a = new Set(['single']);
      const b = new Set(['single']);
      expect(setsEqual(a, b)).toBe(true);

      const c = new Set(['single']);
      const d = new Set(['different']);
      expect(setsEqual(c, d)).toBe(false);
    });
  });

  describe('setsEqualNullable', () => {
    it('should return true when both sets are undefined', () => {
      expect(setsEqualNullable(undefined, undefined)).toBe(true);
    });

    it('should return false when only first set is undefined', () => {
      expect(setsEqualNullable(undefined, new Set([1, 2]))).toBe(false);
    });

    it('should return false when only second set is undefined', () => {
      expect(setsEqualNullable(new Set([1, 2]), undefined)).toBe(false);
    });

    it('should return true for equal non-undefined sets', () => {
      const a = new Set([1, 2, 3]);
      const b = new Set([1, 2, 3]);
      expect(setsEqualNullable(a, b)).toBe(true);
    });

    it('should return false for non-equal non-undefined sets', () => {
      const a = new Set([1, 2, 3]);
      const b = new Set([1, 2, 4]);
      expect(setsEqualNullable(a, b)).toBe(false);
    });
  });
});
