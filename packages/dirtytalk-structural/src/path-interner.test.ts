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

  it('internAncestor returns an id distinct from the normal path id', () => {
    const interner = new PathInterner();
    const normal = interner.intern('user');
    const ancestor = interner.internAncestor('user');
    expect(ancestor).not.toBe(normal);
    // Idempotent like intern.
    expect(interner.internAncestor('user')).toBe(ancestor);
  });

  it('lookup decodes an ancestor-watch id back to its real path', () => {
    const interner = new PathInterner();
    const ancestor = interner.internAncestor('items');
    expect(interner.lookup(ancestor)).toBe('items');
  });

  it('ancestor-watch ids of different paths do not collide', () => {
    const interner = new PathInterner();
    expect(interner.internAncestor('a')).not.toBe(interner.internAncestor('b'));
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

  describe('lookupSegments', () => {
    it('splits a dotted path into segments', () => {
      const interner = new PathInterner();
      const id = interner.intern('items.5.name');
      expect(interner.lookupSegments(id)).toEqual(['items', '5', 'name']);
    });

    it('empty path decodes to an empty segment array', () => {
      const interner = new PathInterner();
      const id = interner.intern('');
      expect(interner.lookupSegments(id)).toEqual([]);
    });

    it('memoizes — repeat calls for the same id return the ===-stable array', () => {
      const interner = new PathInterner();
      const id = interner.intern('user.email');
      const first = interner.lookupSegments(id);
      const second = interner.lookupSegments(id);
      expect(first).toBe(second);
    });

    it('decodes an ancestor-watch id to the real path segments', () => {
      const interner = new PathInterner();
      const ancestor = interner.internAncestor('items');
      expect(interner.lookupSegments(ancestor)).toEqual(['items']);
    });

    it('does not change size (no force-intern on lookup)', () => {
      const interner = new PathInterner();
      interner.intern('a.b.c');
      const sizeBefore = interner.size;
      interner.lookupSegments(interner.intern('a.b.c'));
      expect(interner.size).toBe(sizeBefore);
    });
  });

  describe('ancestorTargetId', () => {
    it('resolves an ancestor-watch id back to its real path id', () => {
      const interner = new PathInterner();
      const ancestor = interner.internAncestor('items');
      const real = interner.intern('items');
      expect(interner.ancestorTargetId(ancestor)).toBe(real);
    });

    it('returns undefined for a normal (non-ancestor) id', () => {
      const interner = new PathInterner();
      const real = interner.intern('items');
      expect(interner.ancestorTargetId(real)).toBeUndefined();
    });

    it('internAncestor also interns the real path (idempotent — no size drift on already-interned paths)', () => {
      const interner = new PathInterner();
      interner.intern('items'); // real path already present
      const sizeBefore = interner.size;
      interner.internAncestor('items'); // adds only the ancestor-watch entry
      expect(interner.size).toBe(sizeBefore + 1);
    });
  });

  describe('ancestorIds', () => {
    it('returns already-interned strict-ancestor prefix ids, longest first', () => {
      const interner = new PathInterner();
      const items = interner.intern('items');
      const items0 = interner.intern('items.0');
      const leaf = interner.intern('items.0.name');
      expect(interner.ancestorIds(leaf)).toEqual([items0, items]);
    });

    it('skips missing intermediate prefixes without interning them', () => {
      const interner = new PathInterner();
      const items = interner.intern('items');
      const leaf = interner.intern('items.0.name'); // 'items.0' never interned
      const sizeBefore = interner.size;
      // Only 'items' is a known prefix; 'items.0' is skipped, not force-interned.
      expect(interner.ancestorIds(leaf)).toEqual([items]);
      expect(interner.size).toBe(sizeBefore);
    });

    it('top-level path has no ancestors', () => {
      const interner = new PathInterner();
      const id = interner.intern('count');
      expect(interner.ancestorIds(id)).toEqual([]);
    });

    it('memoizes — repeat calls for the same id return the ===-stable array', () => {
      const interner = new PathInterner();
      interner.intern('a');
      const leaf = interner.intern('a.b');
      const first = interner.ancestorIds(leaf);
      const second = interner.ancestorIds(leaf);
      expect(first).toBe(second);
    });

    it('invalidates the memo when a new ancestor prefix is interned later', () => {
      const interner = new PathInterner();
      const leaf = interner.intern('items.0.name'); // prefixes not interned yet
      expect(interner.ancestorIds(leaf)).toEqual([]); // caches []
      const items = interner.intern('items'); // new prefix appears
      expect(interner.ancestorIds(leaf)).toEqual([items]); // memo recomputed
      // Memo re-warmed: steady-state stability restored.
      expect(interner.ancestorIds(leaf)).toBe(interner.ancestorIds(leaf));
    });
  });
});
