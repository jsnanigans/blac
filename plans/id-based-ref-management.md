# Plan: Replace count-based ref management with id-based (named) refs

## Decision

**Approach**: Replace `refCount: number` with `refs: Set<string>` on `InstanceEntry`, thread an optional `refId` parameter through the public `acquire()`/`release()` functions (all layers), and auto-generate IDs for callers that omit it.
**Why**: Makes double-release idempotent, enables "who holds this?" debugging, and lays groundwork for unifying with DevTools consumer tracking.
**Risk Level**: Medium -- this touches an exported type (`InstanceEntry`) and changes the semantics of every acquire/release call site.

## Design Decisions

**Q: Should `refId` be on the public `acquire()`/`release()` or only on the registry methods?**
A: Both. Thread it all the way through. The public functions in `registry/acquire.ts` and `registry/release.ts` are thin wrappers; adding an optional `refId` param keeps the API consistent. The adapter re-exports from `@blac/core`, so it gets it for free.

**Q: How to handle callers that don't pass refId?**
A: Auto-generate an incrementing ID (`_auto_<counter>`) inside `StateContainerRegistry.acquire()`. The acquire method returns the generated ID is not necessary -- callers that don't track the ID simply won't be able to do targeted release. For release without refId: remove one arbitrary ref from the set (preserving backward compat with existing test code that calls `release(Bloc)` without an ID).

**Q: Should we add `getRefIds()`?**
A: Yes, add it on the registry class and as a public query function. Useful for debugging and will be the bridge to DevTools unification later.

**Q: Auto-ID format?**
A: `_auto_<number>` using a module-level counter in `StateContainerRegistry.ts`. Simple, deterministic, zero-dependency.

## Implementation Steps

### Step 1 -- Change `InstanceEntry` type

Modify `packages/blac-core/src/core/StateContainerRegistry.ts:14-19`:

```
interface InstanceEntry<T = any> {
  instance: T;
  refs: Set<string>;
}
```

Add a module-level counter: `let autoRefIdCounter = 0;`

### Step 2 -- Update `StateContainerRegistry.acquire()`

File: `packages/blac-core/src/core/StateContainerRegistry.ts:129-175`

- Add optional `refId?: string` to the options object.
- When `countRef` is true and no `refId` given, generate `_auto_${autoRefIdCounter++}`.
- Line 153: Replace `entry.refCount++` with `entry.refs.add(refId)`.
- Line 169: Replace `{ instance, refCount: 1 }` with `{ instance, refs: new Set([refId]) }`.
- When `countRef` is false, skip adding any ref (existing behavior for `borrow`/`ensure`).
- Return the instance as before (the refId does not need to be returned from acquire).

### Step 3 -- Update `StateContainerRegistry.release()`

File: `packages/blac-core/src/core/StateContainerRegistry.ts:244-276`

- Add optional `refId?: string` parameter.
- If `refId` provided: `entry.refs.delete(refId)` (no-op if not present = idempotent).
- If `refId` not provided: delete one arbitrary ref via `const first = entry.refs.values().next().value; if (first) entry.refs.delete(first);`.
- Line 270: Replace `entry.refCount <= 0` with `entry.refs.size === 0`.

### Step 4 -- Update `StateContainerRegistry.getRefCount()`

File: `packages/blac-core/src/core/StateContainerRegistry.ts:342-349`

- Replace `return entry?.refCount ?? 0` with `return entry?.refs.size ?? 0`.

### Step 5 -- Add `getRefIds()` to `StateContainerRegistry`

Add new method after `getRefCount`:

```
getRefIds(Type, instanceKey): ReadonlySet<string> {
  return entry?.refs ?? new Set();
}
```

### Step 6 -- Thread `refId` through public API wrappers

**`packages/blac-core/src/registry/acquire.ts`**: Add optional `refId?: string` as third parameter. Pass to `getRegistry().acquire(BlocClass, instanceKey, { canCreate: true, countRef: true, refId })`.

**`packages/blac-core/src/registry/release.ts`**: Add optional `refId?: string` as fourth parameter (after `forceDispose`). Pass to `getRegistry().release(BlocClass, instanceKey, forceDispose, refId)`.

**`packages/blac-core/src/registry/queries.ts`**: Add `getRefIds()` function that delegates to `getRegistry().getRefIds(...)`.

**`packages/blac-core/src/registry/index.ts`**: Export `getRefIds` from queries.

### Step 7 -- Update `@blac/adapter` re-exports

File: `packages/blac-adapter/src/index.ts:47` -- no code change needed, the re-export `{ acquire, release } from '@blac/core'` picks up the new signatures automatically since the new params are optional.

### Step 8 -- Update exports

**`packages/blac-core/src/index.ts`**: Add `getRefIds` to the registry export block.
**`packages/blac-core/src/debug.ts`**: Add `getRefIds` to the queries export.

### Step 9 -- React hook: pass consumer ID as refId

File: `packages/blac-react/src/useBloc.ts`

- Line 140: Change `acquire(BlocClass, instanceKey)` to `acquire(BlocClass, instanceKey, consumerIdRef.current)`.
- Line 242: Change `release(BlocClass, instanceKey)` to `release(BlocClass, instanceKey, false, consumerIdRef.current)`.

### Step 10 -- Preact hook: add consumer ID generation and pass as refId

File: `packages/blac-preact/src/useBloc.ts`

- Add module-level `let nextConsumerId = 0;` and a `useRef` pattern matching the React hook.
- Line 106: `acquire(BlocClass, instanceKey, consumerIdRef.current)`.
- Line 184: `release(BlocClass, instanceKey, false, consumerIdRef.current)`.

### Step 11 -- Update `testing.ts`

File: `packages/blac-core/src/testing.ts:80`

- Change `{ instance, refCount: 1 }` to `{ instance, refs: new Set(['test-override']) }`.

### Step 12 -- Update tests

All test files that assert on `getRefCount()` values should still pass since `getRefCount()` now returns `refs.size` which produces identical numeric results. Tests that directly construct `InstanceEntry` objects (only `testing.ts:80`, already handled in Step 11) need updating.

Test files referencing `refCount` in test file names (`StateContainerRegistry.refcount.test.ts`) keep their names but the tests inside should still pass as-is because they go through `getRefCount()`.

Add new test cases:

- `StateContainerRegistry.refcount.test.ts`: Test idempotent release (double-release is no-op), test `getRefIds()` returns correct set, test named acquire/release with specific refIds.

## Files to Change

- `packages/blac-core/src/core/StateContainerRegistry.ts` -- `InstanceEntry` type, `acquire()`, `release()`, `getRefCount()`, new `getRefIds()`
- `packages/blac-core/src/registry/acquire.ts` -- add `refId` param
- `packages/blac-core/src/registry/release.ts` -- add `refId` param
- `packages/blac-core/src/registry/queries.ts` -- add `getRefIds()`
- `packages/blac-core/src/registry/index.ts` -- export `getRefIds`
- `packages/blac-core/src/index.ts` -- export `getRefIds`
- `packages/blac-core/src/debug.ts` -- export `getRefIds`
- `packages/blac-core/src/testing.ts:80` -- `refs: new Set(...)` instead of `refCount: 1`
- `packages/blac-react/src/useBloc.ts:140,242` -- pass `consumerIdRef.current` as refId
- `packages/blac-preact/src/useBloc.ts:106,184` -- add consumer ID, pass as refId
- `packages/blac-core/src/core/StateContainerRegistry.refcount.test.ts` -- add idempotent release + getRefIds tests

## Acceptance Criteria

- [ ] `InstanceEntry.refs` is `Set<string>`, no `refCount` property exists
- [ ] `acquire()` with no refId auto-generates one; with refId uses it
- [ ] `release()` with matching refId removes it; double-release is a no-op (does not go negative)
- [ ] `release()` with no refId removes one arbitrary ref (backward compat)
- [ ] `getRefCount()` returns `refs.size` (all existing numeric assertions pass unchanged)
- [ ] `getRefIds()` returns the set of current ref holders
- [ ] React `useBloc` passes its consumer ID as refId to acquire/release
- [ ] Preact `useBloc` generates and passes consumer ID as refId to acquire/release
- [ ] `registerOverride` in testing.ts uses `refs: new Set(['test-override'])`
- [ ] All existing tests pass without modification (except `testing.ts` InstanceEntry literal)
- [ ] New tests cover: idempotent release, named refs, getRefIds query

## Risks & Mitigations

**Main Risk**: Breaking external consumers that read `InstanceEntry.refCount` directly.
**Mitigation**: `InstanceEntry` is a public type but unlikely to be read directly outside the library itself. `getRefCount()` remains the stable API. Add a note in the changelog about the breaking type change.

**Risk**: Callers that do `release()` without refId after `acquire()` with auto-generated refId -- the "remove arbitrary ref" behavior means the first ref in the set gets removed, which may not correspond to the correct caller.
**Mitigation**: This only affects callers that mix explicit and implicit refId usage. All internal callers (hooks) will use explicit IDs. External callers that don't track IDs get the same behavior as today (one ref in, one ref out). Document that explicit refIds are recommended.

**Risk**: Preact hook consumer ID counter is separate from React hook counter, so IDs could collide if both are loaded.
**Mitigation**: Prefix Preact IDs with `preact-` and React IDs with `react-` (or just rely on the fact that you never run both in the same app).

## Out of Scope

- Unifying DevTools consumer registration with registry refs (future follow-up -- the refIds enable it, but the actual replacement of `window.__BLAC_DEVTOOLS__.registerConsumer` is a separate task)
- Adding component name metadata to the ref set (refs are strings only; metadata stays in DevTools)
- Migration of example apps or devtools panel to use explicit refIds (they can rely on auto-generation)
