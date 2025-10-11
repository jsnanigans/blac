import { describe, it, expect } from 'vitest';
import { serializeState, analyzeStateValue } from '../serialization';
import type { SerializationConfig } from '../serialization';

const defaultConfig: SerializationConfig = {
  maxDepth: 2,
  maxStringLength: 100,
};

describe('serializeState', () => {
  describe('primitive types', () => {
    it('should serialize number', () => {
      const result = serializeState(42, defaultConfig);
      expect(result.displayValue).toBe('42');
      expect(result.fullValue).toBe('42');
    });

    it('should serialize string', () => {
      const result = serializeState('hello', defaultConfig);
      expect(result.displayValue).toBe('"hello"');
      expect(result.fullValue).toBe('"hello"');
    });

    it('should serialize boolean', () => {
      const result = serializeState(true, defaultConfig);
      expect(result.displayValue).toBe('true');
      expect(result.fullValue).toBe('true');
    });

    it('should serialize null', () => {
      const result = serializeState(null, defaultConfig);
      expect(result.displayValue).toBe('null');
      expect(result.fullValue).toBe('null');
    });

    it('should serialize undefined', () => {
      const result = serializeState(undefined, defaultConfig);
      expect(result.displayValue).toBe('"[undefined]"');
      expect(result.fullValue).toBe('"[undefined]"');
    });
  });

  describe('circular reference detection', () => {
    it('should detect circular references in objects', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;

      const result = serializeState(obj, defaultConfig);
      expect(result.fullValue).toContain('[Circular]');
    });

    it('should detect circular references in arrays', () => {
      const arr: any[] = [1, 2, 3];
      arr.push(arr);

      const result = serializeState(arr, defaultConfig);
      expect(result.fullValue).toContain('[Circular]');
    });

    it('should detect circular references in nested structures', () => {
      const parent: any = { name: 'parent' };
      const child: any = { name: 'child', parent };
      parent.child = child;

      const result = serializeState(parent, defaultConfig);
      expect(result.fullValue).toContain('[Circular]');
    });
  });

  describe('depth limiting', () => {
    it('should return [Max Depth] beyond limit', () => {
      const deep = {
        level1: {
          level2: {
            level3: {
              level4: 'too deep',
            },
          },
        },
      };

      const result = serializeState(deep, defaultConfig);
      expect(result.fullValue).toContain('[Max Depth]');
    });

    it('should serialize within depth limit', () => {
      const shallow = {
        level1: {
          level2: 'ok',
        },
      };

      const result = serializeState(shallow, defaultConfig);
      expect(result.fullValue).not.toContain('[Max Depth]');
      expect(result.fullValue).toContain('ok');
    });

    it('should respect custom depth limit', () => {
      const obj = {
        a: {
          b: {
            c: 'deep',
          },
        },
      };

      const result = serializeState(obj, { ...defaultConfig, maxDepth: 3 });
      expect(result.fullValue).toContain('deep');
      expect(result.fullValue).not.toContain('[Max Depth]');
    });
  });

  describe('special types', () => {
    it('should serialize Date', () => {
      const date = new Date('2025-01-15T12:00:00.000Z');
      const result = serializeState(date, defaultConfig);
      // Date.toJSON() returns ISO string directly
      expect(result.fullValue).toContain('2025-01-15T12:00:00.000Z');
    });

    it('should serialize Map', () => {
      const map = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);
      const result = serializeState(map, defaultConfig);
      expect(result.fullValue).toContain('[Map: 2 entries]');
    });

    it('should serialize Set', () => {
      const set = new Set([1, 2, 3, 4, 5]);
      const result = serializeState(set, defaultConfig);
      expect(result.fullValue).toContain('[Set: 5 items]');
    });

    it('should serialize RegExp', () => {
      const regex = /test\d+/gi;
      const result = serializeState(regex, defaultConfig);
      expect(result.fullValue).toContain('[RegExp:');
      expect(result.fullValue).toContain('test');
    });

    it('should serialize Error', () => {
      const error = new Error('Test error message');
      const result = serializeState(error, defaultConfig);
      expect(result.fullValue).toContain('[Error: Test error message]');
    });

    it('should serialize URL', () => {
      const url = new URL('https://example.com/path');
      const result = serializeState(url, defaultConfig);
      // URL.toJSON() returns href directly
      expect(result.fullValue).toContain('https://example.com/path');
    });

    it('should serialize Function', () => {
      function namedFunction() {}
      const result = serializeState(namedFunction, defaultConfig);
      expect(result.fullValue).toContain('[Function: namedFunction]');
    });

    it('should serialize anonymous function', () => {
      const result = serializeState(() => {}, defaultConfig);
      expect(result.fullValue).toContain('[Function: anonymous]');
    });

    it('should serialize BigInt', () => {
      const bigInt = BigInt('9007199254740991');
      const result = serializeState(bigInt, defaultConfig);
      expect(result.fullValue).toContain('[BigInt: 9007199254740991]');
    });

    it('should serialize Symbol', () => {
      const symbol = Symbol('test');
      const result = serializeState(symbol, defaultConfig);
      expect(result.fullValue).toContain('Symbol(test)');
    });
  });

  describe('string truncation', () => {
    it('should truncate long strings in display value', () => {
      const longString = 'a'.repeat(200);
      const result = serializeState(longString, defaultConfig);
      expect(result.displayValue.length).toBeLessThanOrEqual(103); // 100 + "..."
      expect(result.displayValue).toContain('...');
    });

    it('should not truncate short strings', () => {
      const shortString = 'short';
      const result = serializeState(shortString, defaultConfig);
      expect(result.displayValue).toBe('"short"');
    });

    it('should respect custom max length', () => {
      const str = 'a'.repeat(100);
      const result = serializeState(str, { ...defaultConfig, maxStringLength: 50 });
      expect(result.displayValue.length).toBeLessThanOrEqual(53); // 50 + "..."
    });
  });

  describe('complex nested objects', () => {
    it('should serialize array of objects', () => {
      const arr = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const result = serializeState(arr, defaultConfig);
      expect(result.fullValue).toContain('Alice');
      expect(result.fullValue).toContain('Bob');
    });

    it('should serialize mixed structures', () => {
      const mixed = {
        string: 'test',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        nested: {
          key: 'value',
        },
      };
      const result = serializeState(mixed, defaultConfig);
      expect(result.fullValue).toContain('test');
      expect(result.fullValue).toContain('42');
      expect(result.fullValue).toContain('true');
      expect(result.fullValue).toContain('value');
    });

    it('should handle empty objects', () => {
      const result = serializeState({}, defaultConfig);
      expect(result.fullValue).toBe('{}');
    });

    it('should handle empty arrays', () => {
      const result = serializeState([], defaultConfig);
      expect(result.fullValue).toBe('[]');
    });
  });

  describe('serialization errors', () => {
    it('should handle serialization errors gracefully', () => {
      // Create an object that will cause JSON.stringify to throw
      const obj = {};
      Object.defineProperty(obj, 'bad', {
        get() {
          throw new Error('Cannot serialize');
        },
        enumerable: true,
      });

      const result = serializeState(obj, defaultConfig);
      expect(result.fullValue).toContain('[Serialization Error');
    });
  });
});

describe('analyzeStateValue', () => {
  it('should identify primitive types', () => {
    expect(analyzeStateValue(42, defaultConfig).isPrimitive).toBe(true);
    expect(analyzeStateValue('test', defaultConfig).isPrimitive).toBe(true);
    expect(analyzeStateValue(true, defaultConfig).isPrimitive).toBe(true);
    expect(analyzeStateValue(null, defaultConfig).isPrimitive).toBe(true);
    expect(analyzeStateValue(undefined, defaultConfig).isPrimitive).toBe(true);
    expect(analyzeStateValue(BigInt(123), defaultConfig).isPrimitive).toBe(true);
    expect(analyzeStateValue(Symbol('test'), defaultConfig).isPrimitive).toBe(true);
  });

  it('should identify non-primitive types', () => {
    expect(analyzeStateValue({}, defaultConfig).isPrimitive).toBe(false);
    expect(analyzeStateValue([], defaultConfig).isPrimitive).toBe(false);
    expect(analyzeStateValue(new Map(), defaultConfig).isPrimitive).toBe(false);
    expect(analyzeStateValue(new Set(), defaultConfig).isPrimitive).toBe(false);
    expect(analyzeStateValue(new Date(), defaultConfig).isPrimitive).toBe(false);
  });

  it('should identify expandable values', () => {
    expect(analyzeStateValue({ a: 1 }, defaultConfig).isExpandable).toBe(true);
    expect(analyzeStateValue([1, 2, 3], defaultConfig).isExpandable).toBe(true);
    expect(analyzeStateValue(new Map([['key', 'value']]), defaultConfig).isExpandable).toBe(true);
    expect(analyzeStateValue(new Set([1, 2, 3]), defaultConfig).isExpandable).toBe(true);
  });

  it('should identify non-expandable values', () => {
    expect(analyzeStateValue({}, defaultConfig).isExpandable).toBe(false);
    expect(analyzeStateValue([], defaultConfig).isExpandable).toBe(false);
    expect(analyzeStateValue(42, defaultConfig).isExpandable).toBe(false);
    expect(analyzeStateValue('test', defaultConfig).isExpandable).toBe(false);
    expect(analyzeStateValue(new Date(), defaultConfig).isExpandable).toBe(false);
  });

  it('should correctly identify value types', () => {
    expect(analyzeStateValue(null, defaultConfig).type).toBe('null');
    expect(analyzeStateValue(undefined, defaultConfig).type).toBe('undefined');
    expect(analyzeStateValue(42, defaultConfig).type).toBe('number');
    expect(analyzeStateValue('test', defaultConfig).type).toBe('string');
    expect(analyzeStateValue(true, defaultConfig).type).toBe('boolean');
    expect(analyzeStateValue([], defaultConfig).type).toBe('array');
    expect(analyzeStateValue({}, defaultConfig).type).toBe('object');
    expect(analyzeStateValue(new Map(), defaultConfig).type).toBe('map');
    expect(analyzeStateValue(new Set(), defaultConfig).type).toBe('set');
    expect(analyzeStateValue(new Date(), defaultConfig).type).toBe('date');
    expect(analyzeStateValue(/test/, defaultConfig).type).toBe('regexp');
    expect(analyzeStateValue(new Error(), defaultConfig).type).toBe('error');
    expect(analyzeStateValue(new URL('https://example.com'), defaultConfig).type).toBe('url');
    expect(analyzeStateValue(() => {}, defaultConfig).type).toBe('function');
  });

  it('should count children for objects', () => {
    const result = analyzeStateValue({ a: 1, b: 2, c: 3 }, defaultConfig);
    expect(result.childCount).toBe(3);
  });

  it('should count children for arrays', () => {
    const result = analyzeStateValue([1, 2, 3, 4, 5], defaultConfig);
    expect(result.childCount).toBe(5);
  });

  it('should count children for Maps', () => {
    const map = new Map([
      ['a', 1],
      ['b', 2],
    ]);
    const result = analyzeStateValue(map, defaultConfig);
    expect(result.childCount).toBe(2);
  });

  it('should count children for Sets', () => {
    const set = new Set([1, 2, 3, 4, 5, 6]);
    const result = analyzeStateValue(set, defaultConfig);
    expect(result.childCount).toBe(6);
  });

  it('should include serialized display and full values', () => {
    const value = { test: 'value' };
    const result = analyzeStateValue(value, defaultConfig);
    expect(result.displayValue).toContain('test');
    expect(result.fullValue).toContain('value');
  });

  it('should preserve original value', () => {
    const value = { test: 'value' };
    const result = analyzeStateValue(value, defaultConfig);
    expect(result.value).toBe(value);
  });
});
