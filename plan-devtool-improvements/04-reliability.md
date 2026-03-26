# Reliability — Debouncing, Test Coverage, Memory Limits & Error Handling

Harden the devtools pipeline so it performs well under pressure and doesn't degrade the host application.

---

## Phase 1: Debouncing & Throttling

**Goal:** Prevent high-frequency state updates from overwhelming the communication pipeline or freezing the UI.

### Tasks

- [ ] **Throttle state update events in DevToolsBrowserPlugin**
  - Add a per-instance throttle: if an instance emits more than N updates within a window, batch them
  - Strategy: buffer updates for 16ms (1 frame), then emit the latest state + count of skipped updates
  - Configurable: `throttleMs` option in `createDevToolsBrowserPlugin()` config (default 16)
  - Always emit the *first* and *last* update in a burst (first for responsiveness, last for correctness)
  - Include `skippedUpdates: number` in the event so the UI can show "12 updates batched"

- [ ] **Batch extension messages**
  - In `inject-script.ts`: collect all updates within a 50ms window, send as a single `BATCH_UPDATE` message
  - New message type: `BATCH_UPDATE: { updates: AtomicUpdate[] }`
  - Service worker and panel handle batch messages by applying all updates in one React render cycle

- [ ] **Remove `flushSync` from panel update handling**
  - Current panel code uses React's `flushSync()` for immediate state application
  - Replace with normal `setState` — let React batch naturally
  - This alone will fix most UI jank from rapid updates

- [ ] **Add update rate indicator in UI**
  - Small counter in DevToolsHeader: "42 updates/s" when updates are flowing
  - Turns yellow/red at high rates to signal that batching is active
  - Helps developers understand when their app is updating too fast

- [ ] **Debounce search input**
  - Current search in `DevToolsSearchBloc` may fire on every keystroke
  - Add 150ms debounce to search filtering
  - Show "Searching..." indicator during debounce

### Files to modify

| Package | File | Change |
|---------|------|--------|
| `devtools-connect` | `DevToolsBrowserPlugin.ts` | Per-instance throttle |
| `devtools-connect` | `types/index.ts` | `throttleMs` config, `skippedUpdates` field |
| `devtools-extension` | `inject/inject-script.ts` | Batch message collection |
| `devtools-extension` | `panel/comm.ts` | Handle `BATCH_UPDATE` messages |
| `devtools-ui` | `DraggableOverlay.tsx` / `DevToolsPanel.tsx` | Remove `flushSync`, handle batches |
| `devtools-ui` | `DevToolsHeader.tsx` | Update rate indicator |
| `devtools-ui` | `blocs/DevToolsSearchBloc.ts` | Debounce search |

---

## Phase 2: Memory Management

**Goal:** Bound memory usage so devtools don't cause memory leaks in long-running applications.

### Tasks

- [ ] **Add size limits to serialized state**
  - In `safeSerialize()`: if a single state object serializes to > 1MB, truncate deep branches
  - Show `{ __type: 'Truncated', reason: 'State exceeds 1MB limit', originalSize: 2340000 }` placeholder
  - Configurable via `maxStateSizeBytes` in plugin config (default 1MB)

- [ ] **Implement LRU eviction for instance history**
  - Current: circular buffer per instance (20 snapshots, FIFO)
  - Better: LRU across all instances with a global memory budget
  - Global budget: `maxTotalSnapshotBytes` (default 50MB estimated)
  - When budget exceeded: evict oldest snapshots from the instance with the most history
  - Keep at least 2 snapshots per instance (current + previous) — never evict below that

- [ ] **Track and expose memory usage**
  - Estimate total memory used by devtools: `instanceCount * avgSnapshotSize * snapshotsPerInstance`
  - Expose via `getMemoryUsage()` on global API: `{ estimatedBytes, instanceCount, totalSnapshots, evictionCount }`
  - Show in UI: small memory badge in header ("~12MB")

- [ ] **Dispose cleanup verification**
  - When an instance is disposed, ensure all references are fully released:
    - Remove from `instanceCache`
    - Remove from `stateManager`
    - Remove from event history (or mark as disposed, don't hold state refs)
  - Add a `gc()` method on the plugin for manual cleanup if needed

- [ ] **Event history size limit**
  - Current: 10,000 events, no size consideration
  - Add estimated size tracking: if total event payload exceeds 10MB, evict oldest events regardless of count
  - Drop event data payloads for old events, keep only metadata (type, timestamp, instanceId)

- [ ] **WeakRef for instance tracking (where possible)**
  - Use `WeakRef` for the instance reference in `instanceCache` so that if the instance is GC'd, the cache entry doesn't prevent collection
  - Periodic cleanup: check for dead WeakRefs every 30s, remove stale entries

### Files to modify

| Package | File | Change |
|---------|------|--------|
| `devtools-connect` | `serialization/serialize.ts` | Size limit truncation |
| `devtools-connect` | `DevToolsStateManager.ts` | LRU eviction, memory tracking |
| `devtools-connect` | `DevToolsBrowserPlugin.ts` | WeakRef caching, gc(), memory API |
| `devtools-connect` | `types/index.ts` | Memory config options, `MemoryUsage` type |
| `devtools-ui` | `DevToolsHeader.tsx` | Memory usage badge |

---

## Phase 3: Test Coverage — devtools-connect

**Goal:** Bring devtools-connect from 9 test cases to comprehensive coverage of all critical paths.

### Tasks

- [ ] **Serialization tests** (`serialization/serialize.test.ts`)
  - Circular reference detection and replacement
  - Depth limit truncation (verify at depth 20)
  - Size limit enforcement (> 10MB payloads)
  - Special type handling: `Error`, `Date`, `RegExp`, `Map`, `Set`, `BigInt`, `Symbol`, `Function`
  - Mixed nested structures (Map inside Array inside Object with circular ref)
  - Edge cases: `undefined` values, `NaN`, `Infinity`, `-0`
  - Performance: serialize a 1MB object in < 100ms

- [ ] **DevToolsStateManager tests** (`state/DevToolsStateManager.test.ts`)
  - Basic CRUD: create instance, update state, get full state
  - Snapshot limit: verify FIFO eviction when > maxSnapshots
  - Instance limit: verify eviction when > maxInstances
  - History ordering: newest snapshot first
  - Dispose: verify complete cleanup
  - Edge cases: update disposed instance (should no-op), get non-existent instance

- [ ] **DevToolsBrowserPlugin extended tests** (`plugin/DevToolsBrowserPlugin.test.ts`)
  - Time-travel: verify `timeTravel()` restores state via emit/update
  - Time-travel: verify event is emitted after time-travel
  - Uninstall: verify `window.__BLAC_DEVTOOLS__` is removed
  - Uninstall: verify all caches and subscriptions are cleared
  - Concurrent updates: rapid sequential state changes (100 in a loop)
  - Error handling: what happens if `safeSerialize` throws unexpectedly
  - Exclusion: verify `excludeFromDevTools` instances never appear in any API output
  - Subscription: verify multiple subscribers receive all events
  - Subscription: verify unsubscribe actually stops delivery

- [ ] **Integration tests** (`__tests__/integration.test.ts`)
  - Full lifecycle: install plugin → create instance → change state 5 times → dispose → verify getFullState()
  - Multiple instances: 10 instances with interleaved updates, verify ordering
  - Subscribe during active session: late subscriber gets no history (only future events), but getFullState() has everything
  - Simulate rapid updates: 1000 state changes in 1 second, verify no data loss or memory blow-up

### Test infrastructure

- Use `vitest` (already configured in the package)
- Mock `BlocConsumer` / `StateContainer` minimally — use real `Cubit` subclasses where possible
- No DOM testing needed (this is pure logic)

### Files to create

| File | Purpose |
|------|---------|
| `src/serialization/__tests__/serialize.test.ts` | Serialization edge cases |
| `src/state/__tests__/DevToolsStateManager.test.ts` | State manager logic |
| `src/__tests__/integration.test.ts` | End-to-end plugin lifecycle |

### Files to modify

| File | Change |
|------|--------|
| `src/plugin/__tests__/DevToolsBrowserPlugin.test.ts` | Extend existing tests |

---

## Phase 4: Test Coverage — devtools-ui

**Goal:** Test the UI blocs (business logic) and critical component behaviors.

### Tasks

- [ ] **Bloc unit tests**
  - `DevToolsInstancesBloc.test.ts`: add/remove/update instances, connection status, animation triggers
  - `DevToolsLayoutBloc.test.ts`: tab switching, selection, expand/collapse, panel width
  - `DevToolsDiffBloc.test.ts`: store snapshots, max history limit, diff calculation, clear on dispose
  - `DevToolsSearchBloc.test.ts`: fuzzy matching, empty query, special characters, grouping
  - `DevToolsLogsBloc.test.ts`: add logs, max limit eviction, multi-filter combinations

- [ ] **Component rendering tests (lightweight)**
  - Use `@testing-library/react` with `vitest`
  - `InstanceList`: renders instances, search filters correctly, selection works
  - `StateViewer`: renders selected instance state, sections expand/collapse
  - `LogsView`: renders log entries, filters update visible entries
  - `StateDiffView`: renders diff between two states
  - Focus on rendering and interaction, not pixel-perfect layout

- [ ] **Error boundary tests**
  - Verify `DetailErrorBoundary` catches component crashes
  - Verify retry button re-renders the component
  - Verify error state shows useful message

### Files to create

| File | Purpose |
|------|---------|
| `src/blocs/__tests__/DevToolsInstancesBloc.test.ts` | Instances bloc |
| `src/blocs/__tests__/DevToolsLayoutBloc.test.ts` | Layout bloc |
| `src/blocs/__tests__/DevToolsDiffBloc.test.ts` | Diff bloc |
| `src/blocs/__tests__/DevToolsSearchBloc.test.ts` | Search bloc |
| `src/blocs/__tests__/DevToolsLogsBloc.test.ts` | Logs bloc |
| `src/components/__tests__/InstanceList.test.tsx` | Instance list rendering |
| `src/components/__tests__/StateViewer.test.tsx` | State viewer rendering |

---

## Phase 5: Error Handling & Resilience

**Goal:** The devtools should never crash the host app, and should recover gracefully from any failure.

### Tasks

- [ ] **Wrap all plugin hooks in try/catch**
  - Every method in `DevToolsBrowserPlugin` that's called by the core framework must be wrapped
  - On error: log to console.warn (not console.error, to avoid alarm), continue silently
  - Never throw from a plugin hook — the core framework should never be affected by devtools failures

- [ ] **Serialize defensively**
  - `safeSerialize` already handles many edge cases but:
  - Add try/catch around the entire function — if anything unexpected throws, return `{ __type: 'SerializationFailed', error: message }`
  - Add timeout: if serialization takes > 500ms, abort and return truncated result

- [ ] **Extension disconnection recovery**
  - When the extension context is invalidated (e.g., extension update), the content script currently catches errors
  - Add auto-reconnection: content script retries connection every 5s (max 3 attempts) after invalidation
  - Panel shows "Connection lost, reconnecting..." status
  - On reconnect: request full state dump to resync

- [ ] **Panel crash recovery**
  - Wrap the entire `DevToolsPanel` in an error boundary
  - On crash: show "DevTools crashed" message with "Reload" button
  - "Reload" clears all bloc state and re-fetches from the plugin

- [ ] **Stale data detection**
  - If the panel hasn't received an update in > 30 seconds but instances exist:
    - Show "Connection may be stale" indicator
    - Add a "Refresh" button that requests full state resync

- [ ] **Graceful degradation for missing features**
  - If `window.__BLAC_DEVTOOLS__` has an older API version, detect missing methods
  - Disable UI features that require newer API methods
  - Show version mismatch warning: "DevTools plugin v1.0, UI expects v1.2 — some features may be unavailable"

### Files to modify

| Package | File | Change |
|---------|------|--------|
| `devtools-connect` | `DevToolsBrowserPlugin.ts` | Try/catch all hooks |
| `devtools-connect` | `serialization/serialize.ts` | Timeout, defensive wrapping |
| `devtools-extension` | `content/content-script.ts` | Auto-reconnection |
| `devtools-extension` | `panel/comm.ts` | Reconnection, stale detection |
| `devtools-ui` | `DevToolsPanel.tsx` | Top-level error boundary |
| `devtools-ui` | `DevToolsHeader.tsx` | Connection status, version warning |

---

## Phase 6: Callstack Reliability

**Goal:** Make callstack capture work reliably so developers can trace where state changes originate.

### Tasks

- [ ] **Verify callstack is passed through core**
  - Audit `@blac/core` to ensure `onStateChanged` always receives a callstack
  - If not: add `new Error().stack` capture in `StateContainer.emit()` and `Bloc.update()`
  - This should be behind a flag: `captureCallstacks: boolean` (default true in dev, false in prod)

- [ ] **Improve callstack parsing**
  - Current `CallStackView` shows raw stack frames
  - Parse frames into structured objects: `{ functionName, fileName, lineNumber, columnNumber }`
  - Resolve source maps if available (stretch: use `sourceMappedStackTrace` or similar)
  - Filter out noise: internal BlaC frames, React internals, webpack/vite runtime frames

- [ ] **Clickable file links in extension context**
  - In the Chrome extension panel: make file paths clickable
  - Use `chrome.devtools.inspectedWindow.eval()` to open the file in Chrome's Sources panel
  - Or generate `vscode://file/...` links for VS Code users (detect IDE preference)

### Files to modify

| Package | File | Change |
|---------|------|--------|
| `@blac/core` | `StateContainer.ts` | Ensure callstack capture |
| `devtools-connect` | `DevToolsBrowserPlugin.ts` | Forward callstack |
| `devtools-ui` | `CallStackView.tsx` | Parse frames, clickable links |
| `devtools-extension` | `panel/comm.ts` | File link handling |

---

## Success Criteria

- An app with 100 blocs updating 60 times/second shows no visible performance degradation from devtools
- Memory usage is bounded and predictable (< 50MB for typical apps)
- All critical code paths in devtools-connect have > 80% test coverage
- The devtools never crash or visibly error in the host application
- Callstacks reliably show the originating user code for every state change
