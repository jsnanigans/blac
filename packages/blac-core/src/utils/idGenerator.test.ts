import { describe, it, expect } from 'vite-plus/test';
import { generateSimpleId } from './idGenerator';

describe('idGenerator', () => {
  describe('generateSimpleId()', () => {
    it('should include prefix', () => {
      const id = generateSimpleId('MyClass');
      expect(id).toMatch(/^MyClass:/);
    });

    it('should create unique IDs', () => {
      const id1 = generateSimpleId('test');
      const id2 = generateSimpleId('test');

      expect(id1).not.toBe(id2);
    });

    it('should have format: prefix:timestamp_random', () => {
      const id = generateSimpleId('test');
      const [prefix, rest] = id.split(':');
      const parts = rest.split('_');

      expect(prefix).toBe('test');
      expect(parts.length).toBe(2); // timestamp_random
      expect(parseInt(parts[0])).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);
    });

    it('should not include counter', () => {
      const id1 = generateSimpleId('test');
      const id2 = generateSimpleId('test');

      const parts1 = id1.split(':')[1].split('_');
      const parts2 = id2.split(':')[1].split('_');
      expect(parts1.length).toBe(2); // timestamp_random
      expect(parts2.length).toBe(2);
    });
  });
});
