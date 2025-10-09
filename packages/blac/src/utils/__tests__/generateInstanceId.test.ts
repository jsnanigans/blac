import { describe, it, expect } from 'vitest';
import { generateInstanceIdFromProps } from '../generateInstanceId';

describe('generateInstanceIdFromProps', () => {
  it('returns undefined for non-object props', () => {
    expect(generateInstanceIdFromProps(null)).toBeUndefined();
    expect(generateInstanceIdFromProps(undefined)).toBeUndefined();
    expect(generateInstanceIdFromProps('string')).toBeUndefined();
    expect(generateInstanceIdFromProps(123)).toBeUndefined();
    expect(generateInstanceIdFromProps(true)).toBeUndefined();
  });

  it('returns undefined for objects with no primitive values', () => {
    expect(generateInstanceIdFromProps({})).toBeUndefined();
    expect(
      generateInstanceIdFromProps({ obj: {}, arr: [], fn: () => {} }),
    ).toBeUndefined();
    expect(
      generateInstanceIdFromProps({ date: new Date(), regex: /test/ }),
    ).toBeUndefined();
  });

  it('generates ID from string values', () => {
    expect(generateInstanceIdFromProps({ id: 'user123' })).toBe('id:user123');
    expect(generateInstanceIdFromProps({ name: 'John', role: 'admin' })).toBe(
      'name:John|role:admin',
    );
  });

  it('generates ID from number values', () => {
    expect(generateInstanceIdFromProps({ page: 1 })).toBe('page:1');
    expect(generateInstanceIdFromProps({ x: 10, y: 20 })).toBe('x:10|y:20');
    expect(generateInstanceIdFromProps({ float: 3.14 })).toBe('float:3.14');
  });

  it('generates ID from boolean values', () => {
    expect(generateInstanceIdFromProps({ active: true })).toBe('active:true');
    expect(generateInstanceIdFromProps({ visible: false })).toBe(
      'visible:false',
    );
  });

  it('generates ID from null and undefined values', () => {
    expect(generateInstanceIdFromProps({ val: null })).toBe('val:null');
    expect(generateInstanceIdFromProps({ val: undefined })).toBe(
      'val:undefined',
    );
  });

  it('generates ID from mixed primitive types', () => {
    const props = {
      id: 'abc',
      page: 2,
      active: true,
      extra: null,
      missing: undefined,
    };
    expect(generateInstanceIdFromProps(props)).toBe(
      'active:true|extra:null|id:abc|missing:undefined|page:2',
    );
  });

  it('ignores non-primitive values', () => {
    const props = {
      id: 'test',
      obj: { nested: true },
      arr: [1, 2, 3],
      fn: () => {},
      page: 5,
    };
    expect(generateInstanceIdFromProps(props)).toBe('id:test|page:5');
  });

  it('sorts keys alphabetically for deterministic output', () => {
    const props1 = { z: 1, a: 2, m: 3 };
    const props2 = { m: 3, z: 1, a: 2 };
    const props3 = { a: 2, m: 3, z: 1 };

    const expected = 'a:2|m:3|z:1';
    expect(generateInstanceIdFromProps(props1)).toBe(expected);
    expect(generateInstanceIdFromProps(props2)).toBe(expected);
    expect(generateInstanceIdFromProps(props3)).toBe(expected);
  });

  it('handles edge cases', () => {
    expect(generateInstanceIdFromProps({ '': 'empty' })).toBe(':empty');
    expect(generateInstanceIdFromProps({ 'key|with|pipes': 'value' })).toBe(
      'key|with|pipes:value',
    );
    expect(generateInstanceIdFromProps({ 'key:with:colons': 'value' })).toBe(
      'key:with:colons:value',
    );
  });

  it('handles special number values', () => {
    expect(generateInstanceIdFromProps({ inf: Infinity })).toBe('inf:Infinity');
    expect(generateInstanceIdFromProps({ ninf: -Infinity })).toBe(
      'ninf:-Infinity',
    );
    expect(generateInstanceIdFromProps({ nan: NaN })).toBe('nan:NaN');
    expect(generateInstanceIdFromProps({ zero: 0 })).toBe('zero:0');
    expect(generateInstanceIdFromProps({ negZero: -0 })).toBe('negZero:0');
  });
});
