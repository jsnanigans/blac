# Task 03 — React: per-consumer session, handle wrapper, reconcile

- **Package**: `@blac/react` (`packages/blac-react`)
- **Model**: **Opus 4.8** — **thinking effort: high** (stateful, concurrency-sensitive; the genuinely hard task)
- **Depends on**: Task 01 (DepHandle/`DEP_BRAND` in core) **and** Task 02 (`buildTrackedProxy`) — both committed
- **Parallel-safe with**: none
- **Read first**: `plans/cross-bloc-tracking/README.md`, then `01-core-dep-handle.md` + `02-react-extract-proxy.md` for the shapes they produced

## Goal

Make `this.<depHandle>.track()` inside a getter, when read during a consumer's
render, (a) record path interest against the dep's container, (b) subscribe the
consumer to the dep's channel, (c) take a refcount on the dep, and (d) return a
**tracked state + tracked instance proxy** so the dep's own getters track too.
Reconcile the dep set every render; release on unmount.

This flips every `[GAP]` test in `useBloc.cross-bloc-getter-tracking.test.tsx`.

## Files

- `packages/blac-react/src/useBloc.ts` (main work)
- possibly `packages/blac-react/src/buildTrackedProxy.ts` (only if you need to
  add handle-interception to `thisProxy` — keep it parameterized, no core import cycle)

## Design

### 1. Per-consumer session
Add a ref: `sessionRef = useRef<Map<StateContainer, { paths: PathSet; trackingProxy: unknown }>>(new Map())`.
Cleared/rebuilt at the **start of each render** (in the snapshot section, same
place `trackRender` runs for the primary bloc). The primary bloc is just the
first entry — register it into the session too, so the reconcile loop is uniform.

### 2. `thisProxy` detects dep handles
Extend the `thisProxy` get trap (from `buildTrackedProxy`) so that when a read
returns a value carrying `DEP_BRAND`, it returns a **per-consumer wrapper** for
that handle (cache wrappers in a `Map<DepHandle, Wrapped>` in the memo to avoid
re-alloc). The wrapper:
- is itself callable → delegates to the original `handle()` (live instance, back-compat);
- `.track()`:
  - resolve dep via `handle[DEP_BRAND]` (`{Type, key, args}`) using the registry;
  - **if session armed** (`trackedStateRef.current != null`, i.e. inside render):
    - `acquire(Type, key, {canCreate:true, countRef:true, refId: \`useBloc@${consumerId}:dep\`, args})` if not already ref'd this consumer (track which deps we hold a ref for so unmount releases exactly once);
    - `const t = trackRender(dep.state, dep.interner)`;
    - merge `t.paths` into the session entry for `dep` (union if `.track()` called twice);
    - build/reuse `buildTrackedProxy(dep, depTrackedStateRef)` and set
      `depTrackedStateRef.current = t.value` so the dep's getters read the tracked
      state; store the dep's tracking proxy in the session entry;
    - return `[t.value, depProxy]`;
  - **else** (not in render): return `[dep.state, dep]` live (matches core base).

To thread the session into the wrapper, `buildTrackedProxy` should accept an
optional `onDepHandle?(handle): wrapped` callback (or expose `thisProxy` and let
`useBloc` install the trap). Keep core decoupled — detection is by the
`DEP_BRAND` symbol imported from `@blac/core`.

### 3. Reconcile (generalize the existing layout effect, ~347-365)
Today the layout effect registers ONE container's paths + builds
`expandedInterestRef`. Generalize:
- For **every** container in `sessionRef.current`: `registerConsumerPaths(consumerId, paths)` and compute its expanded interest.
- Maintain a `Map<container, unsubscribe>` of active channel subscriptions in a
  ref. Diff the new session container set vs the previous:
  - new container → `channel.subscribe(() => interestForThatContainer, force)`;
  - dropped container → unsubscribe, `unregisterConsumer`, and `release` its ref;
  - surviving container → update its interest (the subscribe closure should read
    a per-container interest ref so it stays fresh, mirroring `expandedInterestRef`).
- The primary bloc's existing single subscription (the `useEffect` ~232-283)
  should be folded into this per-container map, OR kept for the primary and the
  reconcile only manages *deps* — choose the simpler correct option, but the
  primary must keep working identically. Prefer: keep the primary's existing
  effect untouched and have the reconcile manage **dep** containers only. This
  minimizes risk to the primary path.

### 4. Unmount
On unmount: unsubscribe all dep channels, `unregisterConsumer` for each,
`release` every dep ref held (`refId` `useBloc@${consumerId}:dep`). Must be
idempotent and exactly-once per ref.

## Concurrency / correctness notes

- The session is per-consumer (lives in this hook's refs) — no global ambient
  state, so sibling renders cannot cross-contaminate.
- `.track()` only records when `trackedStateRef.current != null`. That window is
  render-body → layout-effect (same as the primary bloc), so reads in event
  handlers/effects fall through to live values — desirable.
- **Conditional deps**: a getter that calls `.track()` only on some renders must
  cause the dep to be unsubscribed + released when it stops being tracked. The
  per-render rebuild of `sessionRef` + the diff handles this.
- **Mutual deps (A↔B)**: subscriptions both ways just mean both wake on either
  change; coalesced per tick by the channel; re-render reads, never emits → no
  infinite loop. Add a guard against a dep `trackRender`-ing itself recursively
  (don't re-enter tracking for a container already being tracked this render).
- Do not break `select` mode (it stays primary-only, ALL_PATHS).

## Verify

```fish
cd packages/blac-react
pnpm typecheck
pnpm exec vp lint src
pnpm exec vp fmt "." --check
# The spec: GAP tests must now pass. Run the whole cross-bloc set + tracking suites.
pnpm exec vp test run src/__tests__/useBloc.cross-bloc-getter-tracking.test.tsx
pnpm exec vp test run src/__tests__/useBloc.cross-bloc-react.test.tsx
pnpm exec vp test run src/__tests__/useBloc.cross-bloc-edge-cases.test.tsx
pnpm exec vp test run src/__tests__/useBloc.proxyTracking.test.tsx
pnpm exec vp test run src/__tests__/useBloc.getter-tracking.test.tsx
```
Note: the `[GAP]` assertions in `useBloc.cross-bloc-getter-tracking.test.tsx`
will now FAIL (they assert stale behavior). Task 04 rewrites them. For THIS
task, it is acceptable to update only the `[GAP]` assertions to the new
behavior inline (so your commit is green), OR leave them and document the
expected failures for Task 04 — **preferred: flip them here** so your commit is
green, and Task 04 expands coverage.

## Commit

```
feat(blac-react): auto-track cross-bloc deps via depHandle.track()
```

## Done when

- All listed suites green (with `[GAP]` flipped to the new reactive behavior).
- No regression in primary-bloc tracking, select mode, unmount/refcount.
- typecheck/lint/format clean.
