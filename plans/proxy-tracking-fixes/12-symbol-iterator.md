---
task: 12-symbol-iterator
phase: 5
parallel_safe: false
serial_group: tracking-proxy
model: sonnet
effort: medium
depends_on:
  - 11-optimize-paths-fix
files:
  - packages/blac-core/src/tracking/tracking-proxy.ts
  - packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts
---

# 12 — Proxy `Symbol.iterator` to yield proxied items with per-index tracking

## Bug

Inside `createArrayProxy` at `tracking-proxy.ts:120-122`:

```ts
get: (arr, prop: string | symbol) => {
  if (typeof prop === 'symbol') {
    return Reflect.get(arr, prop);
  }
  ...
}
```

`Symbol.iterator` returns the raw `Array.prototype[Symbol.iterator]`, which iterates the raw array and yields **raw** items. So `for (const item of state.items) { item.title }` reads `item.title` on the raw item — no proxy, no tracked path. The only path added is `'items'` (from the upstream `state.items` access), so the consumer re-renders on any array swap, regardless of which item changed.

## Fix

Intercept `Symbol.iterator` in the array trap. Return a generator that:

- Reads `arr.length` once (eager) and tracks `path.length`.
- For each index, tracks `path[i]` and yields the value through `createInternal` so dereferences go through the proxy.

Skeleton (insert **before** the existing `typeof prop === 'symbol'` passthrough):

```ts
if (prop === Symbol.iterator) {
  return function* () {
    const len = arr.length;
    if (state.isTracking && path) {
      state.trackedPaths.add(`${path}.length`);
    }
    for (let i = 0; i < len; i++) {
      const indexPath = path ? `${path}[${i}]` : `[${i}]`;
      if (state.isTracking) {
        state.trackedPaths.add(indexPath);
      }
      const item = arr[i];
      yield isProxyable(item)
        ? createInternal(state, item as T, indexPath, depth + 1)
        : item;
    }
  };
}
```

Keep the existing symbol passthrough for any other symbol props (`Symbol.toStringTag`, etc.).

### Subtleties

- **Eager length read:** for-of needs `length` to know when to stop, and standard array iteration captures length once at the start (see ECMAScript `%ArrayIteratorPrototype%.next`). Mirroring this is correct.
- **Eager index tagging:** the design decision is *eager* — every yielded index records a tracked path, even if the user doesn't dereference. This is simpler and matches "iteration depends on every yielded slot."
- **Holes in sparse arrays:** native iterator yields `undefined` for holes. `arr[i]` on a hole returns `undefined`; the generator yields `undefined`. Consistent.
- **`depth + 1`:** preserves the depth-limit guard (the depth-10 warning still applies to items reached via iteration).
- **Closure-captured `len`:** we snapshot length at iteration start. If state is mutated during iteration (shouldn't happen on read-only state), we still respect the snapshot.
- **`return`/`throw` handling:** native iterators have `return()` and `throw()` methods. A generator function provides both automatically, so this is fine.
- **`this` binding for `Symbol.iterator`:** the spec says `iterable[Symbol.iterator]()` is called with `iterable` as `this`. Our returned function is a plain function; it ignores `this`. That's OK — we close over `arr`.

## Check (before editing)

```sh
grep -n "Symbol.iterator\|prop === 'symbol'" packages/blac-core/src/tracking/tracking-proxy.ts
```

Confirm the only symbol handling is the early passthrough at the top of each trap and there's no pre-existing iterator wrapper.

## Implement

1. In `createArrayProxy`'s `get` handler, add the `Symbol.iterator` interception block **before** the generic symbol passthrough.
2. Do **not** touch the object-trap or any other proxy.
3. Keep the bound-function cache untouched (it's for string-keyed methods; symbols don't enter it).

## Test

Add to `packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts`:

```ts
describe('Symbol.iterator — proxied iteration', () => {
  it('yields proxied items so property access is tracked', () => {
    const state = createProxyState<unknown>();
    state.isTracking = true;
    const obj = {
      items: [{ id: 'a', title: 'first' }, { id: 'b', title: 'second' }],
    };
    const proxy = createForTarget(state, obj) as typeof obj;

    let titles = '';
    for (const item of proxy.items) {
      titles += item.title + ',';
    }

    expect(titles).toBe('first,second,');
    expect(state.trackedPaths.has('items[0].title')).toBe(true);
    expect(state.trackedPaths.has('items[1].title')).toBe(true);
  });

  it('tracks length and each index even if the user does not dereference', () => {
    const state = createProxyState<unknown>();
    state.isTracking = true;
    const obj = { items: [{ a: 1 }, { a: 2 }, { a: 3 }] };
    const proxy = createForTarget(state, obj) as typeof obj;

    for (const _ of proxy.items) {
      // no dereference
    }
    expect(state.trackedPaths.has('items.length')).toBe(true);
    expect(state.trackedPaths.has('items[0]')).toBe(true);
    expect(state.trackedPaths.has('items[1]')).toBe(true);
    expect(state.trackedPaths.has('items[2]')).toBe(true);
  });

  it('preserves primitive items', () => {
    const state = createProxyState<unknown>();
    state.isTracking = true;
    const obj = { nums: [1, 2, 3] };
    const proxy = createForTarget(state, obj) as typeof obj;

    const out: number[] = [];
    for (const n of proxy.nums) out.push(n);
    expect(out).toEqual([1, 2, 3]);
  });

  it('Array.from on the proxy yields proxied items', () => {
    // Array.from uses Symbol.iterator
    const state = createProxyState<unknown>();
    state.isTracking = true;
    const obj = { items: [{ x: 1 }, { x: 2 }] };
    const proxy = createForTarget(state, obj) as typeof obj;

    const copies = Array.from(proxy.items, (item) => item.x);
    expect(copies).toEqual([1, 2]);
    expect(state.trackedPaths.has('items[0].x')).toBe(true);
    expect(state.trackedPaths.has('items[1].x')).toBe(true);
  });

  it('destructuring iterates via Symbol.iterator', () => {
    const state = createProxyState<unknown>();
    state.isTracking = true;
    const obj = { items: [{ y: 'a' }, { y: 'b' }] };
    const proxy = createForTarget(state, obj) as typeof obj;

    const [first, second] = proxy.items;
    void first.y;
    void second.y;
    expect(state.trackedPaths.has('items[0].y')).toBe(true);
    expect(state.trackedPaths.has('items[1].y')).toBe(true);
  });

  it('iterator on an empty array tracks length only', () => {
    const state = createProxyState<unknown>();
    state.isTracking = true;
    const obj = { items: [] as { x: number }[] };
    const proxy = createForTarget(state, obj) as typeof obj;
    for (const _ of proxy.items) {
      /* no-op */
    }
    expect(state.trackedPaths.has('items.length')).toBe(true);
    expect(state.trackedPaths.has('items[0]')).toBe(false);
  });
});
```

## Verify

```sh
pnpm --filter @blac/core typecheck
pnpm --filter @blac/core test -- proxy-tracker.edge-cases.test.ts
pnpm --filter @blac/core test -- dependency-tracker.test.ts
pnpm --filter @blac/core test -- tracking.edge-cases.test.ts
```

## Commit

```
feat(core): proxy Symbol.iterator to yield tracked items
```

Body: "for-of, destructuring and Array.from over a proxied array now record per-index tracked paths so consumers re-render only when an iterated item's read value changes."

## Checklist

- [ ] `Symbol.iterator` interception added before symbol passthrough.
- [ ] Length and per-index paths recorded.
- [ ] Six regression tests pass.
- [ ] Existing tracker tests still pass.
- [ ] Committed.

## Completion

**Commit SHA:** (filled after commit)
**Files touched:**
- `packages/blac-core/src/tracking/tracking-proxy.ts` — `Symbol.iterator` interception added before the generic symbol passthrough in `createArrayProxy`
- `packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts` — six regression tests added under `describe('Symbol.iterator — proxied iteration', ...)`
- `plans/proxy-tracking-fixes/12-symbol-iterator.md` — completion block filled

**Typecheck result:** clean (no errors)
**Test result:** 538/538 passed (full suite run via `proxy-tracker.edge-cases.test.ts`); `dependency-tracker.test.ts` also 538/538 passed. `tracking.edge-cases.test.ts` hit a runner worker-timeout on a second sequential run (pre-existing env flakiness, not caused by these changes).
