# IndexedDB Persistence Plugin Plan

## Goal

Create a BlaC plugin for `packages/blac-core` Cubits that automatically:

- hydrates state from IndexedDB
- persists state changes back to IndexedDB
- allows custom `stateToDb` and `dbToState` transforms
- keeps the default API small while leaving room for stronger DX later

## When IndexedDB Makes Sense

IndexedDB is the right persistence target when the data is:

- client-side application state
- structured rather than just a single string blob
- potentially larger than trivial preferences
- useful across reloads or offline sessions
- not required synchronously at first paint

For browser storage, the practical split is:

- use `localStorage` for tiny, simple preferences
- use IndexedDB for structured app state and larger datasets
- use Cache Storage for network responses and assets, not domain state

### Good IndexedDB Use Cases

- offline-first drafts, notes, todos, or editor state
- multi-step form progress and recovery
- cached message threads, channels, or inbox summaries
- optimistic updates and retry queues
- saved filters, views, and workspace state
- normalized local entity caches reused between visits
- larger per-user state where synchronous storage would be a bad fit
- rich or binary-adjacent records paired with metadata

### Good BlaC/Cubit Plugin Use Cases

This plugin is especially useful for Cubits that represent:

- draft content
- recoverable user work
- long-lived UI workspaces
- domain caches that should survive unmounts and reloads
- disconnected or flaky-network workflows

Examples:

- `TodoCubit`
- `DraftCubit`
- `FormWizardCubit`
- `ChannelCubit`
- `InboxCacheCubit`
- `SyncQueueCubit`

### When IndexedDB Is Not Worth It

Do not default to IndexedDB for:

- tiny preferences like theme, a single toggle, or a tab choice
- state that is cheap to recompute or refetch
- server-authoritative data with no offline value
- state that must be available synchronously before first render
- highly sensitive data that should not be stored on-device
- full-text-search-heavy use cases where IndexedDB is the wrong primitive

In those cases:

- `localStorage` is often simpler for tiny preferences
- in-memory state may be enough for ephemeral UI state
- server fetch plus cache headers may be enough for authoritative remote data

### Practical Rule Of Thumb

Use IndexedDB if losing the data would annoy the user and the data is large,
structured, or offline-relevant.

Do not use IndexedDB if the persisted value is tiny, disposable, or easier to
derive than to migrate and maintain.

### Important Constraint For This Plugin

IndexedDB reads are async. That means this plugin is best for rehydration that
can happen shortly after mount, not for data that must exist synchronously
before a Cubit is first read.

That makes it a strong fit for:

- drafts
- cached lists
- form recovery
- local work queues
- workspace state

And a weak fit for:

- critical boot-time auth assumptions
- render-blocking feature flags
- state that must be finalized before the first UI paint

## Current Constraints In `@blac/core`

### What already works

- `StateContainer.initConfig()` emits a synchronous `created` lifecycle event.
- `PluginManager` can react to `onInstanceCreated`, `onStateChanged`, and `onInstanceDisposed`.
- `Cubit` already exposes public mutation methods, so a plugin can restore state by emitting a parsed value.

Relevant files:

- `packages/blac-core/src/core/StateContainer.ts`
- `packages/blac-core/src/core/StateContainerRegistry.ts`
- `packages/blac-core/src/plugin/BlacPlugin.ts`
- `packages/blac-core/src/plugin/PluginManager.ts`

### Architectural limitation

IndexedDB reads are async. That means a plugin cannot guarantee hydration before `acquire()` returns today.

For a first implementation, that is acceptable if we:

- hydrate in the background after instance creation
- expose hydration status for debugging
- avoid overwriting user changes that happen before hydration completes

Longer term, core should expose a first-class hydration or readiness primitive.

## Recommended Shape

Implement this as a new package:

- `packages/plugin-persist`

Keep `@blac/core` unchanged for the first pass unless a hard blocker appears.

This first version should:

- use native IndexedDB, not Dexie
- avoid adding a new dependency immediately
- keep a stable adapter boundary so Dexie can be swapped in later

## Proposed API

```ts
import { createIndexedDbPersistPlugin } from '@blac/plugin-persist';

const persistPlugin = createIndexedDbPersistPlugin({
  databaseName: 'blac-examples',
});

persistPlugin.persist(TodoCubit, {
  key: 'todo:main',
  stateToDb: (state) => ({
    items: state.items,
    filter: state.filter,
  }),
  dbToState: (record, ctx) => ({
    ...ctx.currentState,
    items: record.items,
    filter: record.filter,
  }),
  debounceMs: 50,
});
```

## First Version Capabilities

- register persistence config per Cubit class
- hydrate from IndexedDB on instance creation
- persist on state changes
- debounce writes
- clear persisted records manually
- expose hydration and save status for debugging
- allow record-level transforms with:
  - `stateToDb`
  - `dbToState`

## Type Shape

```ts
persistPlugin.persist(MyCubit, {
  key?: string | ((ctx) => string),
  debounceMs?: number,
  stateToDb?: (state, ctx) => PersistedValue,
  dbToState?: (persisted, ctx) => State,
  onHydrated?: (state, ctx) => void,
  onError?: (error, ctx) => void,
});
```

### `stateToDb`

Used to:

- omit ephemeral fields
- flatten complex state
- store versioned payloads

### `dbToState`

Used to:

- merge persisted data with current defaults
- parse strings back into richer shapes
- recover from old record formats

## Record Envelope

Use one object store with one stable record format:

```ts
type PersistedRecord = {
  id: string;
  className: string;
  instanceId: string;
  savedAt: number;
  payload: unknown;
};
```

Why this shape:

- stable schema
- easy to inspect in devtools
- avoids creating stores per Cubit type
- supports future migrations without DB-level redesign

## Race Handling

The basic async hydration flow needs one important safeguard:

- if the user mutates state before IndexedDB hydration finishes, do not overwrite the live in-memory state with stale persisted data

Basic policy for v1:

- mark the instance as `dirtyBeforeHydration` if state changes while hydration is pending
- when the persisted record finally loads:
  - skip applying it if the instance is already dirty
  - keep current in-memory state as source of truth

This avoids destructive late hydration.

## DX Features To Add Later

- `waitForHydration(instance)`
- framework hooks like `usePersistenceStatus(instance)`
- cross-tab sync with `BroadcastChannel`
- validation adapters for `zod` or `valibot`
- versioned migrations
- selective helpers like `pick()` and `omit()`
- explicit `instanceKey` in plugin metadata from core
- core-level hydration lifecycle support

## Dexie Later

Dexie is still a good second step.

Why not for v1:

- native IndexedDB is enough to prove the API and plugin behavior
- no dependency install friction
- easier to land in this repo immediately

Why still keep an adapter boundary:

- Dexie would improve schema upgrades, transactions, and future reactive sync work
- the public plugin API should not need to change if storage is swapped later

## Improvements For Current `packages/plugin-persist`

After reviewing the current implementation, the highest-value improvements are
in the runtime contract and failure handling rather than the basic IndexedDB
shape.

### 1. Register By Constructor, Not `Type.name`

Current code stores persistence registrations keyed by `Type.name`.

Why this should change:

- class names are not a stable runtime identifier under minification
- different classes can share the same name
- subclassing and refactors become more fragile than necessary

Recommended change:

- store registrations in a `Map<constructor, definition>`
- resolve registrations by the actual constructor reference instead of
  `instance.constructor.name`

This makes plugin behavior more robust without changing the public API.

### 2. Tighten The Supported Instance Contract

The current plugin API accepts any `StateContainer`, but hydration is applied by
calling `emit()` through an `any` cast.

That means the real contract is narrower than the type surface suggests.

Recommended change:

- either restrict `persist()` to `Cubit` types explicitly
- or add a small core-level hydration/apply-state primitive that plugins can use
  without reaching through `any`

For now, restricting the plugin to `Cubit` is the cleaner v1 stance because it
matches the intended design and avoids pretending all `StateContainer`
instances are safely hydratable.

### 3. Add `waitForHydration(instance)`

`getStatus()` and `subscribe()` are useful for debugging, but they are weak for
real control flow.

Recommended change:

- expose `waitForHydration(instance): Promise<PersistPluginStatus>`
- resolve when hydration finishes, whether from storage or by a safe skip
- reject only on terminal hydration failure if that distinction is needed

This improves:

- integration tests
- app bootstrap flows
- UI code that needs to react after hydration settles

### 4. Harden The Hydration/Save State Machine

The current implementation already handles the key v1 race:

- if state changes before hydration finishes, do not apply stale persisted data

That part is aligned with the intended design, but the internal state machine
should still be tightened.

Recommended changes:

- guard `applyingHydration` with `try/finally` so thrown transforms do not leave
  the runtime stuck in hydration mode
- track in-flight hydration and save promises per instance
- ignore stale async completions after disposal or replacement work
- make status transitions deterministic under rapid consecutive writes

This reduces the risk of misleading status output and subtle save ordering bugs.

### 5. Make The Native Adapter Recover Better

The current adapter caches `dbPromise` permanently. If opening the database
fails once, the adapter can remain poisoned for the rest of the session.

Recommended changes:

- clear the cached open promise on rejection so later operations can retry
- handle IndexedDB `onblocked`
- handle `onversionchange` and close old connections

These are small changes with disproportionate value for real browser behavior,
especially with multiple tabs or schema changes.

### 6. Add Versioning To The Persisted Envelope Early

The current record shape is:

```ts
type PersistedRecord = {
  id: string;
  className: string;
  instanceId: string;
  savedAt: number;
  payload: unknown;
};
```

This is fine for proving the flow, but version metadata should be introduced
before consumers rely on the unversioned shape.

Recommended change:

```ts
type PersistedRecord = {
  id: string;
  className: string;
  instanceId: string;
  version: number;
  savedAt: number;
  payload: unknown;
};
```

That gives the plugin a clear path to:

- payload migrations
- compatibility checks
- safer long-lived persisted data

### 7. Add Tests Before Broadening The API

This package currently needs direct test coverage. The core behavior is async,
stateful, and race-prone, so test gaps are meaningful.

Recommended coverage:

- hydrates successfully from an existing record
- skips hydration when the instance becomes dirty first
- debounces writes correctly
- does not apply stale async work after disposal
- reports status transitions in the expected order
- recovers cleanly from adapter failures

The plugin is small enough that these tests should be straightforward and would
materially improve confidence in future API additions.

### 8. Improve Docs And Example Coverage

The package README is currently minimal.

Recommended changes:

- document the full `persist()` API
- state clearly that hydration is async
- state clearly that the plugin is intended for `Cubit`-style mutable state
- add an example app demo that shows hydration, debounced persistence, and
  status updates in the UI

This would align the package docs with the intended design and make the plugin
easier to evaluate in practice.

## Example App Plan

Add a new examples app demo that:

- installs the plugin before mounting the persisted Cubit
- edits a draft note
- persists to IndexedDB
- remounts the Cubit to prove hydration works
- shows plugin status events in the UI
- demonstrates `stateToDb` / `dbToState` by transforming tags

## Implementation Steps

1. Add this design doc.
2. Create `packages/plugin-persist`.
3. Implement a small native IndexedDB adapter.
4. Implement `IndexedDbPersistPlugin`.
5. Add package exports and workspace dependency wiring.
6. Add an examples demo in `apps/examples`.
7. Verify with typecheck and a local examples build.
