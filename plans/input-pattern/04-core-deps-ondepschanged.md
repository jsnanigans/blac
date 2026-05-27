---
task: 04-core-deps-ondepschanged
phase: 1
parallel_safe: false
serial_group: core
model: opus
effort: high
depends_on:
  - 01-core-generics
files:
  - packages/blac-core/src/core/StateContainer.ts
  - packages/blac-core/src/core/symbols.ts
  - packages/blac-core/src/core/StateContainer.deps.test.ts  # (new)
---

# 04 — `deps` storage + per-owner merge + `onDepsChanged`

## Goal

Give each instance a live, **per-consumer-merged** `deps` object plus an **`onDepsChanged(next, prev)`** hook. The merge/reconcile logic lives in CORE (on the instance) so React and Preact just call it with their per-consumer owner id. Read path: `this.deps.x` (lazy, may be undefined).

This is the framework-agnostic engine; task 07 wires React to it.

## Approach

Build on task 01's `_deps` field + `deps` getter. Add per-owner attribution so multiple consumers can contribute disjoint slices and withdraw them independently.

1. **`core/symbols.ts`** — add an internal symbol for the merge entry points so they're not public API:
   ```ts
   export const APPLY_DEPS = Symbol('blac.applyDeps');
   export const REMOVE_DEPS_OWNER = Symbol('blac.removeDepsOwner');
   ```

2. **`StateContainer.ts`** — replace the task-01 `_deps` stub with owner-attributed storage:
   ```ts
   /** ownerId -> that owner's declared slice */
   private _depsByOwner: Map<string, Partial<Deps>> | null = null;
   /** merged view, recomputed on change */
   private _deps: Partial<Deps> = {};

   get deps(): Readonly<Deps> { return this._deps as Readonly<Deps>; }

   /** @internal — called by the framework adapter for one consumer (owner). Shallow-merges,
    *  reconciles that owner's slice (added/removed keys), fires onDepsChanged if the merged view changed. */
   [APPLY_DEPS](ownerId: string, slice: Partial<Deps>): void { /* see below */ }
   /** @internal — withdraw an owner's entire slice (consumer unmounted). */
   [REMOVE_DEPS_OWNER](ownerId: string): void { /* see below */ }

   /** Override to react when an injected handle appears/changes/disappears (post-merge). */
   protected onDepsChanged(_next: Readonly<Deps>, _prev: Readonly<Deps>): void {}
   ```

3. **Merge/reconcile semantics** (the four locked rules from design §9):
   - **Merge**: an owner's keys shallow-merge into the combined view.
   - **Per-owner diff**: store each owner's previous slice; on re-apply, keys that owner dropped are withdrawn; **other owners' keys untouched**.
   - **Collision dev-warn**: if applying a slice would overwrite a key currently owned by a *different* owner with a different value, `console.warn` (dev only) — "multiple owners writing dep `x`". Last write wins.
   - **Recompute + fire**: rebuild `_deps` from all owners; if the merged view changed (shallow compare), call `onDepsChanged(next, prev)`. A key going absent (last owner removed) is part of `next` as `undefined`.
   - On `dispose()` (`StateContainer.ts:135-160`): clear `_depsByOwner`/`_deps`; the final `onDepsChanged` with an empty `next` is OPTIONAL — prefer firing it so renderers can release handles, but guard against post-dispose emits. Document the choice.

4. **Idempotency**: applying the same owner+slice twice (StrictMode) must be a no-op (shallow compare slice vs stored). `onDepsChanged` must not fire when nothing changed.

### Subtleties
- Keep `get dependencies()` (the cross-bloc `_dependencies` map at `StateContainer.ts:56`) UNCHANGED — that's a different concept (bloc-to-bloc). `deps` is the new injected-handles object. Don't conflate.
- `onDepsChanged` receives readonly snapshots; the bloc should diff `next.x !== prev.x` to run setup/teardown (canvas init, controller bind).
- Expose the symbols via the package index ONLY if the adapter/react need them across the package boundary — they do (task 07 calls `[APPLY_DEPS]`). Export from `src/index.ts` under an `@internal`-marked block, OR via the existing adapter re-export surface. Prefer: export the symbols from core index so `@blac/react` can import them.

## Check (before editing)
```fish
grep -n "_deps\|get deps\|onDepsChanged\|_dependencies\|get dependencies" packages/blac-core/src/core/StateContainer.ts
grep -n "Symbol(" packages/blac-core/src/core/symbols.ts
```
Confirm task 01's `_deps`/`deps` stub exists but there is no `_depsByOwner`/`APPLY_DEPS`/`onDepsChanged` yet, and `get dependencies()` (cross-bloc) is separate. STOP if owner-merge already present.

## Implement
1. Add the two symbols.
2. Replace the `_deps` stub with owner-attributed storage + `deps` getter + `[APPLY_DEPS]`/`[REMOVE_DEPS_OWNER]` + `onDepsChanged`.
3. Wire dispose cleanup.
4. Export symbols from core index for cross-package use.

## Test
`packages/blac-core/src/core/StateContainer.deps.test.ts`:
```ts
import { APPLY_DEPS, REMOVE_DEPS_OWNER } from './symbols';

class R extends Cubit<{}, void, { a?: number; b?: number }> {
  state = {}; changes: Array<[any, any]> = [];
  protected onDepsChanged(next: any, prev: any) { this.changes.push([{ ...next }, { ...prev }]); }
}
it('merges disjoint slices from two owners', () => {
  const r = acquire(R, 'k', 'x'); // or construct via registry
  (r as any)[APPLY_DEPS]('o1', { a: 1 });
  (r as any)[APPLY_DEPS]('o2', { b: 2 });
  expect(r.deps).toEqual({ a: 1, b: 2 });
});
it('withdraws only the unmounting owner’s keys', () => {
  const r = acquire(R, 'k2', 'x');
  (r as any)[APPLY_DEPS]('o1', { a: 1 });
  (r as any)[APPLY_DEPS]('o2', { b: 2 });
  (r as any)[REMOVE_DEPS_OWNER]('o1');
  expect(r.deps).toEqual({ b: 2 });
});
it('fires onDepsChanged only on real change (idempotent re-apply)', () => {
  const r = acquire(R, 'k3', 'x');
  (r as any)[APPLY_DEPS]('o1', { a: 1 });
  (r as any)[APPLY_DEPS]('o1', { a: 1 }); // no-op
  expect(r.changes.length).toBe(1);
});
it('warns on cross-owner collision', () => {
  const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const r = acquire(R, 'k4', 'x');
  (r as any)[APPLY_DEPS]('o1', { a: 1 });
  (r as any)[APPLY_DEPS]('o2', { a: 9 });
  expect(spy).toHaveBeenCalled();
});
```

## Verify
```fish
pnpm --filter @blac/core typecheck
pnpm --filter @blac/core test -- StateContainer.deps
pnpm --filter @blac/core lint
```

## Commit
```
feat(core): per-owner deps merge with onDepsChanged lifecycle
```
Body: Instance-level `deps` object merged per consumer (owner id), lazily read, with `onDepsChanged(next, prev)`; cross-owner collision dev-warn; idempotent re-apply.

## Checklist
- [x] `APPLY_DEPS`/`REMOVE_DEPS_OWNER` symbols
- [x] owner-attributed `_depsByOwner` + merged `_deps` + `deps` getter
- [x] `onDepsChanged` fires only on real change; collision dev-warn
- [x] dispose clears deps; idempotent under StrictMode
- [x] symbols exported for cross-package use; tests pass; typecheck & lint clean
- [x] committed with Completion filled

## Completion
**Commit SHA:** _(this commit)_
**Files touched:** 4 —
- `packages/blac-core/src/core/symbols.ts` (added `APPLY_DEPS`, `REMOVE_DEPS_OWNER`)
- `packages/blac-core/src/core/StateContainer.ts` (replaced task-01 `_deps` stub with owner-attributed `_depsByOwner` + merged `_deps` + `[APPLY_DEPS]`/`[REMOVE_DEPS_OWNER]` + `reconcileDeps` + `onDepsChanged`; dispose clears deps and fires final empty merge; added `shallowEqualRecord` helper)
- `packages/blac-core/src/index.ts` (export `APPLY_DEPS`, `REMOVE_DEPS_OWNER`)
- `packages/blac-core/src/core/StateContainer.deps.test.ts` (new)

**Typecheck result:** `pnpm --filter @blac/core typecheck` — clean (tsc --noEmit, 0 errors).
**Test result:** `StateContainer.deps.test.ts` — 9/9 passing (disjoint merge; per-owner withdrawal; idempotent re-apply fires once; cross-owner collision dev-warn + last-write-wins; same-owner value change no warn; key→undefined on last-owner removal with onDepsChanged; unknown-owner remove no-op; owner dropping a key reconciles; dispose fires final empty onDepsChanged and rejects post-dispose applies). Full core suite: 594/594 passing.
**Lint note:** `pnpm --filter @blac/core lint` reports 1 warning + 2 errors, all pre-existing in untouched code (`StateContainer.ts` `emitSystemEvent` non-null assertion; `tracking/tracking-proxy.ts`). No findings in the new deps code; line numbers shifted only because code was added above.
