---
task: 07-react-deps
phase: 3
parallel_safe: false
serial_group: react
model: opus
effort: high
depends_on:
  - 06-react-args
files:
  - packages/blac-react/src/types.ts
  - packages/blac-react/src/useBloc.ts
  - packages/blac-react/src/__tests__/useBloc.deps.test.tsx  # (new)
---

# 07 — `useBloc` `deps` lane: per-consumer merge + cleanup

## Goal

Add `useBloc(Bloc, { deps })` for non-serializable handles (refs/callbacks/controllers). Each consumer's `deps` slice is merged into `bloc.deps` keyed by the consumer's stable id, re-synced on commit, and withdrawn on unmount — driving the core `[APPLY_DEPS]`/`[REMOVE_DEPS_OWNER]`/`onDepsChanged` engine from task 04. Never mutates during render.

## Approach

1. **`types.ts`** — add `deps?: Partial<ExtractDeps<T>>` to `UseBlocOptions` (typed from `@blac/adapter`'s re-export). It's always optional and partial (a consumer contributes a slice).

2. **`useBloc.ts`** — wire the merge/cleanup using the EXISTING per-consumer id and effect structure:
   - **Owner id**: reuse `consumerIdRef.current` (`:113-116`) — already the stable per-consumer identity used for `refId`.
   - **Apply on commit**: in the no-dep-array commit effect (`:222-230`, the one that calls `disableGetterTracking` + `externalDepsManager.updateSubscriptions`) — add `rawInstance[APPLY_DEPS](consumerId, options.deps ?? {})`. Running every commit + the core shallow-diff makes it idempotent and picks up changed ref/callback identities. Read `deps` from a ref (`depsSliceRef`) updated each render so the effect sees the latest.
   - **Cleanup on unmount**: in the keyed effect's cleanup (`:253-267`, alongside `manager.cleanup()` / `release(...)`) — add `currentRawInstance[REMOVE_DEPS_OWNER](consumerId)` BEFORE `release` (so `onDepsChanged` can fire teardown while the instance is still alive).
   - Import `APPLY_DEPS`/`REMOVE_DEPS_OWNER` from `@blac/adapter` (re-exported in task 05).

3. **Ordering guarantee**: `[APPLY_DEPS]` runs in a commit effect, never during render → no mid-render emits. The core engine fires `onDepsChanged` synchronously inside the apply, so a bloc that inits a canvas/controller on first wire does so post-commit.

### Subtleties
- Use `rawInstance` (the un-proxied instance) for the symbol calls, not the tracking proxy `bloc` — these are internal merge entry points, not tracked reads. `rawInstance` is already available from the resolution `useMemo` (`:142`).
- StrictMode double-commit: the core diff makes a repeated identical `[APPLY_DEPS]` a no-op; double `[REMOVE_DEPS_OWNER]` is safe (removing an absent owner is a no-op — confirm task 04 guards this).
- A consumer that passes no `deps` should apply an empty slice (or skip) — pick one and be consistent; empty-slice apply is simplest and keeps owner bookkeeping uniform.
- Do NOT add `deps` to the resolution `useMemo` dep array (`:205`) — deps must NOT re-resolve/re-create the instance (that's the whole point: they don't key identity). They only feed the merge effect.

## Check (before editing)
```fish
grep -n "consumerIdRef\|APPLY_DEPS\|useEffect\|externalDepsManager.updateSubscriptions\|release(" packages/blac-react/src/useBloc.ts
grep -n "deps\b" packages/blac-react/src/types.ts
```
Confirm: the two effects exist (commit-every-render at ~:222, keyed cleanup at ~:232-269), `consumerIdRef` is set at ~:113, and there's no `deps` option / `APPLY_DEPS` usage yet. STOP if deps wiring already present.

## Implement
1. Add `deps` to `UseBlocOptions`.
2. Apply per-consumer slice in the commit effect (read from a ref); withdraw in the unmount cleanup before `release`.
3. Ensure no instance re-resolution from `deps`.

## Test
`useBloc.deps.test.tsx`:
```tsx
class Canvas extends Cubit<{ ready: boolean }, void, { el?: { id: number } }> {
  state = { ready: false };
  protected onDepsChanged(next: any, prev: any) {
    if (next.el && next.el !== prev.el) this.emit({ ready: true });
    if (!next.el && prev.el) this.emit({ ready: false });
  }
}
it('wires a dep post-commit and fires onDepsChanged', async () => {
  const { result } = renderHook(() => useBloc(Canvas, { deps: { el: { id: 1 } } }));
  await waitFor(() => expect(result.current[0].ready).toBe(true));
});
it('merges slices from two consumers and withdraws on unmount', () => {
  // mount A with { el }, mount B with another key, assert bloc.deps has both;
  // unmount A, assert only A's key withdrawn (other untouched)
});
it('does NOT re-create the instance when deps identity changes', () => {
  // rerender with a new { el } object, assert same bloc instance
});
```

## Verify
```fish
pnpm --filter @blac/react typecheck
pnpm --filter @blac/react test -- useBloc.deps
pnpm --filter @blac/react lint
```
Also run the compiler suite for this file, since deps wiring interacts with effects under the React Compiler:
```fish
pnpm --filter @blac/react exec vp test run --config vitest.config.compiler.ts -- useBloc.deps
```

## Commit
```
feat(react): per-consumer deps lane wired to core merge + onDepsChanged
```
Body: `useBloc(C, { deps })` merges a per-consumer slice into `bloc.deps` on commit and withdraws it on unmount; never mutates during render; doesn't affect instance identity.

## Checklist
- [ ] `deps` option typed (partial)
- [ ] apply-on-commit via `consumerId` + ref; withdraw-before-release on unmount
- [ ] deps excluded from instance resolution
- [ ] StrictMode-idempotent; default + compiler suites pass
- [ ] typecheck & lint clean
- [ ] committed with Completion filled

## Completion
**Commit SHA:** 35e7ed86 (see `git log` for the canonical hash; this block was embedded via amend)
**Files touched:** 3 source/test + this task file —
- `packages/blac-react/src/types.ts` (import `ExtractDeps`; add `deps?: Partial<ExtractDeps<TBloc>>` to `UseBlocOptions`)
- `packages/blac-react/src/useBloc.ts` (import `APPLY_DEPS`/`REMOVE_DEPS_OWNER`/`ExtractDeps`; add `depsSliceRef` updated each render; `[APPLY_DEPS](consumerId, slice)` on `rawInstance` in the commit-every-render effect; `[REMOVE_DEPS_OWNER](consumerId)` in the keyed cleanup before `release`; deps NOT added to the resolution `useMemo` dep array)
- `packages/blac-react/src/__tests__/useBloc.deps.test.tsx` (new — 3 tests)
- `plans/input-pattern/07-react-deps.md` (this block)

**Typecheck result:** `pnpm --filter @blac/react typecheck` — clean (tsc --noEmit, 0 errors).
**Test result:**
- Default config: `useBloc.deps.test.tsx` — 3/3 pass (`wires a dep post-commit and fires onDepsChanged`, `merges slices from two consumers and withdraws on unmount`, `does NOT re-create the instance when deps identity changes`).
- Compiler config (`vitest.config.compiler.ts`): same 3/3 pass.
- Lint: 0 errors (6 pre-existing warnings unrelated to this change).
- Note: the 5 known-pre-existing failures in `useBloc.array-methods-tracking.test.tsx` (proxy-tracking WIP) are unaffected/ignored per task scope.
