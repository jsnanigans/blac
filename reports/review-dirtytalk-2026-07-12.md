# Review: dirtytalk-engine / dirtytalk-structural (reliability, memory, architecture)

Scope: reliability, memory, architecture; performance items limited to gaps not
already in `perf-improve-dirtytalk-2026-07-12.md` / `perf-improve-blac-core-2026-07-12.md`.
Verified at `31df4ae9`.

## Findings (ranked impact ÷ risk)

**1. HIGH — Reliability. Shared `Scheduler` + `dispose()` cross-contaminates.**
`dirty-channel.ts:166-169` `dispose()` calls `scheduler.cancel?.()`.
`MicrotaskScheduler.cancel`/`RAFScheduler.cancel` (`scheduler.ts:68-71,135-140`)
reset the scheduler's **entire** `#pending` set, not just the caller's entry. If
one `Scheduler` instance is passed to `StructuralContainerOptions.scheduler` for
multiple containers (an API-sanctioned pattern — the doc says "Default: a fresh
MicrotaskScheduler **per instance**", implying sharing is a supported override),
disposing container A silently drops container B's already-scheduled flush —
lost notifications, no error. Not currently exercised (grep: only test/bench
code passes per-instance `SyncScheduler`), but it is the natural next step if
someone tries to batch flushes app-wide (a plausible follow-on to the shipped
per-flush perf work). Fix: schedulers should cancel by removing only the
caller's flush fn from `#pending`, not clearing the set. Effort M, risk med.

**2. HIGH — Reliability/diff correctness. `deepMerge` is proto-pollution-adjacent.**
`container.ts:434-453`. `out[key] = nextVal` is a bracket **assignment**; if
`patch` carries an own `"__proto__"` key (e.g. `container.patch(JSON.parse(payload))`
— `JSON.parse` creates it as a real own data property), `out.__proto__ = nextVal`
invokes `Object.prototype.__proto__`'s setter and silently rewrites the merged
state's prototype chain. `isPlainPatchObject`'s `Object.keys` walk does nothing
to filter it. Fix: `Object.defineProperty(out, key, {value, writable:true,
enumerable:true, configurable:true})`, or skip `__proto__`/`constructor`/`prototype`
keys explicitly. Effort S, risk low.

**3. MED-HIGH — Memory. `ProxyCache` never evicts stale `(target, prefix)` entries.**
`tracker.ts:191-208`. Entries are added (`_set`) but never removed; only the
outer `WeakMap<target,...>` provides GC, so as long as `target` is reachable,
every prefix it was ever read under (e.g. a list item that moved from index 3→7
across reorders/filters) keeps its own retained `Proxy` + `proxyToTarget` entry
forever. For a `ProxyCache` scoped per `useBloc` instance (per docstring) over a
reorderable/filterable list, this grows unbounded with churn. Fix: prune a
target's prefix map to only prefixes touched in the current `trackRender` call.
Effort M, risk med.

**4. MED-HIGH — Memory. `PathInterner` is per-class-shared and never shrinks.**
`path-interner.ts:30-165`, `container.ts:81-90` (`WeakMap` keyed by constructor,
not instance). Self-documented risk (`path-interner.ts:157-162`) but worth
stating concretely: dynamic-key state (e.g. `byId.<uuid>.name`) grows `_paths`/
`_map`/`_segments`/`_ancestorTarget`/`_ancestorIds` forever, shared across **all**
instances of the bloc class, surviving individual instance disposal — bounded
only by app lifetime. Fix (S): dev-mode size-threshold warning. Fix (L, real
eviction): needs an invalidation story for `PathId`s already held by consumers.

**5. MEDIUM — Reliability. Flush errors surface in odd contexts.**
`dirty-channel.ts:152-159`. With `SyncScheduler` + no `onError`, a throwing
subscriber propagates synchronously out of the caller's `emit()`/`patch()` (after
state already mutated). With the default `MicrotaskScheduler` + no `onError`, the
throw happens inside a bare `queueMicrotask`, an unhandled exception in most
hosts. Fix: document loudly, or default `onError` to `console.error`. Effort S.

**6. MEDIUM — Architecture. Duplicate hook protocols risk drift.**
`react-hook.ts` (`useStructural`) independently reimplements the same
register→subscribe→"mount gap"→layout-effect protocol as blac-react's `useBloc`
(confirmed: `useBloc.ts:299-379` calls it "R2", `react-hook.ts:26-42` calls it
"T6" — same bug class, fixed twice, no shared code/tests). A future fix to one
won't propagate to the other. Effort M to extract a shared helper.

**7. LOW-MEDIUM — Architecture. `primitives.ts` (`Signal`) is dead weight.**
Confirmed zero consumers repo-wide (unlike `space.ts`, which `dirtytalk-spatial`
does use). Duplicates `DirtyChannel`'s error-aggregation/snapshot logic from
scratch. Recommend deleting or moving to a separate entry point.

**8. LOW — Performance (new). `_refineAncestorMarks` scales with total skeleton size.**
`container.ts:390-399`. Even with the interner's ancestor-memo warm, every
atomic-leaf-replacing patch (e.g. `patch({ items: newArray })`) walks the
*entire* skeleton doing a linear ancestor-array scan per entry — cost is
O(skeleton × depth) regardless of how few consumers are actually affected.
Distinct from the memo-invalidation issue already flagged as F2 in the
dirtytalk perf report. Needs a real path-trie to fix properly — effort L.

**9. LOW — Architecture. `getConsumerPaths()` leaks a live, mutable Map.**
`container.ts:156-158`. `ReadonlyMap` is compile-time only; any devtools/plugin
code calling `.set`/`.delete` on it corrupts the real registry. Effort S (return
a shallow copy at inspection sites only).

## Verified FINE (load-bearing, no issue found)
- `Object.is` equality correctly handles `NaN`/`±0` and sparse-array holes throughout `diff.ts`.
- Frozen-property Proxy-invariant handling (`tracker.ts:494-502`) correctly bypasses wrapping.
- Symbol keys never recorded (`tracker.ts:376-393`); no path-namespace pollution.
- Re-entrant `mark()`/unsubscribe-during-flush (`dirty-channel.ts:54-139`) correctly uses snapshot + `alive` flag.
- `_applyRefDelta` incremental refcounting (`container.ts:303-331`) is set-equal to a from-scratch union.
- `Map`/`Set`/`Date`/class-instance leaf treatment is consistent between `diff.ts` and `tracker.ts`.

## Next Steps
1. Fix #2 (proto-pollution) first — smallest, safest, closes a real correctness gap.
2. Fix #1 (scheduler cancel) before anyone attempts a shared/coalesced scheduler.
3. Prototype #3/#4 eviction strategies together — both stem from unbounded per-key retention.
