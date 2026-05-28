# C3 — Rewire `watch()` and delete `tracked()` + `tracking/` directory

**Phase:** C (parallel after C0; safe alongside C1, C2, C4)
**Model:** Sonnet 4.6
**Effort:** medium (deletion is mechanical; `watch()` rewire is small)
**Estimated touch:** ~12 files (mostly deletions)

---

## Goal

Per Decisions 4 + 5 in the README:

- **`watch(BlocClass, callback)`** stays — re-implemented as a thin wrapper around `container.subscribe(ALL_PATHS, ...)`. Same signature.
- **`tracked()`** standalone API and the entire `tracking/` directory are **deleted**. `trackRender` in `@dirtytalk/structural` covers all use cases. The audit (A2) confirms no out-of-tree consumer.

---

## Inputs — read these first

1. `packages/blac-core/src/watch/index.ts`, `watch.ts`, `watch.test.ts`, `watch.edge-cases.test.ts`.
2. `packages/blac-core/src/watch-entry.ts` — top-level re-export.
3. `packages/blac-core/src/tracking/` — full directory (to be deleted).
4. `packages/blac-core/src/tracking.ts` — top-level re-export file (to be deleted).
5. `packages/blac-core/src/core/StateContainer.ts` (after C0) — for the new `subscribe(interest, cb)` shape.
6. `plans/blac-core-migration/_audit.md` — confirms no caller uses `tracked()` outside this package.
7. `~/.claude/CLAUDE.md` — commit format.

---

## Spec

### New `watch.ts`

```ts
import { ALL_PATHS } from '@dirtytalk/structural';
import { acquire, release } from '../registry';
import type { StateContainerConstructor, InstanceState } from '../types/utilities';

export type WatchFn<T extends StateContainerConstructor> = (
  state: InstanceState<T>['state'],
  bloc: InstanceState<T>,
) => void;

export interface BlocRef<T extends StateContainerConstructor> {
  unsubscribe(): void;
  bloc: InstanceState<T>;
}

export function watch<T extends StateContainerConstructor>(
  BlocClass: T,
  callback: WatchFn<T>,
): BlocRef<T> {
  const bloc = acquire(BlocClass);
  const unsub = bloc.subscribe(ALL_PATHS, () => callback(bloc.state, bloc));
  return {
    bloc,
    unsubscribe() {
      unsub();
      release(BlocClass);  // match acquire
    },
  };
}

export function instance<T extends StateContainerConstructor>(BlocClass: T): InstanceState<T> {
  return acquire(BlocClass);
}
```

Preserve the existing `BlocRef` shape and the `instance()` helper.

### Delete `tracking/`

The entire `packages/blac-core/src/tracking/` directory disappears in this commit. So does `packages/blac-core/src/tracking.ts`.

If you find a `re-export` from `tracking/` in `src/index.ts`, leave it for now — C0 owns the barrel. Just delete the source.

---

## Owned files (write set)

```
packages/blac-core/src/watch/index.ts
packages/blac-core/src/watch/watch.ts
packages/blac-core/src/watch/watch.test.ts
packages/blac-core/src/watch/watch.edge-cases.test.ts
packages/blac-core/src/watch-entry.ts
packages/blac-core/src/tracking/*                   (delete entirely)
packages/blac-core/src/tracking.ts                  (delete)
```

**Do not touch:** `src/index.ts` (C0 — but signal them via a TODO comment if there are dead re-exports), `core/*` (C0), `plugin/*` (C2), `registry/*` (C1), `decorators/*` (C4), `config.ts` (C4).

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - C0 has committed; `StateContainer.subscribe(interest, cb)` exists.
   - A2 audit doc confirms no `tracked()` caller outside this package.

2. **Implement.**
   - Rewrite `watch.ts` to the spec above.
   - Update `watch.test.ts` and `watch.edge-cases.test.ts` if any assertion peers into the old internals. Most tests should just work — they test behavior, not internals.
   - `rm -r packages/blac-core/src/tracking/`.
   - `rm packages/blac-core/src/tracking.ts`.
   - If `@blac/adapter` (slated for deletion in E0) imports from `@blac/core/tracking`, do not edit adapter — E0 deletes the whole package. Just verify nothing else in the workspace imports `@blac/core/tracking` post your deletion. If anything does, **stop and report** — the audit missed it.

3. **Verify.**
   - `vp run typecheck` from `packages/blac-core/`.
   - `vp run lint`.
   - `vp run format:check`.
   - `rg "@blac/core/tracking" --type ts` from repo root — should return only `@blac/adapter` (which dies in E0) and maybe `_audit.md`.

4. **Test.**
   - `vp run test src/watch/` — green.

5. **Commit.**

   ```
   refactor(blac-core)!: rewire watch on channel; remove tracked() + tracking/
   ```

   Body:
   ```
   - watch() now wraps container.subscribe(ALL_PATHS, ...). Signature unchanged.
   - tracked() standalone API removed; trackRender from @dirtytalk/structural
     covers all use cases (audit at plans/blac-core-migration/_audit.md
     confirms no out-of-tree consumer).
   - src/tracking/ directory deleted (~N files, ~M lines).
   ```

---

## Acceptance criteria

- [ ] `src/tracking/` and `src/tracking.ts` do not exist.
- [ ] `watch()` keeps its signature; tests pass.
- [ ] `instance()` keeps its signature.
- [ ] `rg "@blac/core/tracking"` returns no live imports (the adapter is allowed to still import; it dies in E0).
- [ ] No new test failures introduced.

---

## Pitfalls

- **`watch()` cleanup.** `release(BlocClass)` decrements the registry refcount. Without it, the bloc never disposes after the last `unsubscribe()`. Don't forget.
- **`acquire` may return `undefined`** for some bloc types in edge cases — check the registry contract. Wrap with null-check if needed.
- **`subscribe(ALL_PATHS, cb)`** doesn't pass state to `cb`. Read `bloc.state` inside the callback. Don't try to extract state from the structural callback args.
- **Single-consumer skip.** With `watch()` as the only consumer, structural's diff short-circuits to `ALL_PATHS`. That's fine — `watch` doesn't filter, it just observes.
- **Don't delete `watch-entry.ts`** unless the barrel never imported from it. C0 owns the barrel, so leave the file but update its body to re-export from `./watch/index.ts` (or whatever the new path is).
- **Audit truth check.** If the audit (A2) shows `tracked()` is used anywhere outside `tracking/`, **stop and report**. Don't proceed with the delete.
