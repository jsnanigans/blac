# Architecture

## A1 · `@blac/react` should not import `@dirtytalk/structural` directly

`packages/blac-react/package.json:101-103`, `packages/blac-react/src/useBloc.ts:20-26`

`@blac/react` has its **own dependency** on `@dirtytalk/structural` (for `ALL_PATHS`, `emptyPathSet`, `trackRender`, `PathInterner`) while `@blac/core` (a peer) has another. In a published install these can resolve to **two module instances** — and the protocol relies on sentinel identity: `paths === ALL_PATHS` checks, `interest` sets interned against the container's `PathInterner`, `unionPaths`' `a === ALL_PATHS` (`useBloc.ts:644`). Two copies of the lib means react's `ALL_PATHS` never equals core's, silently degrading interest matching (select-mode subscriptions would never match ALL_PATHS fast paths, etc.). pnpm workspaces mask this today; a real app with a stale lockfile hits it.

**Fix:** `@blac/core` already re-exports `ALL_PATHS`/`PathSet` for exactly this reason (`blac-core/src/index.ts:30-33`). Re-export the remaining needed primitives (`trackRender`, `emptyPathSet`, `PathInterner` type, `pathSetEquals`) — possibly via an `@blac/core/internal` subpath — and drop `@dirtytalk/structural` from `@blac/react`'s dependencies.

## A2 · Ref-counting by string convention is the leak factory

`StateContainerRegistry.acquire/release`, `useBloc.ts:36-37, 184, 312-317`

Correctness of the whole ownership model depends on distant call sites independently re-deriving the same `(Type, resolvedKey, refId)` triple at different times — acquire in render, release in effect cleanup, deps in `.track()` vs the reconcile vs unmount. The code itself documents the fragility ("Centralised so the `acquire` and `release` sites can never drift apart"), yet R3/R4/R5 are all instances of drift that the centralization didn't prevent, because the *count* side (how many times acquire ran) isn't part of the pairing.

**Suggestion:** make ownership a value, not a convention — `registry.acquire(...)` returns `{ instance, release() }` where `release` is idempotent and closes over the exact entry+refId+count it took. `useBloc` stores the handle in a ref; releasing the previous handle when the memo yields a new one is then local and obviously-correct. This also gives abandoned-render cleanup a place to live (a FinalizationRegistry on unreleased handles as a dev-mode leak detector).

## A3 · Four parallel notification planes with different timing and payloads

1. Per-container **channel** (path-scoped, microtask-coalesced) — useBloc, watch, plugin state bridge, the stateChanged system-event bridge.
2. **System events** on the container (`stateChanged`/`dispose`/`hydrationChanged`) — themselves driven by plane 1 via `_pendingChange`.
3. **Registry lifecycle events** (sync `created`/`disposed`/`refAcquired`/…, but `stateChanged` microtask-queued *separately* from plane 1).
4. **Plugin hooks** — a mix of planes 1 and 3.

Consequences already visible: R1 (planes 2/4 starve when plane 1's diff is skeleton-bounded), R11/R14 (planes 2 and 3 disagree about the final/coalesced history), R6 (`hydrationChanged` exists on plane 2 but was never bridged to plane 4). Every new observer feature must pick a plane and inherit its quirks.

**Suggestion:** make the channel the single spine. Registry `stateChanged` and plugin `onStateChange` both derive from the container flush (plugins already do); system events become thin wrappers; `hydrationChanged`/`dispose` get registry-level events emitted from one place. Then "did observers see this change" has one answer.

## A4 · PluginManager is a lazily-created global bound to the wrong registry

`StateContainerRegistry.ts:798-808`, `PluginManager.ts:87-90, 217-242`

- Created on first `getPluginManager()` call; containers created earlier never get `onCreated` or a state bridge. A devtools extension that installs after app boot sees new containers only (it can query existing ones but gets no state changes for them until they re-emit — actually never, since the bridge is attached only at `created`). This makes plugin install-order a correctness concern.
- Bound to `globalRegistry` permanently; `setRegistry()` (public API) swaps the registry out from under it — plugins keep watching the old one.

**Suggestion:** hang the manager off the registry instance (`registry.plugins`), attach bridges lazily on first flush (or iterate existing instances at install time via `getTypes` + `getInstancesMap`), and document install-early expectations.

## A5 · Registry encapsulation leaks

- `getInstancesMap` returns the **live** internal `Map` ("public API for stats/debugging", `StateContainerRegistry.ts:145-149`) — callers can corrupt refs/entries; and it returns a throwaway empty `Map` on miss, so mutations are inconsistently observed. Return `ReadonlyMap` (type) and/or a copy.
- `InstanceEntry` (with mutable `refs`) is exported from the barrel.
- `getBlacConfig`/`resetBlacConfig` are `@internal`-tagged but exported from the public barrel (`index.ts:2-9`).
- `APPLY_DEPS`/`REMOVE_DEPS_OWNER`/`INIT_CONFIG` are exported from the main entry for `@blac/react` — an `/internal` subpath would keep them out of app autocomplete.

## A6 · `useBloc` is doing five jobs in one 700-line hook

Identity resolution, ownership (acquire/release), primary subscription, snapshot/tracking, and the cross-bloc dep session are interleaved in one function with 10 refs. The dep-session machinery (`makeDepWrapper` + reconcile + unmount sweep) is ~40% of the file and touches every other concern's refs. Extracting (a) an ownership hook (`useAcquiredInstance(BlocClass, args)` — where R3/R4's fix lives), and (b) a `DepSession` class owning `sessionRef`/`depSubsRef`/`perDep`/wrapper-cache with `beginRender()/commit()/destroy()` methods, would make the invariants ("acquire once per dep", "release exactly what you acquired") locally checkable instead of spread across three effects and a closure.

## A7 · Registry facade duplication

`registry/*.ts` are eight files of one-liner wrappers that each re-derive `resolveKey` and forward to the class; the class methods then have `@internal`-tier doc mirrors of the same text. That's three places (facade, class, docs) per operation to keep in sync — and they *are* drifting (`borrow` default key docs vs `resolveKey` sentinel; `release` arbitrary-ref semantics documented only on the class). Fine to keep the args-based facade as *the* public API, but the class tier could stop being exported (see D-list) which would let the facade docs be the single story.

## A8 · Dev-only guards are inconsistent about prod behavior

- Instance/ref circuit breakers **throw in production** (`assertInstanceLimit`/`assertRefLimit` — no NODE_ENV gate). A false positive (legit 1000-item dynamic-args list screen) is a prod crash; the docs frame them as leak guards, which reads dev-only. Either gate the throw to dev + warn in prod, or document loudly that these are prod limits and size defaults accordingly.
- Emit-rate breaker is dev-only and warns (fine), args-mismatch warn is dev-only (fine) — the asymmetry with the throwing breakers is surprising.

## A9 · Repo/package hygiene

- Stray empty directory tree `packages/blac-core/packages/blac/` (committed?) — remove.
- `packages/blac-core/reports/` and `.DS_Store` in both packages — not published (`files: [dist,…]`) but clutter; `.DS_Store` should be git-ignored globally.
- `blac-core` `main`/`module`/`types` top-level fields duplicate the `exports` map (harmless, but `typesVersions` + `exports` + top-level is three type-resolution paths to keep aligned).
