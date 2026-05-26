---
task: 01-getvalueatpath-null
phase: 1
parallel_safe: true
model: sonnet
effort: low
depends_on: []
files:
  - packages/blac-core/src/tracking/path-utils.ts
  - packages/blac-core/src/tracking/path-utils.test.ts
---

# 01 — `getValueAtPath` must distinguish missing / null / `undefined`

## Bug

`packages/blac-core/src/tracking/path-utils.ts:69` short-circuits on `current == null`:

```ts
export function getValueAtPath(obj: unknown, segments: string[]): unknown {
  if (obj == null) return undefined;
  let current: unknown = obj;
  for (let i = 0; i < segments.length; i++) {
    current = (current as Record<string, unknown>)[segments[i]];
    if (current == null) return undefined; // <-- collapses three distinct states
  }
  return current;
}
```

Three semantically different states collapse to the same `undefined` return:

- `state.a === null`
- `state.a === undefined` / missing
- `state.a = { b: undefined }` (explicit undefined leaf)

Because change detection uses `Object.is(oldValue, newValue)`, transitions between these are **never observed**. A component that reads `state.a.b` won't re-render when `state.a` flips from `null` to `{ b: undefined }`, or from missing to `{}`.

Note the second short-circuit also stops walking, so even when the **leaf** is the same value but an **intermediate** parent toggles between null and an object, the function returns `undefined` either way.

## Fix

Don't short-circuit on null/undefined. Walk the whole path and let the natural JS access produce `undefined` for missing keys; but distinguish:

```ts
const MISSING = Symbol('missing'); // module-level

export function getValueAtPath(obj: unknown, segments: string[]): unknown {
  let current: unknown = obj;
  for (let i = 0; i < segments.length; i++) {
    if (current === null || current === undefined) {
      // We were asked to descend into a nullish value. Return MISSING so that
      // hasDependencyChanges can distinguish this from a real `undefined` leaf.
      return MISSING;
    }
    current = (current as Record<string, unknown>)[segments[i]];
  }
  return current;
}

export { MISSING as PATH_MISSING };
```

Then update `hasDependencyChanges` in `tracking-proxy.ts` to compare against `PATH_MISSING` — `Object.is(MISSING, MISSING)` is `true` only when both sides were missing, so missing → `undefined` is now detected as a change.

Alternative: return a `{ found: boolean; value: unknown }` object. Either is fine; the symbol approach is cheaper because it stays a single-value comparison and `Object.is` keeps working.

**Constraint:** the change must not break callers that just want the value (the symbol leaks into `pathCache` entries, which is fine — it's an internal cache, never user-visible).

## Check (before editing)

```sh
grep -rn "getValueAtPath" packages/blac-core/src
```

Confirm callers: `tracking-proxy.ts` (in `capturePaths` and `hasDependencyChanges`), `dependency-manager.ts` if any, and the existing tests.

## Implement

1. Add the `MISSING` symbol + export from `path-utils.ts`.
2. Rewrite `getValueAtPath` per the fix above.
3. In `tracking-proxy.ts` `capturePaths` and `hasDependencyChanges`, no code change should be needed if you use `Object.is` everywhere — the symbol naturally compares by identity. **Verify both files read `getValueAtPath` and store the return value as-is.**

## Test (regression — must fail before, pass after)

Add to `packages/blac-core/src/tracking/path-utils.test.ts`:

```ts
describe('getValueAtPath — nullable distinction', () => {
  it('distinguishes intermediate null from missing parent', () => {
    const a = getValueAtPath({ a: null }, ['a', 'b']);
    const b = getValueAtPath({}, ['a', 'b']);
    expect(Object.is(a, b)).toBe(true); // both PATH_MISSING — same handling
  });

  it('distinguishes PATH_MISSING from explicit undefined leaf', () => {
    const missing = getValueAtPath({ a: null }, ['a', 'b']);
    const explicit = getValueAtPath({ a: { b: undefined } }, ['a', 'b']);
    expect(Object.is(missing, explicit)).toBe(false);
  });

  it('returns the explicit undefined leaf when present', () => {
    expect(getValueAtPath({ a: { b: undefined } }, ['a', 'b'])).toBeUndefined();
  });
});
```

## Verify

```sh
pnpm --filter @blac/core typecheck
pnpm --filter @blac/core test -- path-utils.test.ts
pnpm --filter @blac/core test -- tracking.edge-cases.test.ts
pnpm --filter @blac/core test -- dependency-tracker.test.ts
```

(The latter two confirm no regression in the broader tracker tests.)

## Commit

```
fix(core): preserve missing-vs-null distinction in getValueAtPath
```

Body (optional): "Path tracking previously collapsed missing keys and intermediate null parents to the same undefined return, causing change detection to miss transitions between null and {prop: undefined}."

## Checklist

- [ ] `getValueAtPath` rewritten; `PATH_MISSING` exported.
- [ ] No caller needs adjustment (symbol flows through `Object.is`).
- [ ] Regression test added under `path-utils.test.ts`.
- [ ] Typecheck passes.
- [ ] Targeted tests pass.
- [ ] Committed.

## Completion

**Commit SHA:** 6c162095e74989138beb2d132f7833e5e5991a82
**Files touched:**

- `packages/blac-core/src/tracking/path-utils.ts` — rewrote `getValueAtPath`; added `MISSING` symbol + `PATH_MISSING` export
- `packages/blac-core/src/tracking/path-utils.test.ts` — updated 4 existing tests to use `PATH_MISSING`; added regression `describe` block
  **Typecheck result:** pass (tsc --noEmit, 0 errors)
  **Test result:** 521 passed, 0 failed (path-utils, tracking.edge-cases, dependency-tracker)
