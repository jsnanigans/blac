import { diff } from './diff';

describe('diff', () => {
  it('reports added, removed and changed paths', () => {
    expect(
      diff(
        { a: 1, b: { c: 1, d: 2 }, e: [1] },
        { a: 2, b: { c: 1 }, e: [1, 2], f: 1 },
      ),
    ).toEqual([
      { path: 'a', kind: 'changed', before: 1, after: 2 },
      { path: 'b.d', kind: 'removed', before: 2 },
      { path: 'e.1', kind: 'added', after: 2 },
      { path: 'f', kind: 'added', after: 1 },
    ]);
  });

  it('compares tagged values as leaves', () => {
    const date = (value: string) => ({ __type: 'Date', value });
    expect(diff({ d: date('a') }, { d: date('a') })).toEqual([]);
    expect(diff({ d: date('a') }, { d: date('b') })).toHaveLength(1);
  });

  it('caps the number of changes', () => {
    const wide = (n: number) =>
      Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`k${i}`, n]));
    expect(diff(wide(1), wide(2))).toHaveLength(100);
  });
});
