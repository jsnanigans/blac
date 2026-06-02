# Task 04 — Tests + docs for cross-bloc auto-tracking

- **Package**: `@blac/react` (+ docs if applicable)
- **Model**: Sonnet 4.6 — **thinking effort: high** (must reason about reactive semantics to write meaningful tests)
- **Depends on**: Task 03 (committed)
- **Parallel-safe with**: none
- **Read first**: `plans/cross-bloc-tracking/README.md`, `03-react-wiring.md`

## Goal

Turn the characterization suite into a full spec for `.track()` auto-tracking,
add the edge-case coverage the design calls out, and document the feature.

## Files

- `packages/blac-react/src/__tests__/useBloc.cross-bloc-getter-tracking.test.tsx` (expand/rewrite)
- New (optional split for clarity): `packages/blac-react/src/__tests__/useBloc.track-lifecycle.test.tsx`
- Docs: locate the cross-bloc / `depend` docs page under `apps/docs` (search for `depend`) and add a `.track()` section. If no suitable page exists, add a short note where `depend` is documented. Keep code samples Twoslash-valid (they are typechecked at docs build).

## Test cases to cover (all should PASS post-Task-03)

Rewrite the `[GAP]` tests to assert the new reactive behavior, and add:

1. **Auto-track without explicit subscribe**: consumer reads `bloc.total` (uses
   `this.price.track()`); `PriceBloc` emits → consumer re-renders with new value,
   **without** `useBloc(PriceBloc)`.
2. **Dep getter transitivity**: dep's `someGetter` reads the dep's own state;
   consumer reads it through `.track()`; changing the dep's state wakes consumer.
3. **Deep chain A→B→C**: each links via `.track()`; bumping C wakes a consumer
   that only `useBloc(A)`.
4. **Path-scoped**: tracking dep field `a` does NOT wake on dep field `b` change
   (only if the dep emits granularly — verify against the structural channel
   semantics; if plain-object emits are coarse, assert the documented behavior).
5. **Conditional `.track()`**: getter calls `.track()` only when a local flag is
   on. Flag on → dep change wakes; flag off (next render) → dep change no longer
   wakes (subscription + refcount dropped). Assert render counts.
6. **Mutual deps A↔B**: both track each other; changing either wakes consumers of
   both; no infinite render loop (assert render count stabilizes).
7. **`.track()` outside render**: call a bloc method that calls `.track()` (no
   active render) → returns live values, registers no subscription (a later dep
   emit does not wake an unrelated consumer).
8. **Lifecycle**: unmounting the consumer releases the dep ref (assert the dep is
   disposed when no other refs) and unsubscribes (a later dep emit causes no
   render / no warning).
9. **Own-state still works** alongside cross-bloc tracking (regression guard).

Keep `[GAP]` markers only on anything still genuinely unsupported (ideally none).
Use `vite-plus/test` + RTL imports; `blacTestSetup()`.

## Verify

```fish
cd packages/blac-react
pnpm typecheck
pnpm exec vp lint src
pnpm exec vp fmt "." --check
pnpm exec vp test run src/__tests__/useBloc.cross-bloc-getter-tracking.test.tsx
pnpm exec vp test run src/__tests__/useBloc.track-lifecycle.test.tsx   # if created
# full cross-bloc regression sweep:
pnpm exec vp test run src/__tests__/useBloc.cross-bloc-react.test.tsx
pnpm exec vp test run src/__tests__/useBloc.cross-bloc-edge-cases.test.tsx
```
If docs touched: `cd apps/docs; pnpm build` (Twoslash = the typecheck for samples).

## Commit

```
test(blac-react): spec cross-bloc track() + docs
```
(Split into two commits — `test(...)` and `docs(...)` — if docs are non-trivial.)

## Done when

- All cross-bloc suites green; every prior `[GAP]` now passes.
- New edge cases (conditional, mutual, lifecycle, outside-render) covered.
- Docs build clean (if touched).
