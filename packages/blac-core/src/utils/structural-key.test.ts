import { describe, it, expect } from 'vitest';
import { structuralKey, DEFAULT_STRUCTURAL_KEY } from './structural-key';

describe('structuralKey', () => {
  it('returns the default sentinel for undefined', () => {
    expect(structuralKey(undefined)).toBe(DEFAULT_STRUCTURAL_KEY);
    expect(structuralKey(undefined)).toBe('default');
  });

  it('returns the default sentinel for null', () => {
    expect(structuralKey(null)).toBe(DEFAULT_STRUCTURAL_KEY);
  });

  it('is order-independent for object keys', () => {
    expect(structuralKey({ a: 1, b: 2 })).toBe(structuralKey({ b: 2, a: 1 }));
  });

  it('produces distinct keys for distinct values', () => {
    expect(structuralKey({ id: 'a' })).not.toBe(structuralKey({ id: 'b' }));
    expect(structuralKey(1)).not.toBe(structuralKey(2));
    expect(structuralKey('foo')).not.toBe(structuralKey('bar'));
  });

  it('keeps array order (arrays are not sorted)', () => {
    expect(structuralKey([1, 2, 3])).toBe(structuralKey([1, 2, 3]));
    expect(structuralKey([1, 2, 3])).not.toBe(structuralKey([3, 2, 1]));
  });

  it('handles nested objects with key sorting', () => {
    const a = { outer: { z: 9, a: 1 }, flag: true };
    const b = { flag: true, outer: { a: 1, z: 9 } };
    expect(structuralKey(a)).toBe(structuralKey(b));
  });

  it('handles primitives', () => {
    expect(structuralKey(42)).toBe('42');
    expect(structuralKey('hello')).toBe('"hello"');
    expect(structuralKey(true)).toBe('true');
  });

  it('throws when args contain a function', () => {
    expect(() => structuralKey({ fn: () => {} })).toThrow(
      /args must be serializable/,
    );
  });
});
