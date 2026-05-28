import { describe, expect, it } from 'vite-plus/test';
import { PathInterner } from './path-interner';

describe('PathInterner', () => {
  it('idempotent intern — same string returns same id', () => {
    const interner = new PathInterner();
    const id1 = interner.intern('a.b');
    const id2 = interner.intern('a.b');
    expect(id1).toBe(id2);
  });

  it('distinct strings get distinct IDs', () => {
    const interner = new PathInterner();
    expect(interner.intern('a')).not.toBe(interner.intern('b'));
  });

  it('monotonic IDs starting at 0', () => {
    const interner = new PathInterner();
    expect(interner.intern('x')).toBe(0);
    expect(interner.intern('y')).toBe(1);
    expect(interner.intern('z')).toBe(2);
  });

  it('lookup round-trips interned strings', () => {
    const interner = new PathInterner();
    const strings = ['user.email', 'items.5.name', 'meta.createdAt'];
    for (const s of strings) {
      expect(interner.lookup(interner.intern(s))).toBe(s);
    }
  });

  it('lookup of unknown ID throws RangeError', () => {
    const interner = new PathInterner();
    interner.intern('a');
    expect(() => interner.lookup(-1)).toThrow(RangeError);
    expect(() => interner.lookup(0.5)).toThrow(RangeError);
    expect(() => interner.lookup(1)).toThrow(RangeError);
  });

  it('size reflects unique interns only', () => {
    const interner = new PathInterner();
    interner.intern('a');
    interner.intern('b');
    interner.intern('a');
    expect(interner.size).toBe(2);
  });

  it('independent instances have independent namespaces', () => {
    const a = new PathInterner();
    const b = new PathInterner();
    expect(a.intern('x')).toBe(0);
    expect(b.intern('x')).toBe(0);
    // They are different instances — same string, same id, but the interns are independent
    expect(a).not.toBe(b);
    a.intern('y');
    expect(a.size).toBe(2);
    expect(b.size).toBe(1);
  });
});
