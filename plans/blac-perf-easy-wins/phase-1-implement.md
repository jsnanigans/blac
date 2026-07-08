# Phase 1 — Implement (4 disjoint clusters, parallel)

**Goal:** the 9 hot-path allocation wins land as behavior-preserving edits across
structural / engine / blac-core / blac-react, each with extended tests.

**Parallel:** all 4 clusters touch disjoint files → run concurrently. Within a
cluster, tasks are sequential (shared files).

**Owners:** quick-build. **Do not commit; do not run tests/typecheck/lint/build.**
Extend existing tests, don't rewrite. Test files import from `vite-plus/test`.

## Verify (phase entry — orchestrator)

- `rg -n 'sa.size === 0|sb.size === 0' packages/dirtytalk-structural/src/path-set.ts` → no hit (PN1 not done).
- `rg -n '\.some\(\(a\)' packages/dirtytalk-structural/src/container.ts` → hit at ~:380 (PN2 not done).
- `rg -n 'errors: unknown\[\] = \[\]' packages/dirtytalk-engine/src/dirty-channel.ts` → hit at :106 (PN3a not done).
- `rg -n 'buildContext' packages/blac-core/src/plugin/PluginManager.ts` → calls inside the plugin loops (:315, :344) (BC1 not done).

---

## Cluster A — structural (quick-build, **opus/high**)

Files: `packages/dirtytalk-structural/src/{path-set,container,tracker}.ts` +
`{path-set,container,tracker}.test.ts`. Tasks sequential.

| # | Task | Done-check |
|---|------|-----------|
| A1 · **PN1** | In `pathSetUnion` (`path-set.ts:12-17`), after the `ALL_PATHS` guard add empty-operand fast-paths **before** copying: `const sa = a as Set<PathId>; const sb = b as Set<PathId>; if (sa.size === 0) return sb; if (sb.size === 0) return sa;` then the existing copy loop over the non-empty operands. **First confirm alias-safety**: read `container.ts` `emit`/`patch` and `dirty-channel.ts` `mark`/`#flush` — the Set handed to `mark` must never be retained/mutated by its producer after the call, and `#accumulated` must be replace-not-mutate (it is: reset to `empty()` each flush). If any caller mutates a retained union input, do NOT apply the fast-path for that operand — flag it. | `pathSetUnion(empty, r) === r` and `pathSetUnion(a, empty) === a` (reference-identity); non-empty∪non-empty unchanged; all existing `path-set.test.ts` + `container`/`dirty-channel` emit/patch tests still assert identical dirty sets. |
| A2 · **PN2** | In `_refineAncestorMarks` (`container.ts:339-390`): (1) replace the per-leaf `this.interner.ancestorIds(skelId).some((a) => targetIds.has(a))` (`:378-380`) with a plain inner `for` loop over the returned array (`let descends=false; for (let i=0;i<ancestors.length;i++){ if(targetIds.has(ancestors[i])){descends=true;break;} }`) — no closure per leaf. (2) Fold the two `roughSet` passes (`:349-354` targetIds + `:370-372` non-ancestor copy) into ONE pass that builds `targetIds` and collects non-ancestor ids into a local `PathId[]`; keep the existing fast-exits (`targetIds.size===0`, skeleton ALL_PATHS/empty) returning `rough` as-is; only after the fast-exits, seed `result` from the collected non-ancestor ids. | Byte-identical marks to before on every existing `_refineAncestorMarks`/`patch` test (array-replace, class-instance-replace, mixed plain+atomic); zero closures allocated inside the skeleton loop; `roughSet` iterated once. |
| A3 · **PN6** | Memoize `_equalsFn` (`container.ts:270-278`) as a lazily-built field. Add `private _equalsFnCached?: (id:PathId,a:unknown,b:unknown)=>boolean;`. `_equalsFn()`: if `_equalsByPathId.size === 0` return `undefined` (unchanged fast path); else `return (this._equalsFnCached ??= (id,a,b)=>{ const eq=this._equalsByPathId.get(id); return eq?eq(a,b):Object.is(a,b); });`. The closure reads `_equalsByPathId` live, so content changes still apply. | Same equality results as before with/without custom equality; only one closure allocated across many emit/patch calls when equality configured; `undefined` still returned when none configured. |
| A4 · **PN10** | `patch` emptiness test (`container.ts:215`): replace `Object.keys(partial as object).length === 0` with an allocation-free early-out, e.g. `let _empty = true; for (const _k in (partial as object)) { _empty = false; break; } if (_empty) return;`. | Identical behavior: empty partial → early return (no state change/mark); non-empty → proceeds. |
| A5 · **PN5** | In `wrap` (`tracker.ts:137`), after `const isArray = ...`, add a lazy prefix-id memo: `let _prefixId: PathId \| undefined; const prefixId = (): PathId => (_prefixId ??= interner.intern(prefix));`. Use `prefixId()` at the two intern-of-`prefix` sites: `pinArrayPath` (`:152` — replace `const id = interner.intern(prefix)` with `const id = prefixId()`) and the own-property parent-drop (`:228` — replace `const parentId = interner.intern(prefix)` with `const parentId = prefixId()`). **Do NOT** compute it at `wrap()` entry (must stay lazy — `pinArrayPath` already guards `prefix===''` at :151, and the parent-drop is guarded by `prefix!==''` at :227, so `prefixId()` is only ever called when `prefix!==''`). Leave `childPath`/leaf interns (`:226`, `:290`) untouched. | `interner.size` unchanged on every existing `tracker.test.ts` fixture (interning still lazy, same timing); recorded paths identical; `prefix` interned at most once per proxy after first trap use. |
| A6 · **Tests** | Extend `path-set.test.ts` (PN1: `union(empty,r)===r`, `union(a,empty)===a`, both-non-empty still unions), `container.test.ts` (PN2: refine marks identical for array-replace + mixed patches — reuse existing fixtures; PN6: custom-equality path still filters; PN10: empty-partial no-op), `tracker.test.ts` (PN5: `.size` stable + identical recorded paths on a nested-read + array-iteration fixture). | New cases exist for PN1/PN2/PN5/PN6/PN10; import from `vite-plus/test`. |

Permitted files: the three src files + their tests only. Do NOT touch
`path-interner.ts`, `diff.ts`, `index.ts`.

---

## Cluster B — engine (quick-build, sonnet/high)

Files: `packages/dirtytalk-engine/src/dirty-channel.ts` + `dirty-channel.test.ts`.

| # | Task | Done-check |
|---|------|-----------|
| B1 · **PN3a** | `#flush` (`dirty-channel.ts:87-159`): change `const errors: unknown[] = []` (`:106`) to `let errors: unknown[] \| undefined;`. In both catch blocks that push (`:123`, `:136`) use `(errors ??= []).push(err)`. Update the tail (`:153-158`) to guard on definedness: `if (errors) { if (errors.length === 1) throw errors[0]; throw new AggregateError(errors, 'DirtyChannel: subscriber errors during flush'); }` (length is ≥1 whenever `errors` is defined). | Zero-error flush allocates no array; single error still throws the bare error; ≥2 still throws `AggregateError` with the same message; all existing error/AggregateError tests pass unchanged. |
| B2 · **Tests** | Extend `dirty-channel.test.ts` only if a case is missing: a no-error flush path exists (existing suite likely covers throw behavior — do not weaken it). Add a case asserting a clean single-subscriber flush still fires the callback and throws nothing. | New/covered no-error case; import from `vite-plus/test`. |

Permitted files: `dirty-channel.ts`, `dirty-channel.test.ts` only. Do NOT touch
`scheduler.ts`, `space.ts`, `primitives.ts`, `index.ts`.

---

## Cluster C — blac-core (quick-build, sonnet/high)

Files: `packages/blac-core/src/plugin/PluginManager.ts` + its test
(`rg -l 'PluginManager' packages/blac-core/src/**/*.test.ts` to locate).

| # | Task | Done-check |
|---|------|-----------|
| C1 · **BC1** | In `dispatchStateChange` (`PluginManager.ts:308-322`) and `notifyPlugins` (`:332-352`): build the `PluginContext` **at most once per dispatch**, lazily, instead of per plugin. Pattern: declare `let ctx: PluginContext \| undefined;` before the loop; inside, right before the `hook.call(...)`, use `ctx ??= this.buildContext(container)` (dispatch) / `ctx ??= this.buildContext(instance)` (notify) and pass `ctx`. This yields **zero** builds when no enabled plugin has the hook, and exactly one otherwise. Update the `buildContext` docstring (`:354-361`) to say once-per-dispatch (it already claims this). | Context built ≤1× per dispatch; 0× when no enabled plugin implements the hook; identical context contents/behavior; existing PluginManager tests pass. |
| C2 · **Tests** | Extend the PluginManager test: with 2+ enabled plugins implementing `onStateChange`, a single state change builds the context once (spy/wrap `buildContext` or assert via a context-identity check that both plugins receive the same `ctx` object); a dispatch with no matching hook builds zero. | New case proves ≤1 build per dispatch; import from `vite-plus/test`. |

Permitted files: `PluginManager.ts` + its test only. Do NOT touch
`StateContainer.ts` or other core files.

---

## Cluster D — blac-react (quick-build, sonnet/high)

Files: `packages/blac-react/src/useBloc.ts` + its test.

| # | Task | Done-check |
|---|------|-----------|
| D1 · **BR3** | Args-key fast-path (`useBloc.ts:130-141`). For `ownArgs` and `providerArgs` each: cache the last `{ref, key}` in a `useRef`, and recompute `JSON.stringify` only when `!Object.is(current, cachedRef)`. `ownArgsRef` already exists — add a parallel key cache (e.g. `ownArgsKeyRef = useRef<{ref:unknown; key:string\|undefined}>(...)`), update it when the ref changes, else reuse `.key`. `undefined` args still collapse to `undefined` key. | Same key value `JSON.stringify` would produce for identical/changed args; no `JSON.stringify` call when the args object is reference-stable across renders; void-args still `undefined`. |
| D2 · **BR2** | Guarded short-circuit for the dep-reconcile layout effect (`useBloc.ts:485-554`). Add a per-commit signature the effect compares against last commit's, stored in a `useRef`. Short-circuit (return early, skipping the primary re-`registerConsumerPaths`+`expandWithAncestors` at `:488-496` AND the dep pass 1/2 at `:509-553`) **only when ALL of**: `selectRef.current === undefined` path is on the same branch as before, the primary `pathRef.current` is set-equal (`pathSetEquals`) to last commit's, AND the session map (`sessionRef.current`) has the identical dep set with set-equal paths per dep and unchanged `key`/`refId`/`args` per dep. If anything differs or is uncertain → run the full reconcile (current behavior). Do not change the drop/add/refresh logic itself — only gate the whole block. Capture the new signature at the end of a full run. | For a render where deps + paths are identical to last commit, the effect body performs no `registerConsumerPaths`/`subscribe`/`unregister`/`expandWithAncestors` work; for ANY change (dep add, drop, changed paths, changed args, primary path change, first commit) the full reconcile runs exactly as today; no subscription is ever dropped or left stale. |
| D3 · **Tests** | Extend the useBloc test: BR3 — stable args object across re-renders stringifies once (spy or key-identity); changed args recompute. BR2 — a re-render with identical deps/paths does not re-`registerConsumerPaths` (spy on a dep container), while adding/dropping a dep or changing tracked paths still reconciles correctly (dep subscribed/unsubscribed). | New BR3 + BR2 cases; BR2 case covers both the skip path and the add/drop/change path; import from `vite-plus/test`. |

Permitted files: `useBloc.ts` + its test only. Do NOT touch `react-hook.ts`,
`BlocProvider`, `types.ts`.

## Sanity check (phase exit — orchestrator, best-effort)

- `git diff --stat` limited to the permitted files across all 4 clusters.
- `rg -n 'sa.size === 0' path-set.ts` present; `rg -n '\.some\(\(a\)' container.ts` gone from `_refineAncestorMarks`.
- `rg -n 'errors: unknown\[\] = \[\]' dirty-channel.ts` gone; `let errors: unknown[] | undefined` present.
- BC1: `buildContext` no longer called inside the plugin loop unconditionally (guarded by `??=`).
- BR2: a signature `useRef` + early-return guard present; drop/add/refresh logic unchanged.
- Confirm no cross-cluster file bleed (each cluster stayed in its files).

## Done-check

- [ ] PN1/PN2/PN5/PN6/PN10 applied; behavior-preserving; A-tests added.
- [ ] PN3a applied; error-throw semantics unchanged; B-test added.
- [ ] BC1 builds context ≤1×/dispatch; C-test added.
- [ ] BR3 fast-path + BR2 guarded short-circuit applied; D-tests added.
