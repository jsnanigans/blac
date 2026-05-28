import { describe, expect, it } from 'vite-plus/test';
import {
  ALL_PATHS,
  PathSetSpace,
  emptyPathSet,
  pathSetEquals,
  pathSetUnion,
} from './path-set';

describe('emptyPathSet', () => {
  it('returns a Set<PathId> with size 0 (not ALL_PATHS)', () => {
    const s = emptyPathSet();
    expect(s).not.toBe(ALL_PATHS);
    expect(s).toBeInstanceOf(Set);
    expect((s as Set<number>).size).toBe(0);
  });

  it('returns a fresh instance on each call', () => {
    expect(emptyPathSet()).not.toBe(emptyPathSet());
  });
});

describe('pathSetUnion', () => {
  it('unions two disjoint sets without mutating inputs', () => {
    const a = new Set([1, 2]);
    const b = new Set([3, 4]);
    const result = pathSetUnion(a, b) as Set<number>;
    expect(result).toBeInstanceOf(Set);
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
    // inputs must not be mutated
    expect(a.size).toBe(2);
    expect(b.size).toBe(2);
  });

  it('union with empty equals the other by value, is a fresh Set', () => {
    const r = new Set([1, 2]);
    const result = pathSetUnion(emptyPathSet(), r) as Set<number>;
    expect(result).toBeInstanceOf(Set);
    expect(result).not.toBe(r);
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2]);
  });

  it('union with ALL_PATHS on right returns ALL_PATHS', () => {
    expect(pathSetUnion(new Set([1]), ALL_PATHS)).toBe(ALL_PATHS);
  });

  it('union with ALL_PATHS on left returns ALL_PATHS', () => {
    expect(pathSetUnion(ALL_PATHS, new Set([1]))).toBe(ALL_PATHS);
  });

  it('ALL_PATHS union ALL_PATHS returns ALL_PATHS', () => {
    expect(pathSetUnion(ALL_PATHS, ALL_PATHS)).toBe(ALL_PATHS);
  });
});

describe('pathSetEquals', () => {
  it('two empty Sets are equal', () => {
    expect(pathSetEquals(new Set(), new Set())).toBe(true);
  });

  it('same-content Sets (different instances) are equal', () => {
    expect(pathSetEquals(new Set([1, 2, 3]), new Set([3, 1, 2]))).toBe(true);
  });

  it('different-content Sets are not equal', () => {
    expect(pathSetEquals(new Set([1, 2]), new Set([1, 3]))).toBe(false);
  });

  it('ALL_PATHS equals ALL_PATHS', () => {
    expect(pathSetEquals(ALL_PATHS, ALL_PATHS)).toBe(true);
  });

  it('ALL_PATHS does not equal an empty Set', () => {
    expect(pathSetEquals(ALL_PATHS, new Set())).toBe(false);
  });

  it('ALL_PATHS does not equal a non-empty Set', () => {
    expect(pathSetEquals(ALL_PATHS, new Set([1]))).toBe(false);
  });
});

describe('PathSetSpace', () => {
  it('empty() returns an empty Set<PathId>', () => {
    const e = PathSetSpace.empty();
    expect(e).toBeInstanceOf(Set);
    expect((e as Set<number>).size).toBe(0);
  });

  it('isEmpty(empty()) is true', () => {
    expect(PathSetSpace.isEmpty(PathSetSpace.empty())).toBe(true);
  });

  it('isEmpty(ALL_PATHS) is false', () => {
    expect(PathSetSpace.isEmpty(ALL_PATHS)).toBe(false);
  });

  it('isEmpty(new Set([1])) is false', () => {
    expect(PathSetSpace.isEmpty(new Set([1]))).toBe(false);
  });

  it('union(empty(), Set) equals the Set by value', () => {
    const r = new Set([1, 2]);
    const result = PathSetSpace.union(PathSetSpace.empty(), r) as Set<number>;
    expect(result).toBeInstanceOf(Set);
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2]);
  });

  it('union(empty(), ALL_PATHS) equals ALL_PATHS', () => {
    expect(PathSetSpace.union(PathSetSpace.empty(), ALL_PATHS)).toBe(ALL_PATHS);
  });

  it('intersects(empty(), anything) is false', () => {
    expect(PathSetSpace.intersects(PathSetSpace.empty(), new Set([1, 2]))).toBe(
      false,
    );
    expect(PathSetSpace.intersects(PathSetSpace.empty(), ALL_PATHS)).toBe(
      false,
    );
  });

  it('intersects(Set, Set) — overlapping returns true', () => {
    expect(PathSetSpace.intersects(new Set([1, 2]), new Set([2, 3]))).toBe(
      true,
    );
  });

  it('intersects(Set, Set) — disjoint returns false', () => {
    expect(PathSetSpace.intersects(new Set([1, 2]), new Set([3, 4]))).toBe(
      false,
    );
  });

  it('intersects(ALL_PATHS, non-empty Set) is true', () => {
    expect(PathSetSpace.intersects(ALL_PATHS, new Set([1]))).toBe(true);
  });

  it('intersects(ALL_PATHS, empty Set) is false', () => {
    expect(PathSetSpace.intersects(ALL_PATHS, new Set())).toBe(false);
  });

  it('intersects(ALL_PATHS, ALL_PATHS) is true', () => {
    expect(PathSetSpace.intersects(ALL_PATHS, ALL_PATHS)).toBe(true);
  });

  it('intersects(non-empty Set, ALL_PATHS) is true (symmetric)', () => {
    expect(PathSetSpace.intersects(new Set([1]), ALL_PATHS)).toBe(true);
  });
});
