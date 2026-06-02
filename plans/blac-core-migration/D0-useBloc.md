# D0 — Rewrite `useBloc` on top of `useStructural`

**Phase:** D0 (sequential — runs after C5 commits)
**Model:** Opus 4.7
**Effort:** high (React adapter subtleties: StrictMode, `select`, registry acquire/release, dispose ordering)
**Estimated touch:** 3 files

---

## Goal

Replace `@blac/react`'s current `useBloc` (built on `useSyncExternalStore` + `@blac/adapter`'s tracker) with a thin layer over `@dirtytalk/structural`'s `useStructural`. The hook keeps its outward contract but:

- Loses the `dependencies` option (Decision 8) — replaced by `select`.
- Gains `select(state, bloc) => any[]` per Decision 3.
- No longer imports anything from `@blac/adapter` (E0 deletes it).
- Adds registry acquire/release lifecycle.
- Honors `BlocProvider` context for `instanceId` (Decision 9).

---

## Inputs — read these first

1. `packages/blac-react/src/useBloc.ts` — current implementation.
2. `packages/blac-react/src/types.ts`.
3. `packages/blac-react/src/config.ts`.
4. `packages/blac-react/src/BlocProvider.tsx`.
5. `packages/dirtytalk-structural/src/react-hook.ts` — the base `useStructural`.
6. `packages/blac-core/src/core/StateContainer.ts` (after C0).
7. `packages/blac-core/src/registry/index.ts` — `acquire`/`release`/`borrow`.
8. `plans/blac-core-migration/_audit.md` — `useBloc` callsites.
9. `plans/blac-core-migration/README.md` — Decision table.
10. `~/.claude/CLAUDE.md` — commit format.

---

## Spec

### New `useBloc` shape

```ts
import { useStructural } from '@dirtytalk/structural/react';
import { useEffect, useId, useMemo } from 'react';
import { acquire, release } from '@blac/core';
import { useInstanceIdFromContext } from './BlocProvider';

export interface UseBlocOptions<TBloc, TState> {
  /** Per-consumer selection — replaces `dependencies`. Optional. */
  select?: (state: TState, bloc: TBloc) => unknown[];

  /** Args passed to acquire(); keys identity. */
  args?: unknown;

  /** Optional per-consumer instanceId override (also via BlocProvider context). */
  instanceId?: string;

  /** Optional mount/unmount hooks (preserved from old API). */
  onMount?: (bloc: TBloc) => void;
  onUnmount?: (bloc: TBloc) => void;
}

export type UseBlocReturn<TBloc, TState> = readonly [TState, TBloc];

export function useBloc<C extends StateContainerConstructor>(
  BlocClass: C,
  options?: UseBlocOptions<InstanceState<C>, ExtractState<C>>,
): UseBlocReturn<InstanceState<C>, ExtractState<C>> {
  const ctxInstanceId = useInstanceIdFromContext();
  const instanceId = options?.instanceId ?? ctxInstanceId;
  const args = options?.args;

  // Acquire is identity-stable per (BlocClass, instanceId, args).
  const bloc = useMemo(
    () => acquire(BlocClass, { instanceId, args }),
    [BlocClass, instanceId, /* deep-eq on args? — see Pitfalls */ args],
  );

  // Dispose hook (registry release on unmount).
  useEffect(() => {
    options?.onMount?.(bloc);
    return () => {
      options?.onUnmount?.(bloc);
      release(BlocClass, { instanceId, args });
    };
  }, [bloc]);

  // Delegate to useStructural for tracking + dirty-channel subscription.
  // Pass `select` through if provided.
  const [state, container] = useStructural(
    bloc,
    options?.select ? { select: options.select } : undefined,
  );

  return [state, container as InstanceState<C>] as const;
}
```

### `select` semantics

`useStructural` already supports a `select` option (per the structural plan). `useBloc` just forwards it. The hook re-renders when:

- `select` is **not** provided: auto-tracking via `trackRender` — any read path that changed triggers a re-render.
- `select` is provided: re-renders only when the returned array's elements change (Object.is per index). Equivalent to the old `dependencies`.

### `BlocProvider` integration

`BlocProvider` provides a per-tree `instanceId` so multiple subtrees can have isolated bloc instances. The provider component is unchanged in API (owned by D1) — the hook just reads its context via `useInstanceIdFromContext()`.

---

## Owned files (write set)

```
packages/blac-react/src/useBloc.ts
packages/blac-react/src/types.ts
packages/blac-react/src/config.ts
```

**Do not touch:** `BlocProvider.tsx` (D1), tests (D2), `src/index.ts` (D1 owns the React barrel).

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - C5 has committed. `vp run test` from `packages/blac-core/` is green.
   - `@dirtytalk/structural` `useStructural` is published in `dist/react.{js,d.ts}` (verify via `vp run build` from that package if doubtful).

2. **Implement.**
   - Rewrite `useBloc.ts` per the spec.
   - Update `types.ts` to remove `dependencies`, add `select`.
   - Update `config.ts` if it referenced `@blac/adapter` (it shouldn't — `@blac/adapter` is E0's problem).
   - Add JSDoc explaining the `select` migration from `dependencies`.

3. **Verify.**
   - `vp run typecheck` from `packages/blac-react/`.
   - `vp run lint`.
   - `vp run format:check`.

4. **Test.**
   - Tests are owned by D2 — don't fix them here, but **do run** them and capture the failure list in the commit body for D2.
   - `vp run test` from `packages/blac-react/`. Failures expected.

5. **Commit.**

   ```
   refactor(blac-react)!: rewrite useBloc on useStructural
   ```

   Body (required):

   ```
   - `dependencies` option removed; use `select` instead (per migration plan
     Decision 8). Codemod: rename `dependencies` -> `select`; verify return
     array.
   - No longer imports from @blac/adapter (deleted in E0).
   - Registry acquire/release lifecycle preserved.
   - BlocProvider context still drives instanceId.
   - Failing tests deferred to D2: <list>
   ```

---

## Acceptance criteria

- [ ] `useBloc` no longer imports from `@blac/adapter`.
- [ ] `select` option present in `UseBlocOptions`; `dependencies` removed.
- [ ] Registry `acquire` / `release` called at mount / unmount.
- [ ] `onMount` / `onUnmount` still fire.
- [ ] `BlocProvider` `instanceId` is honored.
- [ ] `vp run typecheck` from `packages/blac-react/` passes.

---

## Pitfalls

- **`useMemo` for acquire**. Recreating the bloc on every render would explode the registry. Memoize on `(BlocClass, instanceId, args)`. **But `args` is an object** — `useMemo`'s identity check is `Object.is`. If callers pass a fresh object literal each render, the memo busts. Use a stable JSON stringify for the dep, or document that `args` must be referentially stable.
- **`select` reference stability**. `useStructural` re-subscribes when `select` changes identity. If callers inline `select={(s) => [s.foo]}` they'll re-subscribe every render. Wrap in `useCallback` in docs; do NOT auto-wrap inside the hook (would freeze the function across re-renders, hiding bugs).
- **StrictMode double-invoke**. `useStructural` already handles this — the structural plan covered it. Don't duplicate the logic. Just trust the base hook.
- **Dispose ordering.** On unmount: `onUnmount` fires before `release`. The hook is the dispose orchestrator; `release` decrements the registry refcount which may trigger `bloc.dispose()`. If `onUnmount` reads `bloc.state`, the bloc must still be alive — so call order is: `onUnmount(bloc)` → `release(...)` → registry may dispose.
- **Registry `release` signature.** Confirm it matches whatever C1 settled on. If the registry uses `bloc` identity not `(BlocClass, args)`, pass `bloc` directly. Don't guess — read C1's commit.
- **`useId` for consumer identity**. `useStructural` already calls `useId`. Don't add a second one in `useBloc`; that wastes IDs and breaks SSR hydration matching.
- **SSR**. `useStructural` uses `useSyncExternalStore` semantics under the hood (or the structural plan's chosen equivalent). Verify SSR snapshot is sane — `bloc.state` at acquire time should be returned without subscribing. Quick test: `renderToString` the hook on the server, no crash.
- **`@blac/adapter` imports.** Search the file: `rg "@blac/adapter" packages/blac-react/`. Should return zero matches after your commit.
