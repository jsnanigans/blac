---
task: 14-reducers
phase: 5
parallel_safe: false
serial_group: tracking-proxy
model: sonnet
effort: medium
depends_on:
  - 13-iterating-methods
files:
  - packages/blac-core/src/tracking/tracking-proxy.ts
  - packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts
---

# 14 — Wrap `reduce` / `reduceRight` so items are proxied (accumulator passed through raw)

## Bug

Task 13 wired up iterating methods, but `reduce` and `reduceRight` were intentionally left out because their callback signature is different: `(acc, item, index, arr) => acc`. Today they bind to raw → items raw → no tracking. The `matrixSum` getter in the demo uses `.reduce` and so do real-world flows for `sum`/`fold` operations.

## Fix

Add `reduce` / `reduceRight` to the dispatch in the array trap, with a dedicated wrapper that:

- Proxies each item at `path[i]`.
- Records `path[i]` in trackedPaths.
- Passes the accumulator through **raw** (it's a user-built value, not state).
- Passes the array proxy (`proxyRef`) as the fourth callback arg.
- Forwards the optional `initialValue` argument correctly (it's optional and the semantics differ when omitted).

### Implementation

Inside `createArrayProxy`, add a second set + factory parallel to `ITERATING_METHODS`:

```ts
const REDUCING_METHODS = new Set(['reduce', 'reduceRight']);

function makeReducingWrapper(methodName: string) {
  // oxlint-disable-next-line @typescript-eslint/no-explicit-any
  const realMethod = (Array.prototype as any)[methodName] as Function;
  return function (
    this: unknown,
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (acc: any, item: any, index: number, arr: U[]) => any,
    ...rest: unknown[]
  ) {
    const wrapped = (acc: unknown, item: U, index: number /*, _rawArr */) => {
      const indexPath = path ? `${path}[${index}]` : `[${index}]`;
      if (state.isTracking) {
        state.trackedPaths.add(indexPath);
      }
      const proxiedItem = isProxyable(item)
        ? createInternal(state, item as T, indexPath, depth + 1)
        : item;
      return callback(acc, proxiedItem, index, proxyRef);
    };
    // Forward `initialValue` only when actually provided — reduce/reduceRight
    // treat absence specially (use first/last element as seed).
    return rest.length > 0
      ? realMethod.call(target, wrapped, rest[0])
      : realMethod.call(target, wrapped);
  };
}
```

Extend the dispatch in `get`:

```ts
if (typeof prop === 'string') {
  if (ITERATING_METHODS.has(prop)) {
    return getOrCacheBound(state, arr, value, () => makeIteratingWrapper(prop));
  }
  if (REDUCING_METHODS.has(prop)) {
    return getOrCacheBound(state, arr, value, () => makeReducingWrapper(prop));
  }
}
```

### Subtleties

- **Optional initial value:** `arr.reduce(fn)` uses `arr[0]` as the seed and starts iteration at index 1. `arr.reduce(fn, init)` uses `init` and starts at index 0. We must forward `rest[0]` **only when actually provided** — passing `undefined` explicitly changes the semantics. Use `arguments.length` or `rest.length`.
- **No-arg reduce on empty array** throws `TypeError`. The native method handles that; our wrapper inherits it (we delegate to `realMethod.call(target, wrapped)` without a seed).
- **Accumulator is raw:** the user is building a derived value. If they want tracking inside the reducer (e.g., they accumulate items into a new object and dereference them later), it should still work because the **items** they read from are proxied; whatever they build is theirs to own.
- **`thisArg` is not part of the reduce signature.** No need to handle.
- **Type signatures in TypeScript:** `Array.prototype.reduce` is heavily overloaded. We don't need to perfectly type the wrapper — it just needs to compile. The `(...rest: unknown[])` shape is fine.
- **Identity stability:** same caching as task 13.

## Check (before editing)

```sh
grep -n "ITERATING_METHODS\|makeIteratingWrapper\|REDUCING_METHODS" packages/blac-core/src/tracking/tracking-proxy.ts
```

Confirm task 13 landed (ITERATING_METHODS exists) and REDUCING_METHODS doesn't.

## Implement

1. Add `REDUCING_METHODS` and `makeReducingWrapper` inside `createArrayProxy`.
2. Extend the dispatch in the `get` trap.
3. Don't touch the iterating wrapper; reuse `getOrCacheBound`.

## Test

Add to `packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts`:

```ts
describe('reduce / reduceRight — proxied items, raw accumulator', () => {
  function makeProxy<T>(obj: T) {
    const state = createProxyState<unknown>();
    state.isTracking = true;
    const p = createForTarget(state, obj) as T;
    return { state, p };
  }

  it('reduce with initial value sums proxied items', () => {
    const { state, p } = makeProxy({ items: [{ n: 1 }, { n: 2 }, { n: 3 }] });
    const sum = p.items.reduce((acc, it) => acc + it.n, 0);
    expect(sum).toBe(6);
    expect(state.trackedPaths.has('items[0].n')).toBe(true);
    expect(state.trackedPaths.has('items[1].n')).toBe(true);
    expect(state.trackedPaths.has('items[2].n')).toBe(true);
  });

  it('reduce without initial value uses first element as seed', () => {
    const { state, p } = makeProxy({ items: [{ n: 1 }, { n: 2 }, { n: 3 }] });
    // First call is (acc=items[0], item=items[1]) — both must remain proxied
    // when the user dereferences them.
    const out = p.items.reduce((acc, it) => ({ n: acc.n + it.n }));
    expect(out.n).toBe(6);
    // items[0] is used as seed (raw acc on the first invocation), but
    // subsequent items[1], items[2] are proxied → tracked.
    expect(state.trackedPaths.has('items[1].n')).toBe(true);
    expect(state.trackedPaths.has('items[2].n')).toBe(true);
  });

  it('reduceRight iterates right-to-left and tracks the visited indices', () => {
    const { state, p } = makeProxy({ items: [{ s: 'a' }, { s: 'b' }, { s: 'c' }] });
    const joined = p.items.reduceRight((acc, it) => acc + it.s, '');
    expect(joined).toBe('cba');
    expect(state.trackedPaths.has('items[0].s')).toBe(true);
    expect(state.trackedPaths.has('items[1].s')).toBe(true);
    expect(state.trackedPaths.has('items[2].s')).toBe(true);
  });

  it('reduce on empty array without initial value throws', () => {
    const { p } = makeProxy({ items: [] as { n: number }[] });
    expect(() => p.items.reduce((acc, it) => acc + it.n)).toThrow(TypeError);
  });

  it('reduce on empty array with initial value returns the initial', () => {
    const { p } = makeProxy({ items: [] as { n: number }[] });
    expect(p.items.reduce((acc, it) => acc + it.n, 42)).toBe(42);
  });

  it('explicit undefined initial value is treated as a seed (matches native behavior)', () => {
    const { p } = makeProxy({ items: [{ n: 1 }] });
    // Native: passing explicit undefined IS treated as a provided seed.
    const out = p.items.reduce<undefined | { n: number }>(
      (acc, it) => (acc ? { n: acc.n + it.n } : it),
      undefined,
    );
    expect(out?.n).toBe(1);
  });

  it('method identity is stable across renders for reduce', () => {
    const { p } = makeProxy({ items: [{ n: 1 }] });
    expect(p.items.reduce).toBe(p.items.reduce);
  });

  it('per-index tracking via reduce — no re-render when an unread item changes ref', () => {
    const tracker = createDependencyState();
    const a = { done: true };
    const b = { done: false };
    const c = { done: false };
    const state1 = { items: [a, b, c] };

    startDependency(tracker);
    const p1 = createDependencyProxy(tracker, state1);
    // Compute a value depending on all .done props
    const count = p1.items.reduce((acc, it) => acc + (it.done ? 1 : 0), 0);
    expect(count).toBe(1);
    capturePaths(tracker, state1);

    // Replace items[1] ref only, but with same .done value
    const state2 = { items: [a, { done: b.done }, c] };
    // Hmm — items[1].done same value, but items[1] itself is a different ref.
    // Path tracked is 'items[1].done' which compares by value (Object.is on the
    // boolean). No change.
    expect(hasDependencyChanges(tracker, state2)).toBe(false);

    // Now actually flip items[1].done
    const state3 = { items: [a, { done: !b.done }, c] };
    expect(hasDependencyChanges(tracker, state3)).toBe(true);
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
feat(core): wrap reduce/reduceRight to proxy items during folding
```

Body: "reduce and reduceRight now proxy each iterated item at path[i] so reducer callbacks dereferencing item properties record per-index tracked paths. Initial value semantics (omitted vs. explicit undefined) match native."

## Checklist

- [ ] `REDUCING_METHODS` set + `makeReducingWrapper` factory added.
- [ ] Dispatch extended in the get trap.
- [ ] `rest.length` guard preserves omitted-vs-undefined initial-value semantics.
- [ ] All seven regression tests pass.
- [ ] Existing tracker tests still pass.
- [ ] Committed.

## Completion

**Commit SHA:** 33bc647d
**Files touched:**
- `packages/blac-core/src/tracking/tracking-proxy.ts`
- `packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts`

**Typecheck result:** Pass (0 errors)
**Test result:** 559 tests pass (all 7 new reduce/reduceRight regression tests included)
