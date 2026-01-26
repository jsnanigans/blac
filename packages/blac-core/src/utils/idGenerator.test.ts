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
      expect(id).toMatch(/^myPrefix:/);
    });

    it('should include timestamp', () => {
      const id = generateId('test');
      const [prefix, rest] = id.split(':');
      const parts = rest.split('_');

      expect(prefix).toBe('test');
      expect(parts.length).toBe(3); // timestamp_counter_random
      expect(parseInt(parts[0])).toBeGreaterThan(0);
    });

    it('should include counter', () => {
      const id1 = generateId('test');
      const id2 = generateId('test');

      const counter1 = parseInt(id1.split(':')[1].split('_')[1]);
      const counter2 = parseInt(id2.split(':')[1].split('_')[1]);

      expect(counter2).toBe(counter1 + 1);
    });

    it('should include random suffix', () => {
      const id = generateId('test');
      const parts = id.split(':')[1].split('_');

      expect(parts[2].length).toBeGreaterThan(0);
    });

    it('should maintain separate counters per prefix', () => {
      generateId('prefix1');
      generateId('prefix1');
      generateId('prefix2');

      const id1 = generateId('prefix1');
      const id2 = generateId('prefix2');

      const counter1 = parseInt(id1.split(':')[1].split('_')[1]);
      const counter2 = parseInt(id2.split(':')[1].split('_')[1]);

      expect(counter1).toBe(3); // Third call with prefix1
      expect(counter2).toBe(2); // Second call with prefix2
    });
  });

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

      // Both should have same structure but different random parts
      const parts1 = id1.split(':')[1].split('_');
      const parts2 = id2.split(':')[1].split('_');
      expect(parts1.length).toBe(2); // timestamp_random
      expect(parts2.length).toBe(2);
    });
  });

  describe('createIdGenerator()', () => {
    it('should return generator with next() method', () => {
      const generator = createIdGenerator('test');
      const id = generator.next();

      expect(id).toMatch(/^test:/);
    });

    it('should return sequential IDs', () => {
      const generator = createIdGenerator('test');

      const id1 = generator.next();
      const id2 = generator.next();
      const id3 = generator.next();

      const counter1 = parseInt(id1.split(':')[1].split('_')[1]);
      const counter2 = parseInt(id2.split(':')[1].split('_')[1]);
      const counter3 = parseInt(id3.split(':')[1].split('_')[1]);

      expect(counter1).toBe(1);
      expect(counter2).toBe(2);
      expect(counter3).toBe(3);
    });

    it('should have nextSimple() method', () => {
      const generator = createIdGenerator('test');
      const id = generator.nextSimple();

      expect(id).toBe('test:1');
    });

    it('should increment counter for nextSimple()', () => {
      const generator = createIdGenerator('test');

      expect(generator.nextSimple()).toBe('test:1');
      expect(generator.nextSimple()).toBe('test:2');
      expect(generator.nextSimple()).toBe('test:3');
    });

    it('should have reset() method', () => {
      const generator = createIdGenerator('test');

      generator.next();
      generator.next();
      generator.reset();

      const id = generator.next();
      const counter = parseInt(id.split(':')[1].split('_')[1]);

      expect(counter).toBe(1);
    });

    it('should maintain isolated counter state', () => {
      const gen1 = createIdGenerator('gen1');
      const gen2 = createIdGenerator('gen2');

      gen1.nextSimple();
      gen1.nextSimple();
      gen2.nextSimple();

      expect(gen1.nextSimple()).toBe('gen1:3');
      expect(gen2.nextSimple()).toBe('gen2:2');
    });
  });

  describe('__resetIdCounters()', () => {
    it('should reset all global counters', () => {
      generateId('test');
      generateId('test');

      __resetIdCounters();

      const id = generateId('test');
      const counter = parseInt(id.split(':')[1].split('_')[1]);

      expect(counter).toBe(1);
    });

    it('should reset multiple prefix counters', () => {
      generateId('prefix1');
      generateId('prefix2');

      __resetIdCounters();

      const id1 = generateId('prefix1');
      const id2 = generateId('prefix2');

      expect(parseInt(id1.split(':')[1].split('_')[1])).toBe(1);
      expect(parseInt(id2.split(':')[1].split('_')[1])).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty prefix', () => {
      const id = generateId('');
      expect(id).toBeDefined();
    });

    it('should handle special characters in prefix', () => {
      const id = generateId('test-prefix_123');
      expect(id).toMatch(/^test-prefix_123:/);
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
