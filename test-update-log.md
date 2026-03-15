# BlaC Test Implementation Log

## Plan (2026-03-15)

177 new scenarios across 22 new test files. Reference TempDoc: `blac/2026-03/15/test-plan.md`.

---

## Universal Conventions

- **Test runner:** `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'`
- **React tests:** `import { render, act, renderHook, waitFor } from '@testing-library/react'`
- **Registry reset:** every file touching the registry needs `beforeEach(() => clearAll())` + `afterEach(() => clearAll())`
- **Bloc naming:** define minimal test blocs at top of file; inline inside `it()` only when used once
- **Patterns:** mirror `withX` / `fixture` factory pattern from `StateContainerRegistry.lifecycle.test.ts`

---

## Batch Order

### Batch 1 — Pure core, no registry (establishes patterns)
- [x] `src/core/Cubit.edge-cases.test.ts` — 9 scenarios
- [x] `src/decorators/blac-decorator.edge-cases.test.ts` — 5 scenarios
- [x] `src/__tests__/config.test.tsx` (react) — 5 scenarios

### Batch 2 — StateContainer internals
- [x] `src/core/StateContainer.disposal.test.ts` — 8 scenarios
- [x] `src/core/StateContainer.subscriptions.test.ts` — 10 scenarios
- [x] `src/core/StateContainer.hydration-edge-cases.test.ts` — 9 scenarios

### Batch 3 — Registry mechanics
- [x] `src/core/StateContainerRegistry.refcount.test.ts` — 15 scenarios
- [x] `src/core/StateContainerRegistry.events.test.ts` — 6 scenarios
- [x] `src/core/StateContainer.depend-edge-cases.test.ts` — 7 scenarios

### Batch 4 — Tracking and watch
- [x] `src/tracking/tracking.edge-cases.test.ts` — 11 scenarios
- [x] `src/watch/watch.edge-cases.test.ts` — 12 scenarios

### Batch 5 — Plugin system
- [x] `src/plugin/PluginManager.edge-cases.test.ts` — 10 scenarios

### Batch 6 — Adapter layer
- [x] `src/__tests__/adapter.edge-cases.test.ts` (adapter) — 7 scenarios

### Batch 7 — React: instance management
- [x] `useBloc.shared-instances.test.tsx` — 6 scenarios
- [x] `useBloc.instance-isolation.test.tsx` — 6 scenarios
- [x] `useBloc.lifecycle-edge-cases.test.tsx` — 9 scenarios

### Batch 8 — React: tracking optimizations
- [x] `useBloc.auto-track-optimization.test.tsx` — 10 scenarios
- [x] `useBloc.manual-deps-edge-cases.test.tsx` — 7 scenarios
- [x] `useBloc.getter-advanced.test.tsx` — 8 scenarios

### Batch 9 — React: cross-bloc, SSR, stress
- [x] `useBloc.ssr.test.tsx` — 4 scenarios
- [x] `useBloc.cross-bloc-react.test.tsx` — 6 scenarios
- [x] `useBloc.stress.test.tsx` — 5 scenarios

---

## File Details

### `src/core/Cubit.edge-cases.test.ts` (9 scenarios)
**Imports:** `Cubit` from `./Cubit`, `clearAll` from `../registry`
**Helper:**
```ts
class CountCubit extends Cubit<{ count: number; label: string }> {
  constructor() { super({ count: 0, label: '' }); }
}
```
**Scenarios:**
1. `patch()` merges partial state, leaves other fields unchanged
2. `patch()` on disposed cubit throws
3. `update()` returning same reference does NOT notify listeners
4. `emit()` with same reference does NOT notify listeners
5. `emit()` with different reference but equal value DOES notify (reference check, not deep equal)
6. Sequential emits — state is always the last emitted value
7. Initial state accessible synchronously after construction
8. `patch()` with nested objects is shallow merge only
9. Complex nested state updates correctly via `patch()` — sibling keys preserved

**Key gotcha:** `update(s => s)` produces `newState === this._state` → `applyState` short-circuits before `stateChanged` fires.

---

### `src/decorators/blac-decorator.edge-cases.test.ts` (5 scenarios)
**Imports:** `blac` from `./blac`, `Cubit`, `isKeepAliveClass`/`isExcludedFromDevTools` from `../utils/static-props`, `acquire`/`release`/`clearAll`
**Scenarios:**
1. `@blac({ keepAlive: true })` — instance survives `release` to refCount 0 (not disposed)
2. `@blac({ excludeFromDevTools: true })` — static `__excludeFromDevTools === true`
3. Decorated class preserves `.name` property
4. Non-decorated class: `isKeepAliveClass === false`
5. `@blac({})` — no options, no side effects

---

### `config.test.tsx` — `@blac/react` (5 scenarios)
**Imports:** `configureBlacReact`, `getBlacReactConfig`, `resetBlacReactConfig` from `../config`
**afterEach:** `resetBlacReactConfig()`
**Scenarios:**
1. Default config has `autoTrack: true`
2. `configureBlacReact({ autoTrack: false })` updates global config
3. Partial merge — unspecified keys retain defaults
4. `resetBlacReactConfig()` restores all keys
5. Multiple sequential calls are additive, last wins per key

---

### `src/core/StateContainer.disposal.test.ts` (8 scenarios)
**Imports:** `StateContainer`, `acquire`/`release`/`clearAll`
**Helper:** `class DisposableContainer extends StateContainer<{ v: number }>`
**Scenarios:**
1. `dispose()` sets `isDisposed` to true
2. `dispose()` is idempotent (second call is no-op)
3. `emit()` throws on disposed container
4. `update()` throws on disposed container
5. `dispose()` fires `'dispose'` system event exactly once
6. `dispose()` during `hydrating` transitions `hydrationStatus` to `'error'`
7. `release()` to zero refCount auto-disposes
8. `release(Type, key, true)` force-disposes regardless of refCount

**Key gotcha:** #6 requires chaining `beginHydration()` → `dispose()` and verifying both `isDisposed` and `hydrationStatus === 'error'`.

---

### `src/core/StateContainer.subscriptions.test.ts` (10 scenarios)
**Imports:** `StateContainer`, `clearAll`
**Helper:** `class SimpleContainer extends StateContainer<{ n: number }>`
**Scenarios:**
1. `subscribe()` returns an unsubscribe function
2. Listener receives updated state on emit
3. Multiple listeners all receive state update
4. Removing one listener does not affect others
5. `subscribe()` on disposed container throws
6. Listener errors are caught and logged — other subscribers still called (`vi.spyOn(console, 'error')`)
7. Unsubscribing during emission is safe (listener calls its own unsubscribe)
8. Adding listener inside another listener — new listener called from next emit, not current
9. Same listener function added twice — only stored once (Set semantics)
10. All listeners cleared on dispose

**Key gotcha:** #7 and #8 — `Array.from(listeners)` snapshot before iteration means mid-loop mutations don't affect current pass. Tests must verify this exact invariant.

---

### `src/core/StateContainer.hydration-edge-cases.test.ts` (9 scenarios)
**Helper:** `class HydratableContainer extends StateContainer<{ v: number }>`
**Scenarios:**
1. `waitForHydration()` resolves immediately when status is `'idle'`
2. `waitForHydration()` resolves immediately when status is `'hydrated'`
3. `waitForHydration()` rejects immediately when status is `'error'`
4. `waitForHydration()` resolves after `finishHydration()` called
5. `waitForHydration()` rejects after `failHydration()` called
6. `applyHydratedState()` returns false when not in `'hydrating'` status
7. `applyHydratedState()` returns false when `changedWhileHydrating` is true
8. `beginHydration()` resets `changedWhileHydrating` to false on each new cycle
9. `finishHydration()` after `'error'` status re-creates hydration promise

**Key gotcha:** #8 — `beginHydration()` always resets `_changedWhileHydrating = false` at the top. #9 — `ensureHydrationPromise()` re-creation when `hydrationPromiseSettled` is true.

---

### `src/core/StateContainerRegistry.refcount.test.ts` (15 scenarios)
**Imports:** `acquire`, `release`, `borrow`, `borrowSafe`, `ensure`, `hasInstance`, `getRefCount`, `clearAll`
**Helpers:**
```ts
class RefCountBloc extends StateContainer<{ n: number }> { constructor() { super({ n: 0 }); } }
class KeepAliveBloc extends StateContainer<{ n: number }> {
  static keepAlive = true;
  constructor() { super({ n: 0 }); }
}
```
**Scenarios:**
1. `acquire()` creates instance with refCount = 1
2. `acquire()` twice on same key → refCount = 2
3. `release()` from 2→1 does not dispose
4. `release()` from 1→0 disposes and removes from registry
5. `release()` on nonexistent key is a no-op
6. `keepAlive` class: refCount 0 does NOT dispose
7. `borrow()` does NOT increment refCount
8. `borrow()` throws when instance does not exist
9. `borrowSafe()` returns error when instance does not exist
10. `borrowSafe()` returns instance when it exists
11. `ensure()` creates instance with refCount = 0 (no increment)
12. `ensure()` on pre-existing instance does NOT increment refCount
13. `release(Type, key, true)` force-disposes at refCount 2
14. Instance disposed directly → next `acquire()` returns fresh instance
15. `acquire()` with custom instanceKey tracks separately from `'default'`

**Key gotcha:** #11 — `ensure` passes `countRef: false`; verify `getRefCount() === 0` after ensure-only call.

---

### `src/core/StateContainerRegistry.events.test.ts` (6 scenarios)
**Imports:** `globalRegistry` from `./StateContainerRegistry`, `acquire`/`release`/`clearAll`
**Scenarios:**
1. `on()` returns unsubscribe — listener not called after unsubscribe
2. Multiple listeners on same event all called
3. Listener error is caught and logged — others continue
4. `stateChanged` event receives `(instance, previousState, newState, stackTrace)`
5. No listeners = no throw on emit
6. `clearAll()` fires `'disposed'` event for every cleared instance

---

### `src/core/StateContainer.depend-edge-cases.test.ts` (7 scenarios)
**Helpers:**
```ts
class DepTarget extends Cubit<{ val: number }> { constructor() { super({ val: 0 }); } }
class DepOwner extends Cubit<{ x: number }> {
  getTarget = this.depend(DepTarget);
  constructor() { super({ x: 0 }); }
}
```
**Scenarios:**
1. `depend()` returns a getter function, not an instance
2. Calling the getter creates the dependency in registry via `ensure`
3. Calling getter multiple times returns same instance, refCount stays 0
4. `depend()` with no instanceKey uses `'default'` key
5. `depend()` with specific instanceKey targets correct instance
6. Two `depend()` calls for different keys both callable
7. `depend()` for already-acquired instance returns that instance without incrementing refCount

---

### `src/tracking/tracking.edge-cases.test.ts` (11 scenarios)
**Imports:** `tracked`, `createTrackedContext`, `TrackedContext` from `./tracked`; `Cubit`, `acquire`, `clearAll`
**Scenarios:**
1. `tracked()` returns result + dependencies set
2. `tracked()` discovers dependencies when bloc getter accesses state
3. `tracked()` with exclude option removes instance from deps
4. `TrackedContext.proxy()` returns proxied instance
5. `TrackedContext.start()` / `stop()` collects dependencies
6. `TrackedContext.changed()` returns false when no state change
7. `TrackedContext.changed()` returns true after state mutation on tracked path
8. `TrackedContext.reset()` clears all internal state
9. `TrackedContext.getPrimaryBlocs()` returns all proxied blocs
10. `DependencyManager.sync()` subscribes to new deps, unsubscribes stale ones
11. `DependencyManager.cleanup()` clears all subscriptions

**Key gotcha:** #6 and #7 — two-step pattern: `proxy.start()` → access `proxy.proxy(bloc).state.a` → `proxy.stop()` → emit new state on real bloc → verify `changed()` === true.

---

### `src/watch/watch.edge-cases.test.ts` (12 scenarios)
**Imports:** `watch`, `instance` from `./watch`; `Cubit`, `acquire`/`release`/`clearAll`
**Helpers:**
```ts
class CounterCubit extends Cubit<{ count: number }> { ... }
class NameCubit extends Cubit<{ name: string }> { ... }
```
**Scenarios:**
1. Watch single bloc — callback receives correct state
2. `watch.STOP` on first call stops future calls
3. `watch.STOP` in multi-bloc watch stops all subscriptions
4. Dispose returned from `watch()` is idempotent
5. Same-value emit does NOT trigger callback
6. `instance(BlocClass, id)` targets specific instance
7. Watch on disposed bloc causes no crash
8. Multi-bloc watch fires once per change
9. Rapid emits trigger one call per emit (no coalescing)
10. Watch callback accessing getter re-runs on getter dependency change
11. Unwatch stops all callbacks
12. `clearAll()` between watch registration and first change does not crash

---

### `src/plugin/PluginManager.edge-cases.test.ts` (10 scenarios)
**Imports:** `PluginManager`, `createPluginManager`; `globalRegistry`, `StateContainerRegistry`; `Cubit`; `acquire`/`release`/`clearAll`; `BlacPlugin` type
**Setup:**
```ts
let manager: PluginManager;
beforeEach(() => { globalRegistry.clearAll(); manager = new PluginManager(globalRegistry); });
afterEach(() => { manager.clear(); globalRegistry.clearAll(); });
```
**Scenarios:**
1. Plugin with no hooks installs without error
2. Multiple plugins all receive `onStateChanged`
3. Plugin with `enabled: false` never receives any hooks
4. Plugin context `queryInstances()` returns empty for unregistered type
5. Plugin context `getStats()` reflects dynamic changes
6. `createPluginManager()` creates fresh PluginManager
7. Isolated registry: plugin on registryA does NOT receive events from registryB
8. Plugin installed after instance creation does NOT receive retroactive `onInstanceCreated`
9. `clear()` with no plugins is a no-op
10. Plugin `onInstanceDisposed` called when instance is released

**Key gotcha:** #7 — create two separate `StateContainerRegistry` instances and one manager per registry; emit on registryA, verify registryB's plugin receives nothing.

---

### `adapter.edge-cases.test.ts` — `@blac/adapter` (7 scenarios)
**Imports:** all adapter functions; `Cubit`, `clearAll` from `@blac/core`
**Scenarios:**
1. `autoTrackSubscribe` in SSR: unsubscribing after subscription is safe
2. `manualDepsSubscribe` with equal array deps prevents callback
3. `manualDepsSubscribe` with changed deps triggers callback
4. `autoTrackSnapshot` creates DependencyState lazily on first call
5. `ExternalDepsManager.updateSubscriptions()` returns false when bloc has no deps
6. `ExternalDepsManager.updateSubscriptions()` returns false when `getterState` is null
7. `DependencyManager.add()` is idempotent — adding same dep twice only subscribes once

**Key gotcha:** #2 and #3 — call `manualDepsSnapshot` to seed the cache before `manualDepsSubscribe`'s callback evaluation.

---

### `useBloc.shared-instances.test.tsx` (6 scenarios)
**Helper:** `class SharedBloc extends Cubit<{ count: number }>`
**Scenarios:**
1. Two components share same instance
2. State change in one is visible in other
3. Unmounting one of two does NOT dispose (refCount still 1)
4. Unmounting last consumer disposes
5. Three consumers: dispose only when all three unmount
6. Re-mounting re-acquires (possibly fresh if previously disposed)

---

### `useBloc.instance-isolation.test.tsx` (6 scenarios)
**Scenarios:**
1. Different `instanceId` → different instances
2. State change in instance `'a'` does NOT trigger re-render in component on instance `'b'`
3. Numeric `instanceId: 1` coerced to `'1'` — same as `instanceId: '1'`
4. `instanceId: undefined` falls back to default key
5. Component with unique `instanceId` disposes only that instance on unmount
6. Re-render with same `instanceId` keeps same bloc instance

---

### `useBloc.auto-track-optimization.test.tsx` (10 scenarios)
**Helper:** `class MultiFieldBloc extends Cubit<{ a: number; b: string; c: boolean }>`
**Scenarios:**
1. Access `state.a` — change `state.b` → NO re-render
2. Access `state.a` — change `state.a` → re-render
3. Access neither field → no re-render on any change
4. After accessing new field, subscription expands to include it
5. Deeply nested path (`state.user.profile.age`) tracked specifically
6. Top-level field access tracks only that field, not siblings
7. `autoTrack: false` causes ALL changes to trigger re-render
8. Global `configureBlacReact({ autoTrack: false })` disables tracking for all hooks (reset in afterEach)
9. Global `autoTrack: false` overridden per-hook with `autoTrack: true`
10. Proxy tracking works after component unmount/remount cycle

---

### `useBloc.manual-deps-edge-cases.test.tsx` (7 scenarios)
**Scenarios:**
1. `dependencies: () => []` — never re-renders after mount
2. `dependencies: (s) => [s.a, s.b]` triggers on either change
3. Dependencies function receives both `state` AND `bloc` as arguments
4. Manual deps mode disables getter tracking even when getters accessed
5. `null` values in dependency array handled without throw
6. Inline arrow function deps reference changes each render — no infinite reconfiguration (stable wrapper)
7. `undefined` values treated as stable: `[undefined] === [undefined]`

---

### `useBloc.lifecycle-edge-cases.test.tsx` (9 scenarios)
**Scenarios:**
1. `onMount` called exactly once on mount
2. `onUnmount` called on unmount
3. `onMount` receives correct bloc instance
4. `onUnmount` receives correct bloc instance
5. `onMount` and `onUnmount` NOT re-called on re-render
6. StrictMode: `onMount` fires once after double-invocation (not twice)
7. StrictMode: bloc instance stable across double-invocation
8. `componentRef` is stable RefObject across re-renders
9. `onUnmount` called before instance release (ordering)

---

### `useBloc.getter-advanced.test.tsx` (8 scenarios)
**Helper:**
```ts
class ComputedBloc extends Cubit<{ x: number; y: number }> {
  get sum() { return this.state.x + this.state.y; }
  get product() { return this.state.x * this.state.y; }
  get alwaysFive() { return 5; }
}
```
**Scenarios:**
1. Constant-returning getter never triggers re-render
2. Getter accessing `x` and `y` re-renders on change to either
3. Getter tracking disabled when `autoTrack: false`
4. Getter tracking disabled when `dependencies` option provided
5. Two getters, only one accessed — other's dep changes don't trigger re-render
6. Getter that throws logs warning, does not crash
7. Conditional getter access — deps update dynamically
8. Symbol-keyed getter is tracked like a regular getter

---

### `useBloc.cross-bloc-react.test.tsx` (6 scenarios)
**Pattern:** Two-level chain: `BlocA` has getter that calls `this.depend(BlocB)()`
**Scenarios:**
1. Component subscribes to external dependency changes via `ExternalDepsManager`
2. Unmounting component unsubscribes from external dependencies
3. External dependency being disposed does not crash component
4. Dynamically added external dependency subscribed after next render
5. Dynamically removed external dependency unsubscribed after next render
6. Same external dependency used by two components — both notified

---

### `useBloc.stress.test.tsx` (5 scenarios)
**Scenarios:**
1. 100 rapid state changes — all re-renders complete without error, shows final state
2. 10 components sharing one bloc — all update correctly
3. Mount/unmount 50 times — no memory leak (refCount returns to 0 each time)
4. Parent and child each calling `useBloc` — both get correct instances
5. 50 unique `instanceId`s created simultaneously — all tracked correctly

---

### `useBloc.ssr.test.tsx` (4 scenarios)
**Scenarios:**
1. `autoTrackInit` falls back to `noTrackInit` when `window` is undefined (`vi.stubGlobal`)
2. `autoTrackSubscribe` behaves like `noTrackSubscribe` in SSR
3. `autoTrackSnapshot` returns raw state in SSR
4. `useBloc` in `renderToString` returns initial state without crashing

---

## Key Gotchas (reference during implementation)

| Gotcha | Detail |
|--------|--------|
| `clearAll()` scope | Only clears registry-tracked instances. Direct `new` construction needs manual `dispose()` in afterEach |
| `ensure()` refCount = 0 | `ensure` passes `countRef: false` — `getRefCount()` will be 0 after ensure-only call |
| Same reference = no notification | `applyState` short-circuits on `this._state === newState`. Use `update(s => s)` to test this |
| StrictMode double-invocation | React unmounts+remounts in dev — `onMount` count tests must account for this |
| `disableGetterTracking` | Called post-render in `useBloc` effect; tests probing `isTracking` must call it explicitly |
| PluginManager singleton | `getPluginManager()` returns a cached global. File 10 creates its own `new PluginManager(globalRegistry)` — correct pattern |
| `shallowEqual` in manual deps | Object values in deps always trigger re-render (different refs). Only primitives are stable |
| `manualDepsSnapshot` before subscribe | Cache must be seeded via `manualDepsSnapshot` call before `manualDepsSubscribe` callback evaluation |

---

## Progress

| Batch | Status | Date |
|-------|--------|------|
| Batch 1 — Pure core | complete | 2026-03-15 |
| Batch 2 — StateContainer internals | complete | 2026-03-15 |
| Batch 3 — Registry mechanics | complete | 2026-03-15 |
| Batch 4 — Tracking & watch | complete | 2026-03-15 |
| Batch 5 — Plugin system | complete | 2026-03-15 |
| Batch 6 — Adapter | complete | 2026-03-15 |
| Batch 7 — React instance management | complete | 2026-03-15 |
| Batch 8 — React tracking optimizations | complete | 2026-03-15 |
| Batch 9 — React cross-bloc, SSR, stress | complete | 2026-03-15 |
