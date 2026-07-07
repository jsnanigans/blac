# Recon: Structural + Engine reliability bugs

Read-only investigation. No source modified. Fix locations + approaches proposed for a follow-up plan.

---

## R1/T1 — `emit()` under-marks the dirty set (CRITICAL, CONFIRMED)

### Verified current code
- `packages/dirtytalk-structural/src/container.ts:135-155` `emit()`:
  - `136` reference short-circuit `Object.is(this._state, next)`.
  - `141-144` `_consumerPaths.size <= 1` → `dirty = ALL_PATHS`.
  - `145-153` else → `dirty = diffAlongSkeleton(prev, next, this._skeleton, …)`.
  - `154` `this._channel.mark(dirty)`.
- `diffAlongSkeleton` (`diff.ts:55-75`): empty skeleton → `emptyPathSet()`; otherwise only marks skeleton ids whose value changed. So an emit that changes a field **not in any consumer's skeleton** returns an **empty Set**.
- `dirty-channel.ts:72-80` `#flush`: step 2 empty fast-path `if (this.#space.isEmpty(dirty)) return;` — bails **before** the subscriber loop (`87+`). Documented contract: "no callback fires for no-op flushes."
- `PathSetSpace.intersects` (`path-set.ts:37-48`): `interest === ALL_PATHS` intersects **any non-empty** dirty set; a leaf `Set` interest intersects only if it shares an id.
- ALL_PATHS is a `unique symbol` (`path-set.ts:4-7`). There is **no root/sentinel id** today; the only sentinel is the ancestor-watch prefix `'\0a:'` (`path-interner.ts:19`, `internAncestor`/`isAncestorId`).

### Confirmed failure chain
With ≥2 registered auto-track consumers (`_consumerPaths.size >= 2`) an emit touching only untracked fields → `diffAlongSkeleton` returns `{}` → `channel.mark({})` → `#flush` empty fast-path returns → **no subscriber runs**, including ALL_PATHS subscribers. Starved: the blac bridge (`StateContainer.ts:349-352`, interest `() => ALL_PATHS`), `PluginManager` (subscribes ALL_PATHS — `plugin/PluginManager.ts`), `watch()`, select-mode, and `onSystemEvent('stateChanged')`. Note `subscribe()` (`container.ts:202-204`) does **not** register a consumer path, so plugins/bridge/watch never count toward `_consumerPaths.size` — hence a container with the bridge + plugins + exactly 2 React trackers still takes the diff branch and starves them.

### `_pendingChange` relationship — auto-fixed, no separate change
`StateContainer.applyState` (`StateContainer.ts:546-553`) sets `_pendingChange` **before** `super.emit(next)`; `_drainPending` (`565-568`) clears it and fires `stateChanged`, driven **only** by the ALL_PATHS bridge callback. Today the starved emit leaves `_pendingChange` dangling until the next waking flush (which then reports a stale `prev`). Once emit wakes ALL_PATHS subscribers correctly, the bridge fires, `_drainPending` runs, and the dangle clears. **No separate blac change required** — fixing structural `emit` resolves both. (`patch` is unaffected: `changedPathsFromPatch` is skeleton-independent and value-filtered, so any real change yields a non-empty mark; genuine no-ops are guarded at `container.ts:176`.)

### Fix approach + exact insertion point
Fix lives in **structural**, not engine — the engine empty fast-path is a shared contract also relied on by spatial. In `container.ts` `emit`, after the diff (else branch, ~line 152), when the diff is empty but state actually changed (already guaranteed by the `136` reference short-circuit), union in a **reserved root-sentinel PathId** so ALL_PATHS interests intersect while leaf `Set` interests do not.

Recommended shape:
- Add a reserved id to `PathInterner` (e.g. `rootId()` interning `'\0root'`), and teach `lookup`/`isAncestorId` to treat it distinctly so devtools/`diffAlongSkeleton` never mis-decode it (the current `lookup` NUL-guard would wrongly slice a `'\0root'` string — see Open Decision R1-b).
- In `emit`, conditional union:
  ```
  dirty = diffAlongSkeleton(...);
  if (dirty !== ALL_PATHS && (dirty as Set).size === 0) {
    dirty = new Set([this.interner.rootId()]);
  }
  ```
  Conditional (only when empty) is preferred over "always union root" so the sentinel does not appear in normal dirty payloads handed to subscriber callbacks.

### Tests to extend
- `packages/dirtytalk-structural/src/container.test.ts` (multi-consumer diff cases already here, e.g. `342-396`).
- `packages/dirtytalk-structural/src/integration.test.ts`.
- blac: `packages/blac-core/src/core/StateContainer.lifecycle-events.test.ts` (stateChanged), plus a plugin/`watch` wake test. Add a case: ≥2 registered trackers + ALL_PATHS subscriber + emit of an untracked field → subscriber fires, tracked consumers stay asleep, `_pendingChange` drains.

### Open decisions
- **R1-a (recommended default):** conditional root-sentinel union in `emit` only. Alternative "always union root" is simpler but leaks the sentinel into every dirty payload.
- **R1-b:** how the reserved id decodes. Recommend an explicit `ROOT_SENTINEL` constant + `rootId()`/`isRootId()` on `PathInterner` and a guard in `lookup` (return `''` or throw) so the existing `'\0a:'`-slice path doesn't corrupt it.

---

## E1 — shared scheduler deadlock (HIGH, CONFIRMED as latent)

### Verified current code
`scheduler.ts`: `ManualScheduler` (`20-36`), `MicrotaskScheduler` (`42-66`), `RAFScheduler` (`73-120`) each hold a single `#flush: (() => void) | null` and **overwrite** it on every `request()` (`26`, `47`, `101`). One pending slot, last-writer-wins. `dirty-channel.ts:52-55`: a channel sets `#scheduled = true` and will not re-request until its own `#flush` clears it (`75`).

### Confirmed failure chain (latent)
Two `DirtyChannel`s sharing one scheduler: channel A `request(boundFlushA)`, then channel B `request(boundFlushB)` overwrites the slot. Pump/drain runs only `boundFlushB`. A's `#scheduled` stays `true`, so A never re-requests → A permanently deadlocked.

### Is it triggered today? No.
Every construction site makes a **fresh** scheduler: `StructuralContainer` default `new MicrotaskScheduler()` (`container.ts:89`), `SceneRoot` default `new RAFScheduler()` (`scene-root.ts:74`). No production code shares one instance across channels. Tests that store a scheduler in a variable use it for a **single** root/container (`scene-root.test.ts:138-148`, `278+`). So E1 is a **latent** bug in a general-purpose, publicly-exported (`engine/src/index.ts:7`) primitive.

### The existing contract that a fix must reckon with
`scheduler.test.ts:65-74` — "request → request → pump: flush runs once (idempotent within window)" — asserts with **two distinct fns** that only `fn2` runs, `fn1` does not. This encodes the current single-slot semantics. A single real `DirtyChannel` always re-requests with its **stable** `#boundFlush` (`dirty-channel.ts:34,40`) and is further guarded by `#scheduled`, so the distinct-fn scenario never arises from one channel — the test is synthetic.

### Fix approach
Replace the single `#flush` slot with `#pending = new Set<() => void>()` in each of `ManualScheduler`, `MicrotaskScheduler`, `RAFScheduler`; `request` adds, drain snapshots then clears the set and invokes each. Dedup by identity means a single channel re-requesting its stable `#boundFlush` still runs once (single-channel behavior unchanged); multiple channels each get drained (deadlock fixed). No change needed in `dirty-channel.ts`.

### Behavior/test impact
- `scheduler.test.ts:65-74` **must be updated**: with distinct fns the Set approach now runs **both** → change expectation to `fn1` and `fn2` each called once. (Add a same-fn dedup case to lock the "still once" guarantee.)
- Re-entrant-request-during-drain tests (`scheduler.test.ts:85+`, `117+`): snapshot-then-clear preserves "next-window" semantics; verify these still pass.
- `SyncScheduler` needs no change (invokes immediately, stateless).

### Open decision
- **E1-a (recommended default):** `Set<() => void>` drain-all in all three deferred schedulers. Alternative: **assert exclusivity** (throw/warn if `request` receives a different fn while one is pending) — turns silent deadlock into a loud error but blocks legitimate scheduler sharing and still breaks `scheduler.test.ts:65`. Prefer the Set: it makes sharing correct for a library primitive at negligible cost.

### Tests to extend
- `packages/dirtytalk-engine/src/scheduler.test.ts` (update `65-74`; add shared-scheduler-two-channels drain test).
- `packages/dirtytalk-engine/src/dirty-channel.test.ts` / `integration.test.ts` (two channels, one shared scheduler, both flush).
