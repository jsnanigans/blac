/**
 * ID Generator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateId,
  generateSimpleId,
  createIdGenerator,
  __resetIdCounters,
} from './idGenerator';

describe('idGenerator', () => {
  beforeEach(() => {
    __resetIdCounters();
  });

  describe('generateId()', () => {
    it('should create unique IDs', () => {
      const id1 = generateId('test');
      const id2 = generateId('test');

      expect(id1).not.toBe(id2);
    });

    it('should include prefix', () => {
      const id = generateId('myPrefix');
      expect(id).toMatch(/^myPrefix_/);
    });

    it('should include timestamp', () => {
      const id = generateId('test');
      const parts = id.split('_');

      expect(parts.length).toBe(4); // prefix_timestamp_counter_random
      expect(parseInt(parts[1])).toBeGreaterThan(0);
    });

    it('should include counter', () => {
      const id1 = generateId('test');
      const id2 = generateId('test');

      const counter1 = parseInt(id1.split('_')[2]);
      const counter2 = parseInt(id2.split('_')[2]);

      expect(counter2).toBe(counter1 + 1);
    });

    it('should include random suffix', () => {
      const id = generateId('test');
      const parts = id.split('_');

      expect(parts[3].length).toBeGreaterThan(0);
    });

    it('should maintain separate counters per prefix', () => {
      generateId('prefix1');
      generateId('prefix1');
      generateId('prefix2');

      const id1 = generateId('prefix1');
      const id2 = generateId('prefix2');

      const counter1 = parseInt(id1.split('_')[2]);
      const counter2 = parseInt(id2.split('_')[2]);

      expect(counter1).toBe(3); // Third call with prefix1
      expect(counter2).toBe(2); // Second call with prefix2
    });
  });

  describe('generateSimpleId()', () => {
    it('should include prefix', () => {
      const id = generateSimpleId('MyClass');
      expect(id).toMatch(/^MyClass_/);
    });

    it('should create unique IDs', () => {
      const id1 = generateSimpleId('test');
      const id2 = generateSimpleId('test');

      expect(id1).not.toBe(id2);
    });

    it('should have format: prefix_timestamp_random', () => {
      const id = generateSimpleId('test');
      const parts = id.split('_');

      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('test');
      expect(parseInt(parts[1])).toBeGreaterThan(0);
      expect(parts[2].length).toBeGreaterThan(0);
    });

    it('should not include counter', () => {
      const id1 = generateSimpleId('test');
      const id2 = generateSimpleId('test');

      // Both should have same structure but different random parts
      expect(id1.split('_').length).toBe(3);
      expect(id2.split('_').length).toBe(3);
    });
  });

  describe('createIdGenerator()', () => {
    it('should return generator with next() method', () => {
      const generator = createIdGenerator('test');
      const id = generator.next();

      expect(id).toMatch(/^test_/);
    });

    it('should return sequential IDs', () => {
      const generator = createIdGenerator('test');

      const id1 = generator.next();
      const id2 = generator.next();
      const id3 = generator.next();

      const counter1 = parseInt(id1.split('_')[2]);
      const counter2 = parseInt(id2.split('_')[2]);
      const counter3 = parseInt(id3.split('_')[2]);

      expect(counter1).toBe(1);
      expect(counter2).toBe(2);
      expect(counter3).toBe(3);
    });

    it('should have nextSimple() method', () => {
      const generator = createIdGenerator('test');
      const id = generator.nextSimple();

      expect(id).toBe('test_1');
    });

    it('should increment counter for nextSimple()', () => {
      const generator = createIdGenerator('test');

      expect(generator.nextSimple()).toBe('test_1');
      expect(generator.nextSimple()).toBe('test_2');
      expect(generator.nextSimple()).toBe('test_3');
    });

    it('should have reset() method', () => {
      const generator = createIdGenerator('test');

      generator.next();
      generator.next();
      generator.reset();

      const id = generator.next();
      const counter = parseInt(id.split('_')[2]);

      expect(counter).toBe(1);
    });

    it('should maintain isolated counter state', () => {
      const gen1 = createIdGenerator('gen1');
      const gen2 = createIdGenerator('gen2');

      gen1.nextSimple();
      gen1.nextSimple();
      gen2.nextSimple();

      expect(gen1.nextSimple()).toBe('gen1_3');
      expect(gen2.nextSimple()).toBe('gen2_2');
    });
  });

  describe('__resetIdCounters()', () => {
    it('should reset all global counters', () => {
      generateId('test');
      generateId('test');

      __resetIdCounters();

      const id = generateId('test');
      const counter = parseInt(id.split('_')[2]);

      expect(counter).toBe(1);
    });

    it('should reset multiple prefix counters', () => {
      generateId('prefix1');
      generateId('prefix2');

      __resetIdCounters();

      const id1 = generateId('prefix1');
      const id2 = generateId('prefix2');

      expect(parseInt(id1.split('_')[2])).toBe(1);
      expect(parseInt(id2.split('_')[2])).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty prefix', () => {
      const id = generateId('');
      expect(id).toBeDefined();
    });

    it('should handle special characters in prefix', () => {
      const id = generateId('test-prefix_123');
      expect(id).toMatch(/^test-prefix_123_/);
    });

    it('should generate many unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateId('test'));
      }
      expect(ids.size).toBe(1000);
    });
  });
});
