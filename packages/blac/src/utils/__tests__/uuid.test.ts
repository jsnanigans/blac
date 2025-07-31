import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateUUID } from '../uuid';

describe('generateUUID', () => {
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  describe('crypto.randomUUID available', () => {
    it('should use crypto.randomUUID when available', () => {
      const mockRandomUUID = vi.fn(
        () => '550e8400-e29b-41d4-a716-446655440000',
      );

      // Mock the crypto object
      vi.stubGlobal('crypto', {
        randomUUID: mockRandomUUID,
      });

      const uuid = generateUUID();

      expect(mockRandomUUID).toHaveBeenCalled();
      expect(uuid).toBe('550e8400-e29b-41d4-a716-446655440000');

      vi.unstubAllGlobals();
    });

    it('should return valid UUID v4 format from native crypto.randomUUID', () => {
      // Test with real crypto.randomUUID if available
      if (typeof crypto !== 'undefined' && crypto.randomUUID !== undefined) {
        const uuid = generateUUID();
        expect(uuid).toMatch(UUID_REGEX);
      } else {
        // Skip test if crypto.randomUUID is not available in test environment
        expect(true).toBe(true);
      }
    });
  });

  describe('Fallback implementation', () => {
    beforeEach(() => {
      // Remove crypto to force fallback
      vi.stubGlobal('crypto', undefined);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should generate valid UUID v4 format using fallback', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(UUID_REGEX);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set();
      const count = 1000;

      for (let i = 0; i < count; i++) {
        uuids.add(generateUUID());
      }

      // All generated UUIDs should be unique
      expect(uuids.size).toBe(count);
    });

    it('should have correct version and variant bits', () => {
      for (let i = 0; i < 100; i++) {
        const uuid = generateUUID();
        const parts = uuid.split('-');

        // Version 4 UUID should have '4' in the third group
        expect(parts[2][0]).toBe('4');

        // Variant bits should be correct (8, 9, a, or b)
        const variantChar = parts[3][0].toLowerCase();
        expect(['8', '9', 'a', 'b']).toContain(variantChar);
      }
    });

    it('should have correct length and format', () => {
      const uuid = generateUUID();

      expect(uuid.length).toBe(36);
      expect(uuid.split('-').length).toBe(5);

      const parts = uuid.split('-');
      expect(parts[0].length).toBe(8);
      expect(parts[1].length).toBe(4);
      expect(parts[2].length).toBe(4);
      expect(parts[3].length).toBe(4);
      expect(parts[4].length).toBe(12);
    });
  });

  describe('Environment compatibility', () => {
    it('should work when crypto is defined but randomUUID is not', () => {
      // Mock crypto without randomUUID
      vi.stubGlobal('crypto', {});

      const uuid = generateUUID();
      expect(uuid).toMatch(UUID_REGEX);

      vi.unstubAllGlobals();
    });

    it('should work with different Math.random implementations', () => {
      // First remove crypto to ensure fallback
      vi.stubGlobal('crypto', undefined);

      const originalMathRandom = Math.random;
      let callCount = 0;

      // Mock Math.random to return predictable values
      Math.random = vi.fn(() => {
        callCount++;
        return (callCount % 16) / 16;
      });

      const uuid = generateUUID();
      expect(uuid).toMatch(UUID_REGEX);
      expect(Math.random).toHaveBeenCalled();

      Math.random = originalMathRandom;
      vi.unstubAllGlobals();
    });
  });

  describe('Performance', () => {
    it('should generate UUIDs efficiently', () => {
      const startTime = performance.now();
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        generateUUID();
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should generate 10,000 UUIDs in less than 100ms
      expect(totalTime).toBeLessThan(100);
    });
  });
});
