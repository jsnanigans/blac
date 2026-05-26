---
task: 04-array-index-tracking
phase: 2
parallel_safe: false
serial_group: tracking-proxy
model: haiku
effort: low
depends_on: []
files:
  - packages/blac-core/src/tracking/tracking-proxy.ts
  - packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts
---

# 04 — Array index access must track its own index path

## Bug

`packages/blac-core/src/tracking/tracking-proxy.ts:132-141` (inside `createArrayProxy`):

```ts
if (isProxyable(value)) {
  return createInternal(state, value as T, fullPath, depth + 1);
}

if (state.isTracking) {
  state.trackedPaths.add(fullPath);
}
```

For an indexed access (`arr[0]`), the path `items[0]` is added **only when the value is not proxyable**. If `arr[0]` is an object, the proxy is returned and the path is never recorded.

Compare to the object trap, which adds the path **before** the proxyable branch (line 207-211). The inconsistency means `if (state.items[0])` returning a proxy doesn't track `items[0]` at all — and because the proxy is always truthy, the user's branch logic is also wrong, but that's a separate problem. The tracking side here is plainly missing.

Concrete failure: render observes `state.items[0]` (gets a proxy). Doesn't deref further. State changes — say `items[0]` is replaced by a different object with the same shape but no further path overlap. `pathCache` has no entry for `items[0]`, so change detection sees nothing.

## Fix

Move the `trackedPaths.add(fullPath)` **before** the proxyable branch, matching the object trap. Keep the `length` early return where it is.

After fix (the index branch):

```ts
if (state.isTracking) {
  state.trackedPaths.add(fullPath);
}

if (isProxyable(value)) {
  return createInternal(state, value as T, fullPath, depth + 1);
}

return value;
```

(Drop the duplicated post-isProxyable `trackedPaths.add` block — there will be only one add now.)

**Note:** the `length` branch already adds its own path and returns early, so don't touch that. Function-typed values are caught higher up (also unchanged).

## Check (before editing)

Read `tracking-proxy.ts` lines 84–145 (the `createArrayProxy` body). Confirm the layout matches the audit; if a previous task already touched it, re-read to find current line numbers.

```sh
grep -n "trackedPaths.add" packages/blac-core/src/tracking/tracking-proxy.ts
```

Should show two adds inside `createArrayProxy` after the fix (length, index) and the existing adds in the object trap.

## Implement

Apply the move-before-proxyable rearrangement described above. No other behavior changes.

## Test

Add to `packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts`:

```ts
describe('array index tracking', () => {
  it('tracks the index path when value is a proxyable object', () => {
    const state = createProxyState<unknown>();
    state.isTracking = true;
    const obj = { items: [{ name: 'a' }, { name: 'b' }] };
    const proxy = createForTarget(state, obj) as typeof obj;
    // Access items[0] but do NOT deref further:
    void proxy.items[0];
    expect(state.trackedPaths.has('items[0]')).toBe(true);
  });

  it('still tracks the path when value is a primitive', () => {
    const state = createProxyState<unknown>();
    state.isTracking = true;
    const obj = { items: [1, 2, 3] };
    const proxy = createForTarget(state, obj) as typeof obj;
    void proxy.items[0];
    expect(state.trackedPaths.has('items[0]')).toBe(true);
  });
});
```

Use the existing imports in `proxy-tracker.edge-cases.test.ts` — they may already export `createProxyState` / `createForTarget`. If those exports aren't there, follow the pattern of other tests in that file.

## Verify

```sh
pnpm --filter @blac/core typecheck
pnpm --filter @blac/core test -- proxy-tracker.edge-cases.test.ts
pnpm --filter @blac/core test -- dependency-tracker.test.ts
```

## Commit

```
fix(core): track array index path when value is proxyable
```

Body: "Array trap previously only added the index path when the value was non-proxyable, leaving `state.items[0]` accesses invisible to change detection when items[0] was an object."

## Checklist

- [ ] Index-add moved before the `isProxyable` branch.
- [ ] No duplicate add remains.
- [ ] Both regression tests pass.
- [ ] Existing tracker tests still pass.
- [ ] Committed.

## Completion

**Commit SHA:** 343d2815
**Files touched:** packages/blac-core/src/tracking/tracking-proxy.ts, packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts
**Typecheck result:** PASS
**Test result:** All 523 tests passed across 27 test files
