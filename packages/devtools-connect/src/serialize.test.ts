import { describe, it, expect } from 'vite-plus/test';
import { serialize } from './serialize';

describe('serialize', () => {
  it('tags non-JSON values', () => {
    const out = serialize({
      map: new Map([['a', 1]]),
      set: new Set([1]),
      date: new Date(0),
      undef: undefined,
      fn() {},
    });
    expect(out).toEqual({
      map: { __type: 'Map', entries: [['a', 1]] },
      set: { __type: 'Set', values: [1] },
      date: { __type: 'Date', value: '1970-01-01T00:00:00.000Z' },
      undef: { __type: 'undefined' },
      fn: { __type: 'Function', name: 'fn' },
    });
  });

  it('marks circular references', () => {
    const a: Record<string, unknown> = {};
    a.self = a;
    expect(serialize(a)).toEqual({ self: { __type: 'Circular' } });
  });

  it('does not traverse DOM nodes or React expandos', () => {
    const fiber: Record<string, unknown> = {};
    fiber.self = fiber;
    const node = { nodeType: 1, nodeName: 'DIV', ['__reactFiber$x']: fiber };
    expect(serialize({ node, ['__reactProps$x']: fiber, ok: 1 })).toEqual({
      node: { __type: 'DOMNode', nodeName: 'DIV' },
      ok: 1,
    });
  });

  it('caps breadth, strings, depth and total size', () => {
    const limits = { maxBreadth: 2, maxString: 3, maxDepth: 1, maxNodes: 100 };
    expect(serialize([1, 2, 3], limits)).toEqual([
      1,
      2,
      { __type: 'Truncated', total: 3 },
    ]);
    expect(serialize('abcdef', limits)).toBe('abc… [+3 chars]');
    expect(serialize({ a: { b: { c: 1 } } }, limits)).toEqual({
      a: { b: { __type: 'Truncated', total: 0 } },
    });
    const wide = Array.from({ length: 10 }, () => ({ x: 1 }));
    const out = serialize(wide, { maxNodes: 5, maxBreadth: 10 }) as unknown[];
    expect(
      out.filter((v) => (v as { __type?: string }).__type === 'Truncated'),
    ).toHaveLength(6);
  });
});
