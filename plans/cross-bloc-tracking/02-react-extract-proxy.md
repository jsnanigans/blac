# Task 02 — React: extract `buildTrackedProxy` helper

- **Package**: `@blac/react` (`packages/blac-react`)
- **Model**: Sonnet 4.6 — **thinking effort: medium** (mechanical, behavior-preserving refactor)
- **Depends on**: nothing
- **Parallel-safe with**: Task 01 (disjoint package)
- **Read first**: `plans/cross-bloc-tracking/README.md`

## Goal

Extract the per-consumer proxy machinery currently inlined in `useBloc` into a
reusable `buildTrackedProxy(instance, trackedStateRef)` so Task 03 can reuse the
exact same construction for each tracked dependency. **Pure refactor — zero
behavior change.** All existing tests must stay green.

## Files

- New: `packages/blac-react/src/buildTrackedProxy.ts`
- Modify: `packages/blac-react/src/useBloc.ts` (replace the inlined block with a call)

## Context

The block to extract (`useBloc.ts` ~156-201): builds `getterDescs` (prototype
walk collecting getters), `thisProxy` (redirects `this.state` to
`trackedStateRef.current ?? live`), and the outer getter `proxy` (runs getters
with `thisProxy` as `this`). It currently closes over the local `trackedStateRef`
defined at ~230.

Key behaviors that MUST be preserved exactly:

- Getter descriptors collected across the prototype chain, excluding
  `Object.prototype`; both string and symbol keys; first-wins on shadowing.
- `thisProxy.get`: `state` → `trackedStateRef.current ?? Reflect.get`; everything
  else → `Reflect.get(t, k, r)` (receiver `r` threaded for chained getters).
- outer proxy: getter keys → `desc.get.call(thisProxy)`; else `Reflect.get`.
- One allocation per acquisition (do not move allocation into the hot path).

## Implementation

1. Create `buildTrackedProxy<T extends object>(instance: T, trackedStateRef: { current: unknown }): { proxy: T; thisProxy: T }`.
   - Move the `getterDescs` prototype walk, `thisProxy`, and outer `proxy`
     construction verbatim into the helper. Return both `proxy` and `thisProxy`
     (Task 03 needs `thisProxy` to also intercept dep handles — but in THIS task
     just expose it; do not add handle logic here).
2. In `useBloc`'s `useMemo`, replace the inlined block with:
   ```ts
   const { proxy, thisProxy } = buildTrackedProxy(instance, trackedStateRef);
   ```
   and return `trackedBloc: proxy` as before. Keep `thisProxy` referenced (Task 03
   will use it) — if unused now, it's fine as it's destructured but you may keep
   only `proxy` and have Task 03 widen the return usage. Prefer keeping the
   `{ proxy, thisProxy }` shape so Task 03 needs no signature change.
3. `trackedStateRef` is declared (~230) AFTER the `useMemo` (~135). It is a stable
   ref object, so closing over it inside the memo is safe today (the memo runs
   after the ref exists on re-renders, and the trap only reads `.current` at call
   time). **Preserve the existing ordering and closure semantics** — do not
   reorder hooks. If you must reference `trackedStateRef` inside the memo, keep it
   exactly as the current code does (it already closes over it).

## Verify

```fish
cd packages/blac-react
pnpm typecheck
pnpm exec vp lint src
pnpm exec vp fmt "." --check
# Behavior-preservation: the proxy/getter-tracking + cross-bloc suites must be unchanged.
pnpm exec vp test run src/__tests__/useBloc.proxyTracking.test.tsx
pnpm exec vp test run src/__tests__/useBloc.getter-tracking.test.tsx
pnpm exec vp test run src/__tests__/useBloc.cross-bloc-react.test.tsx
pnpm exec vp test run src/__tests__/useBloc.cross-bloc-edge-cases.test.tsx
pnpm exec vp test run src/__tests__/useBloc.cross-bloc-getter-tracking.test.tsx
```

All must pass with **identical** results to before (the `[GAP]` tests still
"stale" — this task does NOT change behavior).

## Commit

```
refactor(blac-react): extract buildTrackedProxy from useBloc
```

## Done when

- `buildTrackedProxy.ts` exists; `useBloc` uses it; no behavior change.
- All listed suites green, `[GAP]` tests still in their pre-existing state.
