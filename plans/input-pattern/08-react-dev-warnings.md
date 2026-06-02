---
task: 08-react-dev-warnings
phase: 3
parallel_safe: false
serial_group: react
model: sonnet
effort: medium
depends_on:
  - 07-react-deps
files:
  - packages/blac-react/src/types.ts
  - packages/blac-react/src/useBloc.ts
  - packages/blac-react/src/config.ts
  - packages/blac-react/src/__tests__/useBloc.dev-warnings.test.tsx # (new)
---

# 08 — Dev warnings + `dependencies` → `select` rename

## Goal

Close the silent-failure gaps the design calls out, and remove the `deps`/`dependencies` name clash. Dev-only (gated on `process.env.NODE_ENV !== 'production'`), zero prod cost.

## Approach

### A. Rename the manual selector `dependencies` → `select`

The existing manual re-render selector option is named `dependencies` (`types.ts:19-22`; used in `useBloc.ts` `determineTrackingMode` at `:65`, stored in `depsRef` at `:122-123`, and in `manualDepsSubscribe`/`manualDepsSnapshot`). It clashes with the new `deps`. Rename the OPTION to `select` everywhere in `@blac/react`:

- `UseBlocOptions.select?: (state, bloc) => unknown[]`
- `determineTrackingMode` keys off `options?.select`
- internal ref renamed `selectRef`
- Breaking change — no alias. (`@blac/compat` is out of scope; don't touch it.)

### B. Warn on unknown `useBloc` option keys

Catches v1-isms / typos that today are silently dropped (the design's "11 dead scheduler callbacks" failure). In dev, after reading options, compare `Object.keys(options)` against the known set (`instanceId`, `autoInstance`, `select`, `autoTrack`, `onMount`, `onUnmount`, `args`, `deps`) and `console.warn` listing unknown keys.

### C. Warn on explicit `instanceId` + keying `args` disagreement

If the caller passes BOTH an explicit `instanceId` and `args` whose derived key differs from that `instanceId`, warn that the explicit id overrides the derived identity (usually a mistake). (Core task 03 warns on same-key arg _mismatch_; this is the React-side "you keyed two ways" warning.)

### D. (If not already in core) multi-writer note

The cross-owner `deps` collision warning lives in core (task 04). Nothing to add here unless a React-level message is clearer; if so, keep it dev-only.

### Subtleties

- All warnings dev-gated; ensure they're tree-shaken/no-op in production builds.
- Keep messages actionable: name the offending key / both ids.
- Update any internal references and the package index if `select` is part of the public type surface.

## Check (before editing)

```fish
grep -rn "dependencies" packages/blac-react/src
grep -n "determineTrackingMode\|depsRef\|select" packages/blac-react/src/useBloc.ts
```

Confirm the option is still named `dependencies` and there's no unknown-key warning yet. STOP if already renamed.

## Implement

1. Rename `dependencies` → `select` across `@blac/react` (option + internals + types).
2. Add dev-only unknown-option-key warning.
3. Add dev-only `instanceId`+`args` disagreement warning.

## Test

`useBloc.dev-warnings.test.tsx` (spy on `console.warn`, set NODE_ENV via the test env):

```tsx
it('warns on unknown option key', () => {
  const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  renderHook(() => useBloc(SomeBloc, { props: {} } as any)); // v1-ism
  expect(spy).toHaveBeenCalledWith(expect.stringContaining('props'));
});
it('warns when instanceId and args-derived key disagree', () => {
  /* ... */
});
it('select replaces dependencies for manual deps', () => {
  /* assert select still drives manual-deps mode */
});
```

## Verify

```fish
pnpm --filter @blac/react typecheck
pnpm --filter @blac/react test -- useBloc.dev-warnings
pnpm --filter @blac/react test -- useBloc.dependencies   # ensure the renamed selector tests still pass (rename them to .select if present)
pnpm --filter @blac/react lint
```

## Commit

```
feat(react): rename dependencies→select and add dev-mode option warnings
```

Body: Avoids the `deps`/`dependencies` clash; warns (dev only) on unknown `useBloc` options and on `instanceId`/args identity conflicts.

## Checklist

- [x] `dependencies` option renamed to `select` (internals + types + existing tests)
- [x] unknown-option-key dev warning
- [x] `instanceId`+`args` disagreement dev warning
- [x] warnings dev-gated; tests pass; typecheck & lint clean
- [x] committed with Completion filled

## Completion

**Commit SHA:** df608ee5
**Files touched:** 8 files —

- `packages/blac-react/src/types.ts`
- `packages/blac-react/src/useBloc.ts`
- `packages/blac-react/src/__tests__/useBloc.select.test.tsx` (new, replaces .dependencies.test.tsx)
- `packages/blac-react/src/__tests__/useBloc.dev-warnings.test.tsx` (new)
- `packages/blac-react/src/__tests__/useBloc.manual-deps-edge-cases.test.tsx`
- `packages/blac-react/src/__tests__/useBloc.getter-advanced.test.tsx`
- `packages/blac-react/src/__tests__/useBloc.getter-tracking.test.tsx`
- `packages/blac-react/src/__tests__/useBloc.dependencies.test.tsx` (deleted)
  **Typecheck result:** clean (0 errors)
  **Test result:** 195 passed, 5 pre-existing failures in useBloc.array-methods-tracking (proxy-tracking WIP, per plan)
