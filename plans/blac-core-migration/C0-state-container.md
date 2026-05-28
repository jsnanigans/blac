# C0 — Rewrite `StateContainer<S>` on top of `StructuralContainer<S>`

**Phase:** C0 (sequential — must commit before any C1/C2/C3/C4)
**Model:** Opus 4.7
**Effort:** high (keystone — touches every other Phase C task)
**Estimated touch:** 4 source files + barrel

---

## Goal

Replace `StateContainer<S>`'s internal change-detection machinery with `@dirtytalk/structural`. The class now **extends `StructuralContainer<S>`**, inheriting `emit`/`patch`/`update`/`registerConsumerPaths`/`unregisterConsumer`/`subscribe`, and layers blac-specific concerns on top: lifecycle events, hydration, `depend()` for cross-bloc subscriptions, `dispose()`, registry integration hooks.

`Cubit<S>` becomes a trivial subclass of `StateContainer<S>` (signature preserved). The `@internal` symbols `EMIT`, `APPLY_DEPS`, `REMOVE_DEPS_OWNER` get re-evaluated (see Pitfalls).

**This is the foundation for all subsequent Phase C / D agents.** Land it right.

---

## Inputs — read these first

1. `packages/blac-core/src/core/StateContainer.ts` (full file — ~600 lines).
2. `packages/blac-core/src/core/Cubit.ts`.
3. `packages/blac-core/src/core/symbols.ts`.
4. `packages/blac-core/src/core/StateContainerRegistry.ts` (signatures only — body owned by C1).
5. `packages/dirtytalk-structural/src/container.ts` — base class you're extending.
6. `packages/dirtytalk-structural/src/index.ts` — what's exported (after A1 + A3 land).
7. `dirtytalk/03-blac.md` §§ "Per-Bloc DirtyChannel", "depend()", "Hydration".
8. `plans/blac-core-migration/_audit.md` (from A2) — confirms which `@internal` symbols leak.
9. `plans/blac-core-migration/README.md` — the locked decision table.
10. `~/.claude/CLAUDE.md` — commit format.

---

## Spec

### Class shape

```ts
import { StructuralContainer } from '@dirtytalk/structural';

export abstract class StateContainer<S> extends StructuralContainer<S> {
  // Identity
  readonly name: string;
  readonly instanceId: string;
  protected readonly _debug: boolean;

  // Hydration state
  private _hydrationStatus: HydrationStatus = 'idle';
  protected _hydrationError?: Error;

  // Cross-bloc dependencies (depend())
  private _dependencies = new Map<StateContainerConstructor, StateContainer<any>>();
  private _dependents = new Set<StateContainer<any>>();

  // System event handlers
  private _systemHandlers: Map<SystemEvent, Set<Function>> = new Map();

  constructor(initial: S, config?: StateContainerConfig) {
    super(initial, { scheduler: /* injected — see Pitfalls */ });
    // wire identity, system handlers, registry hook (deferred — C1 owns it)
  }

  // Lifecycle
  dispose(): void { /* fire 'dispose', unsubscribe from deps, super-cleanup */ }
  get isDisposed(): boolean { ... }

  // System events (kept signatures)
  onSystemEvent<E extends SystemEvent>(event: E, handler: SystemEventHandler<S, E>): () => void { ... }

  // Cross-bloc dependencies
  protected depend<T extends StateContainerConstructor>(BlocClass: T): () => InstanceState<T> { ... }
  // returns a *getter* so callers write `this.user()` lazily
  // internally: registers the dependency in C1's registry, subscribes via channel.subscribe(ALL_PATHS, ...)

  // Hydration
  protected setHydrationStatus(next: HydrationStatus, error?: Error): void { ... }
  get hydrationStatus(): HydrationStatus { ... }
}
```

### What `super` gives you (do not reimplement)

- `state` getter, `emit`, `patch`, `update`.
- `interner` (per-class — A1 landed it).
- `registerConsumerPaths`, `unregisterConsumer`.
- `subscribe(interest, cb)` channel pass-through.

### What this class adds (in this commit)

- `name`, `instanceId`, `_debug`.
- `dispose()` + `isDisposed`.
- `onSystemEvent('stateChanged' | 'dispose' | 'hydrationChanged')`.
  - `stateChanged` fires **once per flush** (microtask-coalesced) per Decision 7. Use `subscribe(ALL_PATHS, ...)` internally with `prev`/`next` captured.
  - `dispose` fires synchronously inside `dispose()`.
  - `hydrationChanged` fires synchronously inside `setHydrationStatus`.
- `depend(BlocClass)` — registers a cross-bloc dependency, subscribes to the dep's channel, returns a getter for the dep's current state. Implementation skeleton:
  ```ts
  protected depend<T>(BlocClass: T): () => InstanceState<T> {
    const dep = /* C1 registry's acquire() */;
    this._dependencies.set(BlocClass, dep);
    dep._dependents.add(this);
    const unsub = dep.subscribe(ALL_PATHS, () => {
      // mark this container's full state dirty so consumers refresh
      this.emit(this.state); // or a finer per-path bridge if A2 audit shows it's needed
    });
    // dispose hook unsubs
    return () => dep as InstanceState<T>;
  }
  ```
- `setHydrationStatus` + `hydrationStatus`.
- The `@internal` `EMIT` symbol — **deleted**. `super.emit` is now public-equivalent. Adapter authors call `container.emit(next)` directly.
- `APPLY_DEPS` / `REMOVE_DEPS_OWNER` — **kept for now** as protected method aliases on `StateContainer`. C1 may move them into the registry. Coordinate with C1 before deleting.

### Scheduler injection

`StructuralContainer` accepts a `scheduler` option. For backward-compat with `configureBlac({ scheduler: ... })` (if such an option exists today — verify via audit), wire the global config through. Otherwise default to `MicrotaskScheduler` per Decision 7.

If no global scheduler config exists today, **don't add one**. Tests can inject `SyncScheduler` via constructor options.

### `Cubit<S>`

```ts
export abstract class Cubit<S> extends StateContainer<S> {
  // Cubit currently has no additional methods beyond what StateContainer provides.
  // Verify against current source. If it adds methods, port them.
}
```

If `Cubit` is structurally identical to `StateContainer`, consider whether to keep it as an alias-only class or delete it (audit will tell you what depends on the `Cubit` name). **Default: keep.**

### Barrel update (`packages/blac-core/src/index.ts`)

- Remove: `EMIT` re-export. Tracking module re-exports (those die in C3).
- Keep: `StateContainer`, `Cubit`, `APPLY_DEPS`, `REMOVE_DEPS_OWNER` (until C1 decides), `HydrationStatus`, `StateContainerConfig`, `SystemEvent`, `SystemEventPayloads`.
- Re-export from `@dirtytalk/structural` selectively if downstream packages need them (likely just `ALL_PATHS` and `PathSet` for plugins).

---

## Owned files (write set)

```
packages/blac-core/src/core/StateContainer.ts
packages/blac-core/src/core/Cubit.ts
packages/blac-core/src/core/symbols.ts                    (likely shrinks to one or two symbols)
packages/blac-core/src/index.ts                           (barrel update — careful coordination with C3/C4)
packages/blac-core/src/core/StateContainerRegistry.ts     (signatures only — leave body to C1)
```

**Coordination with parallel agents:**
- C1 (registry) reads the `StateContainerRegistry.ts` shape you leave. Don't change its public method signatures without coordination.
- C2 (plugin system) reads `SystemEvent` shape. If you change it, document the change in this commit.
- C3 (watch+tracked) deletes `tracking/`. Don't import from `tracking/` in your rewrite.
- C4 (decorator+config) reads `configureBlac` shape. If you wire scheduler through it, communicate via a TODO comment.

**Do not touch:** `package.json`, `tsconfig*.json`, plugin directory, watch directory, tracking directory (C3 deletes it), decorator directory, registry/* (the registry directory under `registry/`, *not* the registry class — different things; C1 owns the `registry/` dir).

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - A0, A1, A3 are committed; the per-class interner is live in structural; `vp install` succeeds.
   - A2 audit doc exists at `plans/blac-core-migration/_audit.md`. If it does not exist, stop and report — you need it to make symbol-deletion decisions.
   - `packages/dirtytalk-structural/dist/` is up to date (`vp run build` from that package if not).

2. **Implement.** Follow the spec above. Order:
   1. Rewrite class body to extend `StructuralContainer`.
   2. Port lifecycle (`dispose`, `isDisposed`).
   3. Port system events (`onSystemEvent` — wire to channel for `stateChanged`).
   4. Port `depend()`.
   5. Port hydration.
   6. Update `Cubit` if it needed changes.
   7. Update `symbols.ts` — delete `EMIT`, keep what's still needed.
   8. Update `src/index.ts` barrel — remove dead exports.

3. **Verify.**
   - `vp run typecheck` from `packages/blac-core/`. Expect failures in `tracking/` files — that's fine, C3 deletes them. **Workaround**: leave `tracking/*` untouched if it currently typechecks. If your rewrite breaks it, add `// @ts-nocheck` to the top of each tracking file and note "removed by C3" — C3 will delete entirely.
   - `vp run lint`.
   - `vp run format:check`.

4. **Test.**
   - **C5 owns the full test port.** For this commit, run only the tests that *don't* depend on tracking internals:
     - `vp run test src/core/StateContainer.init.test.ts`
     - `vp run test src/core/StateContainer.disposal.test.ts`
     - `vp run test src/core/StateContainer.lifecycle-events.test.ts`
     - `vp run test src/core/StateContainer.depend.test.ts`
   - Acceptable for `vp run test` (full) to have failures — log them in the commit message body for C5 to address.

5. **Commit.**

   ```
   refactor(blac-core): rewrite StateContainer on top of StructuralContainer
   ```

   Body (required — this is the keystone):
   ```
   - StateContainer<S> now extends StructuralContainer<S>
   - emit / patch / update inherited from structural
   - System events wired to DirtyChannel subscriptions
   - depend() unchanged surface; uses ALL_PATHS interest
   - EMIT internal symbol deleted; super.emit() is the new contract
   - Failing tests (deferred to C5): <list>
   ```

---

## Acceptance criteria

- [ ] `class StateContainer<S> extends StructuralContainer<S>` — verified in the diff.
- [ ] All public method signatures from the old `StateContainer` either preserved or documented as changed in the commit body.
- [ ] `dispose()` fires `'dispose'` event and unsubscribes from cross-bloc deps.
- [ ] `onSystemEvent('stateChanged')` fires once per microtask flush (verified by a test in C5; verify the wiring path is correct here).
- [ ] `depend()` returns a getter; the getter returns the current state of the dep on each call.
- [ ] `vp run typecheck` passes (with `tracking/` either still working or `@ts-nocheck`'d).
- [ ] `index.ts` barrel reflects the actual exports — no dead re-exports.

---

## Pitfalls

- **`super.emit` and listeners.** `StructuralContainer.emit` schedules a flush via the channel. The old `StateContainer.emit` synchronously notified listeners. Your `onSystemEvent('stateChanged')` handler must run **after** the flush, not on the emit call. Wire it via `subscribe(ALL_PATHS, cb)`.
- **`isDisposed`** — structural doesn't expose this concept. Add it as a private field flipped in `dispose()`. Tests heavily rely on it.
- **Test isolation under per-class interner.** Tests that create ad-hoc subclasses get fresh interners — good. Tests that re-import the same class across files share the interner — also good. Tests that *clear* state between cases via mutation may be surprised. C5 deals with this; you just need to leave the path clean.
- **`depend()` recursion.** `dep.subscribe(...)` callback calls `this.emit(this.state)`, which schedules another flush. If two blocs `depend()` on each other, this can loop. The structural channel coalesces same-tick emits to one flush, so a single-loop is fine; a true cycle is a user bug. Document the limitation in a code comment; don't add cycle detection.
- **`APPLY_DEPS` / `REMOVE_DEPS_OWNER`.** These are read by `@blac/react` (and `@blac/adapter`, which dies in E0). The audit will tell you. **Don't delete them in this commit** even if you think you can — wait for D0 to confirm the new `useBloc` doesn't need them.
- **Symbol identity** — if you keep `APPLY_DEPS` etc., re-export the *same Symbol* from `core/symbols.ts`. Re-creating the symbol breaks identity-based dispatch.
- **`Cubit` ABI.** Some callers do `instance instanceof Cubit`. Keep `Cubit` a real class (not a type alias) even if it adds nothing structurally.
- **Scheduler config.** Don't add a global `configureBlac({ scheduler })` knob unless the audit shows callers need it. Per-instance via constructor options is enough.
- **Hydration in StrictMode.** If `setHydrationStatus` fires during construction in StrictMode's double-invoke, the second instance gets a fresh `_hydrationStatus` field — that's fine. Just don't share it across instances via a static.
