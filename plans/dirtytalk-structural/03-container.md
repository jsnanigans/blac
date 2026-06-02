# 03 — `StructuralContainer<S>` (the keystone)

**Phase:** 3 (sequential — runs after **all** Phase 2 commits land)
**Model:** Opus 4.7
**Effort:** high (state machine; scheduler injection; consumer registry; skeleton invariants; single-consumer skip)
**Estimated touch:** 3 files (impl + tests + barrel update)

---

## Goal

Implement `StructuralContainer<S>` — the base class consumers extend to model a unit of state. It owns:

1. Current state `_state: S`.
2. A `DirtyChannel<PathSet>` with the package's chosen `Scheduler` (default `MicrotaskScheduler`, overrideable via options).
3. A `PathInterner` (per-instance for now; "per-class" optimisation is a follow-up — see Pitfalls).
4. A consumer registry: `Map<ConsumerId, PathSet>` plus a derived `observedSkeleton: PathSet`.
5. Mutation methods: `emit(next)`, `patch(partial)`, `update(fn)`.
6. Registration methods: `registerConsumerPaths`, `unregisterConsumer`.
7. A `subscribe(interest, cb)` pass-through on the underlying channel for non-tracker consumers (devtools, plugins, manual subscribers).

This is the cohesive surface that `useStructural` (Phase 4) and direct callers (manual subscribers, devtools) interact with.

---

## Inputs — read these first

1. `dirtytalk/03-blac.md` § "The observed skeleton" through § "Single-consumer skip" — full container behaviour spec.
2. `dirtytalk/03-blac.md` § "Microtask coalescing" — scheduler default + opt-out semantics.
3. `dirtytalk/03-blac.md` § "Decisions" #2 (multi-container ordering), #4 (cheap-equality fast-path in `registerConsumerPaths`), #5 (SSR with `SyncScheduler`).
4. `packages/dirtytalk-engine/src/dirty-channel.ts` and `src/scheduler.ts` — the engine surface you'll instantiate.
5. `packages/dirtytalk-structural/src/path-interner.ts`, `path-set.ts`, `tracker.ts`, `diff.ts` — the dependencies.
6. `packages/dirtytalk-structural/src/container.ts` — current stub.
7. `~/.claude/CLAUDE.md` — commit format.

---

## Owned files (write set)

```
packages/dirtytalk-structural/src/container.ts        (replace stub body)
packages/dirtytalk-structural/src/container.test.ts   (create)
packages/dirtytalk-structural/src/index.ts            (barrel — extend with new exports)
```

**Do not touch:** `path-interner.ts`, `path-set.ts`, `tracker.ts`, `diff.ts`, `react-hook.ts`, `react.ts`, `types.ts`, configs.

Verify before starting: every Phase 1 + Phase 2 source file is free of `"not implemented"`. If any contains it, **stop and report**.

---

## Spec

### Options

```ts
import type { Scheduler } from '@dirtytalk/engine';

export interface StructuralContainerOptions {
  /**
   * Scheduler for the underlying DirtyChannel.
   * Default: a fresh MicrotaskScheduler per instance.
   * Tests and SSR should pass SyncScheduler.
   */
  scheduler?: Scheduler;

  /**
   * Per-path-pattern equality override. Reserved for v1 — accepted but stored
   * verbatim. Concrete pattern matching is deferred to a follow-up; for now,
   * a caller can provide a function and it will be passed through to
   * diffAlongSkeleton's `equalsAt` hook as a stable PathId-keyed Map lookup.
   */
  equality?: ReadonlyMap<string, (a: unknown, b: unknown) => boolean>;
}
```

The `equality` field is plumbed but its full semantics (path-pattern matching, glob support, etc.) are a follow-up. In v1, the keys are **exact path strings**; the container converts them to `PathId` keys at construction by interning each.

### Class shape

```ts
export abstract class StructuralContainer<S> {
  private readonly _interner = new PathInterner();
  private readonly _channel: DirtyChannel<PathSet>;
  private readonly _consumerPaths = new Map<ConsumerId, PathSet>();
  private _state: S;
  private _skeleton: PathSet = emptyPathSet();
  private readonly _equalsByPathId: Map<PathId, (a: unknown, b: unknown) => boolean>;

  constructor(initial: S, options: StructuralContainerOptions = {}) {
    this._state = initial;
    const scheduler = options.scheduler ?? new MicrotaskScheduler();
    this._channel = new DirtyChannel(PathSetSpace, scheduler);
    this._equalsByPathId = new Map();
    if (options.equality) {
      for (const [path, eq] of options.equality) {
        this._equalsByPathId.set(this._interner.intern(path), eq);
      }
    }
  }

  // Reads
  get state(): S { return this._state; }
  get interner(): PathInterner { return this._interner; }
  get channel(): DirtyChannel<PathSet> { return this._channel; }
  get consumerCount(): number { return this._consumerPaths.size; }

  // Mutations
  emit(next: S): void { … }
  patch(partial: Partial<S>): void { … }
  update(fn: (state: S) => S): void { this.emit(fn(this._state)); }

  // Subscription helpers
  subscribe(
    interest: () => PathSet,
    cb: (dirty: PathSet) => void,
  ): () => void {
    return this._channel.subscribe(interest, cb);
  }

  registerConsumerPaths(id: ConsumerId, paths: PathSet): void { … }
  unregisterConsumer(id: ConsumerId): void { … }
}
```

### `emit(next)` behaviour

```ts
emit(next: S): void {
  if (this._state === next) return;            // reference-equal short-circuit
  const prev = this._state;
  this._state = next;

  let dirty: PathSet;
  if (this._consumerPaths.size <= 1) {
    dirty = ALL_PATHS;                          // single-consumer skip
  } else {
    dirty = diffAlongSkeleton(
      prev,
      next,
      this._skeleton,
      this._interner,
      this._equalsByPathId.size === 0
        ? undefined
        : (id, a, b) => {
            const eq = this._equalsByPathId.get(id);
            return eq ? eq(a, b) : Object.is(a, b);
          },
    );
  }
  this._channel.mark(dirty);
}
```

### `patch(partial)` behaviour

```ts
patch(partial: Partial<S>): void {
  const paths = pathsFromPatch(partial, this._interner);
  this._state = deepMerge(this._state, partial);  // see "deepMerge" below
  this._channel.mark(paths);
}
```

**`deepMerge` semantics:** plain-object branches merge recursively; arrays / class instances / primitives replace. This must match `pathsFromPatch`'s leaf/branch decision exactly. Implement `deepMerge` as a small private helper at the bottom of `container.ts` — do **not** factor it out to a separate module (it's only used here, and shares its leaf detection with `pathsFromPatch`).

**Why not share `isPlainPatchObject`?** It lives in `diff.ts`'s private scope. Duplicating the predicate locally is cheap and keeps the modules' surfaces clean. If a third call site ever needs it, factor at that point.

If `partial` is empty (`Object.keys(partial).length === 0`), short-circuit without marking.

### `registerConsumerPaths(id, paths)` behaviour

```ts
registerConsumerPaths(id: ConsumerId, paths: PathSet): void {
  const prev = this._consumerPaths.get(id);
  if (prev && pathSetEquals(prev, paths)) return;  // fast-path skip

  this._consumerPaths.set(id, paths);
  this._recomputeSkeleton();
}
```

The fast-path skip (Decision #4 in spec) avoids unnecessary skeleton recomputes when a consumer re-records identical paths.

### `unregisterConsumer(id)`

```ts
unregisterConsumer(id: ConsumerId): void {
  if (this._consumerPaths.delete(id)) this._recomputeSkeleton();
}
```

### `_recomputeSkeleton`

```ts
private _recomputeSkeleton(): void {
  let s: PathSet = emptyPathSet();
  for (const p of this._consumerPaths.values()) s = pathSetUnion(s, p);
  this._skeleton = s;
}
```

Full recompute on every register/unregister change is the v1 strategy (per spec's incremental-skip note: "premature; do the recompute version first"). Comment with `// O(consumers × paths); incremental update is a future optimisation`.

---

## Barrel update — `src/index.ts`

After implementing, extend `src/index.ts` to re-export the new public surface. Final shape:

```ts
// @dirtytalk/structural — core (no React)
export type { PathId, ConsumerId } from './types';
export { PathInterner } from './path-interner';
export {
  ALL_PATHS,
  emptyPathSet,
  pathSetUnion,
  pathSetEquals,
  PathSetSpace,
} from './path-set';
export type { PathSet, AllPaths } from './path-set';
export { trackRender } from './tracker';
export type { TrackResult } from './tracker';
export { diffAlongSkeleton, pathsFromPatch, getAt } from './diff';
export { StructuralContainer } from './container';
export type { StructuralContainerOptions } from './container';
```

This is the only opportunity in Phase 3 to touch the barrel. Phase 4 will add React-side exports to `react.ts`, not here.

---

## Tests — `src/container.test.ts`

Use `SyncScheduler` in tests so writes flush deterministically. Use a small concrete subclass:

```ts
class Counter extends StructuralContainer<{ count: number; label: string }> {}

const make = (initial = { count: 0, label: 'a' }) =>
  new Counter(initial, { scheduler: new SyncScheduler() });
```

Required cases:

1. **`state` reads the initial value.** Construct, read `c.state`.
2. **`emit` updates state and notifies single consumer (uses ALL_PATHS skip).** Subscribe with `() => new Set([interner.intern('count')])`. Emit a new state. Spy fires; received dirty includes the consumer's path (via ALL_PATHS).
3. **`emit` with reference-equal state is a no-op.** No mark, no notify.
4. **`patch` records dotted paths.** Patch `{ count: 1 }`; consumer interested in `'count'` fires. Consumer interested in `'label'` does NOT fire.
5. **`patch` nested.** Patch `{ user: { email: 'x' } }` on a state shaped `{ user: { email: 'a', name: 'n' } }`. Consumer of `'user'` fires; consumer of `'user.email'` fires; consumer of `'user.name'` does NOT fire.
6. **`patch` of an empty object is a no-op.**
7. **`update` is `emit` of `fn(state)`.** Verify by spy.
8. **Two consumers, only one matches** — emit changes only one path; only the interested consumer's cb runs.
9. **Single-consumer skip uses ALL_PATHS.** With exactly one consumer, an `emit` always wakes it regardless of whether the change overlaps the consumer's interest. Verify via a "consumer interested in a path that didn't change" test.
10. **Multi-consumer source-diff** — with two consumers, only consumers whose paths overlap the diff get notified.
11. **`registerConsumerPaths` fast-path skip** — re-register identical paths; mock `_recomputeSkeleton` (or observe via channel behaviour) to confirm it didn't recompute. Approach: register, snapshot `consumerCount` and behaviour; re-register identical paths; verify no marks were generated as a side effect.
12. **`unregisterConsumer` removes from skeleton** — register two; unregister one; the remaining consumer's paths are the new skeleton. Force a diff that would have matched the removed consumer's paths but not the remaining one; verify no fire.
13. **`equality` option override** — construct with `equality: new Map([['count', () => true]])`. Emit a real change to `count`; with two consumers (so source-diff fires), the consumer interested in `count` does NOT fire because the custom equality says "equal."
14. **MicrotaskScheduler is the default.** Construct without `scheduler`; verify the channel's scheduler instance is a `MicrotaskScheduler`. (Inspect via a side-channel: e.g., write `count` synchronously, then assert the spy hasn't fired yet; await a microtask; assert it has.)
15. **`subscribe` pass-through** — directly subscribing on the container bypasses tracker integration but receives the same dirty events.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - Phase 0, all Phase 1, all Phase 2 commits visible (`git log packages/dirtytalk-structural/ --oneline`).
   - `grep "not implemented" src/*.ts` returns empty (except `container.ts`, `react-hook.ts`, and `index.ts` if it still re-exports types only).

2. **Implement.** ~120 lines for `container.ts`. Update barrel last.

3. **Verify.** `vp run typecheck`, `vp run lint`, `vp run format:check`.

4. **Test.**
   - `vp run test src/container.test.ts` — your tests pass.
   - `vp run test` — full suite (all four modules) green.

5. **Commit.**

   ```
   feat(dirtytalk-structural): implement StructuralContainer
   ```

   Body (optional, but recommended for the keystone):

   ```
   Owns the state, channel, and consumer registry. Routes patch/emit/update
   through the path-flatten + skeleton-diff helpers. Single-consumer flows
   short-circuit to ALL_PATHS to avoid the diff cost.
   ```

   No co-author.

---

## Acceptance criteria

- [ ] `StructuralContainer` exported with the spec'd surface.
- [ ] All 15 test cases pass.
- [ ] `MicrotaskScheduler` is the default; `SyncScheduler` is accepted via options.
- [ ] `registerConsumerPaths` short-circuits when paths haven't changed.
- [ ] `consumerCount <= 1` triggers ALL_PATHS-marking (the single-consumer skip).
- [ ] `equality` map is consulted by the diff.
- [ ] `src/index.ts` barrel re-exports the new surface.
- [ ] `vp run {typecheck,lint,format:check,test,build}` green.
- [ ] No changes outside owned write set.

---

## Pitfalls

- **`PathInterner` per _instance_ in v1, not per _class_.** Spec calls for per-class for memory amortisation, but per-instance is simpler and avoids static-state mutation patterns that need careful lifetime handling. Document `// TODO: hoist to per-class for memory amortisation (see plans/.../README.md scope note)` in a single comment.
- **Don't try to make `subscribe` "smarter" than the channel.** It's a pass-through. The tracker-driven flow goes through `registerConsumerPaths` separately; `subscribe` is for manual/devtools/plugin use.
- **Don't use deep equality in `emit`'s reference check.** `Object.is(this._state, next)` is the contract — the caller passes a new immutable next; if they hand the same ref, we no-op.
- **`patch` must accumulate state mutations atomically.** Do the `deepMerge` _before_ the `mark`, so `state` is observably up-to-date when consumers receive the dirty notification.
- **Don't preserve old skeleton entries on `unregister`** by trying to subtract paths — full recompute is the v1 choice. The optimisation in spec § "Incremental option" is post-MVP.
- **`equality` map keys are intern'd at construction.** Don't intern lazily on each diff — that grows the interner with paths nobody actually reads.
- **Don't import `useState`, `useEffect`, or anything React** in `container.ts`. This module is framework-agnostic. The React hook lives in Phase 4.
- **Avoid `private #fields` (ECMAScript hash-private) vs `private` keyword.** Use TS `private` for now — `#fields` interact poorly with mocking in some test setups, and oxc may not yet have feature parity. Match the engine package's style.
- **Don't add a `dispose()` method.** Out of scope. The channel's unsubscribe + dropping the container reference is sufficient lifecycle.
- **Don't change the engine's behaviour by passing exotic schedulers.** The container is engine-agnostic _as far as scheduler choice goes_. If a caller wants a custom scheduler, they pass it via options.
