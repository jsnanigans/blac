# Plan: Teardown Batch 1 (registry self-prune, dep-sweep, proto-pollution)

## Decision
**Approach**: F1+F2 share one mechanism — the registry subscribes to its own
`disposed` lifecycle event (already emitted unconditionally by every
`dispose()` call, `StateContainer.ts:435`) and, for any disposing instance
that is itself found in the registry's own instance map, (a) prunes that Map
entry and (b) releases an internal per-entry "dependent" edge set that
`depend()` now registers. F3 special-cases the literal `"__proto__"` own-key
inside `deepMerge`'s existing write, via `Object.defineProperty` instead of
bracket assignment.
**Why**: Verified in code (not just the review) that `ensure()`-created deps
have `refs.size` permanently 0 today, so the diamond-dependency guard in the
existing sweep is a no-op — real fix needs a *count of live depend()-owners*,
not the public refcount (which several tests, e.g.
`StateContainerRegistry.refcount.test.ts:92-105` and
`StateContainer.depend.test.ts:255-263`, explicitly pin at 0/unchanged and
must not move). Gating the cascade on "is the disposing owner itself
registry-tracked" is what keeps `StateContainer.depend.test.ts:313-333`
("disposing owner does not affect dependency") passing unmodified — that test
uses `new OwnerBloc()` (never `acquire()`'d), so it correctly never triggers
the cascade; only `acquire()`-owned instances (including keepAlive ones torn
down via `clear()`/`forceDispose()`/direct `.dispose()` — the actual leak
scenario) do.
**Risk Level**: Medium (F1/F2 touch core lifecycle; F3 is Low).

## Alternatives rejected
- F1/F2 as two separate patches (filter-only `getAll`, ad-hoc sweep additions
  to `forceDispose`/`clear`/`clearAll`): rejected — three near-duplicate sweep
  call sites vs. one listener; harder to keep diamond-safe.
- F2 real refcounting for deps (make `depend()` add a public ref): rejected —
  breaks the deliberately-tested "no ref added" contract of `ensure()`/
  `depend()` (4+ passing tests assert `getRefCount` unchanged).
- F3 `Object.defineProperty` for every key: rejected — needless behavior
  delta from plain bracket assignment for the 99% non-`__proto__` case; only
  special-case the one dangerous key.

## Implementation Steps

**F1 — `StateContainerRegistry.ts`**
1. Add `dependents?: Set<StateContainer<any, any, any>>` to `InstanceEntry`
   (`:24-33`).
2. Add a constructor (none exists today) that calls
   `this.on('disposed', (c) => this._handleDisposed(c));`.
3. Add `private _handleDisposed(container)`: resolve
   `Type = container.constructor`; call `_pruneEntry(Type, container)`
   (scans `instancesByConstructor.get(Type)` entries for `entry.instance ===
   container`, deletes by key, returns whether found); if found, iterate
   `container.$blac.dependencies` and call `_releaseDependent(DepType,
   depKey, container)` for each.
4. Add `private _releaseDependent(Type, key, dependent)`: look up entry;
   `entry.dependents?.delete(dependent)`; if `(!entry.dependents ||
   size===0) && entry.refs.size===0 && !isKeepAliveClass(Type) &&
   !entry.instance.$blac.disposed` → `entry.instance.dispose()` (recurses
   into the same listener for dep-of-dep chains).
5. `getAll()` (`:535-544`): add `if (!entry.instance.$blac.disposed)` filter,
   matching `forEach` — defense in depth per review.
6. `acquire()` (`:282-369`): add `dependent?: StateContainer<any,any,any>`
   to the options type; in the reuse branch, after ref/warn logic, `if
   (options.dependent) (entry.dependents ??= new Set()).add(options.dependent)`;
   in the create branch, name the new entry object before `instances.set`
   and do the same add. Zero-cost when `dependent` is omitted (all existing
   callers).
7. `release()` (`:452-528`): delete the inline dep-sweep loop (`:513-526`) —
   now redundant, superseded by step 3-4 firing off `entry.instance.dispose()`
   at `:509`/`:466`.

**F2 — `StateContainer.ts`**
8. `depend()` (`:303-319`)'s `resolve` closure: replace
   `this._registry.ensure(Type, key, effectiveArgs)` with
   `this._registry.acquire(Type, key, { canCreate: true, countRef: false,
   args: effectiveArgs, dependent: this }) as InstanceType<T>`. No change to
   `_dependencies` bookkeeping, `DepHandle` shape, or the public `ensure()`
   API (`registry/ensure.ts` untouched — it's a separate public entry point).

**F3 — `container.ts`**
9. In `deepMerge`'s loop (`:442-452`), replace both `out[key] = nextVal` /
   `out[key] = merged` writes with a small helper: `if (key === '__proto__')
   Object.defineProperty(out, key, { value: v, writable: true, enumerable:
   true, configurable: true }); else out[key] = v;`. Add a one-line comment
   flagging that `plans/patch-emit-redundant-diff-clone.md`'s planned
   lazy-clone rewrite must carry this guard forward into its single-loop
   version.

## Tests
- `StateContainerRegistry.refcount.test.ts`: extend "instance disposed
  directly" test (`:116-122`) with `expect(hasInstance(RefCountBloc)).toBe(false)`
  immediately after `first.dispose()`, before the next `acquire()`.
- `StateContainerRegistry.lifecycle.test.ts`: new test — acquire 2 instances,
  directly `.dispose()` one, assert `globalRegistry.getAll(Type)` excludes it.
- `StateContainer.depend.test.ts`: new describe "dependency cleanup on owner
  disposal" — (a) `acquire()`'d owner + non-keepAlive dep: `owner.dispose()`
  → dep `hasInstance` false; (b) two `acquire()`'d owners sharing one
  non-keepAlive dep: dispose owner A → dep still alive; dispose owner B → dep
  disposed (diamond case); (c) `release(Owner, {forceDispose:true})` frees an
  orphaned dep; (d) `clear(OwnerType)` (not clearing the dep's type) frees the
  dep; (e) keepAlive dep survives its sole owner's disposal via all of the
  above paths. Do NOT modify the existing "disposing owner does not affect
  dependency" test (`:313-333`) — it's the standalone (`new`, never
  `acquire()`'d) case and must keep passing unchanged.
- `dirtytalk-structural/src/container.test.ts`: new cases — top-level
  `JSON.parse('{"__proto__":{"polluted":true}}')` patch does not alter
  `Object.getPrototypeOf(result)` or pollute `({}).polluted`; nested
  `{ user: { __proto__: {...} } }` patch, same assertions one level down;
  existing no-op-returns-same-reference tests still pass unmodified.

## Risks & Mitigations
**Main Risk**: `_pruneEntry`'s O(K) scan per dispose (K = live instances of
that constructor) is a new cost on every dispose path, and the dependents-Set
gate must not accidentally cascade for standalone (non-`acquire()`'d)
instances. **Mitigation**: K is bounded by realistic per-class instance
counts (not app-wide); gate is a single Map lookup (`instancesByConstructor.get(Type)`
returning `undefined` for anything never `acquire()`'d/`ensure()`'d), verified
against the one existing test that depends on the non-cascading case.
**Secondary**: recursive `dispose()` calls through the dep-of-dep chain —
guarded by `dispose()`'s existing `if (this._disposed) return` idempotency.

## Suggested Commit Breakdown
1. `fix(blac-core): self-prune registry on instance disposed event` (F1: steps
   1-7, + F1 tests).
2. `fix(blac-core): sweep depend() edges via dependent-set, not refcount`
   (F2: step 8, + F2 tests) — separate commit since F1 must land first (F2's
   sweep relies on F1's `_handleDisposed`/`_releaseDependent`).
3. `fix(dirtytalk-structural): guard deepMerge against __proto__ pollution`
   (F3: step 9 + tests + changeset for `@dirtytalk/structural`, patch bump).
4. Changeset for `@blac/core` covering commits 1-2 (patch bump — bug fixes,
   no public API surface change).

## Out of Scope
- R3 (PluginManager doesn't backfill existing instances), R5 (dead
  `generateId`/`globalCounters`) — separate findings, not requested here.
- Re-depend-with-different-args-for-same-Type overwrite quirk in
  `_dependencies` (pre-existing, already explicitly tested/accepted
  behavior) — not touched.
- `deepMerge`'s lazy-clone perf rewrite (`plans/patch-emit-redundant-diff-clone.md`)
  — not implemented here; only cross-referenced via a code comment so the
  `__proto__` guard survives that future rewrite.
