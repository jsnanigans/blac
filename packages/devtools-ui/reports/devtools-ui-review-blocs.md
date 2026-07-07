# Investigation: devtools-ui state/data layer review

## Bottom Line
**Root Cause**: `DevToolsPanel` discards the cleanup function returned by the
`onMount` prop, so `defaultDevToolsMount`'s `unsubscribe()` + bloc `release()`
calls never run — every show/hide of the overlay leaks a subscription and a
retained `DevToolsDiffBloc`/`DevToolsLogsBloc` instance.
**Fix Location**: `src/DevToolsPanel.tsx:140-147`
**Confidence**: High

## What's Happening
`DraggableOverlay` conditionally renders `DevToolsPanel` only while `visible`
is true (Alt+D / toggle button unmounts it when hidden). Each mount calls
`defaultDevToolsMount(instancesBloc)` (`src/DraggableOverlay.tsx:122-274`),
which subscribes to `window.__BLAC_DEVTOOLS__` and `acquire()`s a fresh
`DevToolsDiffBloc`/`DevToolsLogsBloc` under a unique `refId`, returning a
cleanup that unsubscribes and releases both. That cleanup is never invoked.

## Why It Happens
**Primary Cause**: `useBloc`'s `onMount` option (`packages/blac-react/src/types.ts:51`)
has signature `(bloc) => void` — it has no cleanup-return convention, unlike
`useEffect`. `DevToolsUIProps.onMount` (`src/types.ts:11`) *does* document a
`void | (() => void)` return, but nothing in the panel wires that return value
anywhere.
**Trigger**: `src/DevToolsPanel.tsx:140-147` —
```ts
useBloc(DevToolsInstancesBloc, {
  onMount: (instancesBloc) => { onMount(instancesBloc); },   // return value dropped
  onUnmount: () => { onUnmount?.(); },                        // unrelated prop
});
```
**Decision Point**: the same line 142 — the call result of `onMount(instancesBloc)`
(the unsubscribe/release closure from `defaultDevToolsMount`, line
`src/DraggableOverlay.tsx:269-273`) is never stored, so nothing calls it in the
`onUnmount` branch above.

This is the opposite of the bug the code's own comment describes fixing —
`src/DraggableOverlay.tsx:116-120` says "Acquired refs are released in the
cleanup returned below — without that, the Diff/Logs blocs ... would be
retained for the lifetime of the page" — but that's exactly what happens today
because the returned cleanup is unreachable from `DevToolsPanel`.

Practical impact per Alt+D toggle cycle:
- one leaked `api.subscribe` listener on `window.__BLAC_DEVTOOLS__` (each
  still receives and processes every future event — the leaked instance
  keeps calling `instancesBloc.updateInstanceState`/`logsBloc.addLog`/etc.
  redundantly since `instancesBloc.$blac.disposed` never becomes true)
- one leaked `DevToolsDiffBloc` / `DevToolsLogsBloc` instance (with its
  bounded-but-nonzero `stateHistory`/`logs` Maps/arrays) held alive forever
  via the never-released ref

## Evidence
- **Key File**: `src/DevToolsPanel.tsx:140-147` — `onMount` return value discarded.
- **Key File**: `src/DraggableOverlay.tsx:122-274` (`defaultDevToolsMount`) —
  returns `() => { unsubscribe(); release(DiffBloc, {refId}); release(LogsBloc, {refId}); }`.
- **Key File**: `src/DraggableOverlay.tsx:359-383` — `visible` toggle unmounts/remounts
  `DevToolsPanel` (only the floating button renders when hidden), so this leak
  triggers on every Alt+D cycle, not just page unload.
- **Search Used**: `rg -n "onMount\(" src` — only call site is
  `DevToolsPanel.tsx:142`, confirming no other consumer captures the cleanup.

## Additional findings (lower severity)

1. **Unconditional full-state `structuredClone` per update, regardless of UI
   visibility** — `src/DraggableOverlay.tsx:207-220` calls
   `diffBloc.storePreviousState(...)` for every `instance-updated` event for
   every instance, which does `structuredClone(previousState)`
   (`src/blocs/DevToolsDiffBloc.ts:62-71`) even when the Diff/History panel is
   collapsed or a different instance is selected. Producer-side rAF coalescing
   (`devtools-connect`) caps event *frequency* but not the *size* of the clone
   done per changed instance per frame. Quick win: gate the clone behind
   `isHistoryExpanded || isDiffExpanded` for the currently-selected instance,
   or skip cloning for instances that aren't selected.

2. **Log entries retain raw (uncloned) `previousState`/`newState` references,
   capped only by count not size** — `src/DraggableOverlay.tsx:228-237` and
   `DevToolsLogsBloc.addLog` (`src/blocs/DevToolsLogsBloc.ts:39-71`). Default
   `maxLogs = 1000` (`DevToolsLogsBloc.ts:24`) bounds entry *count* but each
   entry can carry a full state tree, so worst-case memory is unbounded by
   payload size. Medium-severity; matches the "verbose logging" hazard class
   called out in project history.

3. **`debug.log`/`debug.warn` synchronously touch `localStorage` on the hot
   path** — `src/utils/debug.ts:12-25`; called at least twice per
   `instance-updated` event via `DevToolsInstancesBloc.updateInstanceState`
   (`src/blocs/DevToolsInstancesBloc.ts:102,140`) even when debug logging is
   disabled (the `window.__BLAC_DEVTOOLS_DEBUG__` fast path only short-circuits
   if explicitly set; otherwise it falls through to `localStorage.getItem`
   every call). Low severity today, but this is precisely the "verbose
   logging at 60fps" pattern that has previously frozen host apps. Quick win:
   cache the enabled-check result and invalidate via a `storage` event/manual
   toggle instead of re-reading `localStorage` per call.

4. **O(n) full-array/Map copies per event across three blocs** —
   `updateInstanceState`/`updateRefs`/`updateInstance`
   (`src/blocs/DevToolsInstancesBloc.ts:79-164`) each `.map()` over *all*
   instances, plus clone both `animationTriggers` and `updateTimestamps` Maps
   in full, for a single-instance update; `defaultDevToolsMount`'s
   `instance-updated` handler additionally triggers a `DevToolsDiffBloc` patch
   and a `DevToolsLogsBloc` patch — three separate O(n)-ish immutable updates
   per coalesced event. Not asymptotically dangerous at typical instance
   counts, but redundant; a Map keyed by instance ID (vs. array + `.find`)
   would drop the per-event scans to O(1) amortized. Bigger item, not urgent.

5. **Ungated/unmemoized getters recompute on every access** —
   `DevToolsSearchBloc.getFilteredInstances`/`getGroupedInstances`
   (`src/blocs/DevToolsSearchBloc.ts:38-111`) and
   `DevToolsDiffBloc.getDiff`/`extractChanges`
   (`src/blocs/DevToolsDiffBloc.ts:152-173`) are plain methods/getters with no
   memoization; each re-render of a component reading them re-runs fuzzy
   match over all instances or a full recursive diff. Bounded by
   instance/state size, not a leak, but worth memoizing (e.g. on
   `[query, instances]` / `[history[0], currentState]`) if instance counts grow.

## Next Steps
1. Fix the primary leak: in `DevToolsPanel.tsx`, capture
   `onMount(instancesBloc)`'s return value in a ref and invoke it inside the
   `onUnmount` callback (in addition to, not instead of, the existing
   `onUnmount?.()` call) — mirrors the `useEffect`-cleanup convention the
   `DevToolsUIProps.onMount` JSDoc already promises.
2. Gate `DevToolsDiffBloc.storePreviousState`'s `structuredClone` on whether
   the instance is currently selected and the history/diff panel is expanded.
3. Add a byte/entry-size guard (or truncate large `previousState`/`newState`
   payloads) in `DevToolsLogsBloc.addLog` independent of the count-based
   `maxLogs` cap.
4. Cache the `localStorage`-backed debug flag in `debug.ts` instead of reading
   it on every log call.
