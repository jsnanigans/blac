# C1 — Port `StateContainerRegistry` + `registry/` to the new container

**Phase:** C (parallel after C0; safe alongside C2, C3, C4)
**Model:** Sonnet 4.6
**Effort:** medium (registry surface is large; semantics must be preserved exactly)
**Estimated touch:** ~10 files

---

## Goal

`@blac/core`'s registry (`acquire`/`borrow`/`release`/`ensure`/`register`/etc., plus `StateContainerRegistry` class) provides instance-identity, refcounting, and lifecycle events to consumers like `useBloc` and plugins. C0 changed `StateContainer`'s internals but **deliberately left registry behavior untouched**.

This task verifies and updates the registry surface so it still works correctly with the new container, and makes any small adjustments needed for the per-class interner (A1) and the channel-based subscription model.

**This is mostly a verification + targeted-fix task, not a rewrite.** The registry's job is orthogonal to dirty-tracking.

---

## Inputs — read these first

1. `packages/blac-core/src/registry/index.ts` — what's exported.
2. `packages/blac-core/src/registry/{acquire,borrow,release,ensure,management,queries,config}.ts` — implementation files.
3. `packages/blac-core/src/core/StateContainerRegistry.ts` — the class (signatures locked by C0, body owned here).
4. `packages/blac-core/src/core/StateContainer.ts` — the rewritten container (C0's commit).
5. `packages/blac-core/src/core/__tests__/StateContainerRegistry.*.test.ts` — existing registry tests.
6. `plans/blac-core-migration/_audit.md` — registry consumers.
7. `~/.claude/CLAUDE.md` — commit format.

---

## What likely needs changing

The registry's public surface (acquire/borrow/release/etc.) should remain compatible. Internal changes needed:

1. **Lifecycle event hooks.** `StateContainerRegistry` fires `'created'`/`'destroyed'` lifecycle events. C0's `StateContainer.dispose()` semantics may have shifted slightly; verify the destroyed-event timing.
2. **Circuit breakers.** Today's emit-rate circuit breakers (under `StateContainerRegistry.circuit-breaker.test.ts`) protected against runaway emits. The microtask scheduler in structural already coalesces. **Delete the circuit-breaker code** unless tests show it still protects against something the scheduler doesn't catch.
3. **`getPluginManager` exposure.** C2 owns plugins, but the manager singleton lives off the registry. Coordinate with C2 — keep `getPluginManager` exported from registry; C2 changes the manager's internals.
4. **Per-class interner registry**. Structural's interner is per-class via `WeakMap<Function, PathInterner>`. If `StateContainerRegistry` tracks per-class registry-wide state (e.g. instance counts), make sure it doesn't collide with the interner registry — they're separate concerns and should stay so.

---

## Owned files (write set)

```
packages/blac-core/src/registry/**
packages/blac-core/src/core/StateContainerRegistry.ts     (body — C0 left signatures locked)
```

**Do not touch:** `core/StateContainer.ts` (C0), `core/Cubit.ts` (C0), `core/symbols.ts` (C0), plugin/_ (C2), watch/_ (C3), tracking/_ (C3 deletes), decorators/_ (C4), `src/index.ts` (C0/C5 own).

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - C0 has committed (`git log` shows `refactor(blac-core): rewrite StateContainer ...`).
   - `vp run typecheck` from `packages/blac-core/` passes (or only fails inside `tracking/` which C3 will delete).

2. **Implement.**
   - Read all registry files end-to-end. Note any direct access to `StateContainer` internals that C0 removed (e.g. `instance._listeners` — if these exist, replace with the new `subscribe`/`channel` API).
   - Decide on circuit breakers: delete or keep. If delete, delete `StateContainerRegistry.circuit-breaker.test.ts` too.
   - Keep `acquire`, `borrow`, `borrowSafe`, `ensure`, `release`, `clear`, `clearAll`, `register`, `hasInstance`, `getRefCount`, `getRefIds`, `getAll`, `forEach`, `getRegistry`, `setRegistry`, `getStats` — all preserved unless audit says no consumer uses them.
   - `LifecycleEvent`, `LifecycleListener`, `InstanceEntry` types preserved.

3. **Verify.**
   - `vp run typecheck` from `packages/blac-core/`.
   - `vp run lint`.
   - `vp run format:check`.

4. **Test.**
   - `vp run test src/core/__tests__/StateContainerRegistry.*.test.ts` — all green.
   - `vp run test src/core/__tests__/StateContainer.registry.test.ts` — green.
   - `vp run test src/registry/` if it has its own tests.
   - **Don't** run the full suite — C5 will. Local files only.

5. **Commit.**

   ```
   refactor(blac-core): port registry to new StateContainer
   ```

   Body (if circuit breaker removed):

   ```
   - Circuit-breaker emit-rate guard removed; MicrotaskScheduler coalesces.
   - Lifecycle event timing unchanged.
   - Public surface preserved.
   ```

---

## Acceptance criteria

- [ ] All registry public exports still resolve.
- [ ] Lifecycle events (`created`, `destroyed`) fire at the expected times.
- [ ] Refcount semantics unchanged (last `release` triggers `dispose`).
- [ ] Per-class interner does not interact with registry refcount.
- [ ] All registry tests pass.

---

## Pitfalls

- **Listener subscription model.** Old `StateContainer` exposed direct `subscribe(listener)`. New one exposes `subscribe(interest, cb)`. If the registry used the old form, port to `subscribe(ALL_PATHS, cb)`. Search for `instance.subscribe(` in registry files.
- **Circuit breaker removal**. The circuit breaker test was about a real production incident (see memory: `[[project_circuit_breakers]]` — emit storms freezing the app). The microtask scheduler coalesces synchronous bursts but does NOT protect against pathological recursive emit loops. Before deleting, confirm: a test like `for (let i = 0; i < 1e6; i++) cubit.emit({...})` still terminates and doesn't hang. If it doesn't, **keep** circuit breaker.
- **`getPluginManager` ownership.** C2 changes plugin internals; keep `getPluginManager` exported from `StateContainerRegistry` for compat.
- **`globalRegistry` singleton.** Tests reset it between cases via `getRegistry()`/`setRegistry()`. Preserve this exact contract — search the existing tests for usage patterns.
- **Don't touch `src/index.ts`** — C0 owns the barrel update, C5 will reconcile at the end.
