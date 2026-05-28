# 04 — React adapter (`useStructural`)

**Phase:** 4 (sequential — runs after Phase 3 commit lands)
**Model:** Sonnet 4.6
**Effort:** medium (well-spec'd hook; StrictMode handling needs care)
**Estimated touch:** 3 files (impl + tests + react barrel)

---

## Goal

Implement the `useStructural` hook — a thin React adapter that:

1. Wraps the container's `state` in a fresh `trackRender` proxy per render.
2. Records the consumer's `PathSet` onto the container.
3. Subscribes to the container's `DirtyChannel` with the consumer's lazy interest thunk.
4. Forces a re-render when the channel notifies.
5. Cleans up on unmount.

Exports from `@dirtytalk/structural/react`.

---

## Inputs — read these first

1. `dirtytalk/03-blac.md` § "React adapter (`@blac/react`)" — the reference implementation sketch.
2. `dirtytalk/03-blac.md` § "Conditional reads and the 'every render' rule" — invariant the hook must preserve.
3. `packages/dirtytalk-structural/src/container.ts` — the surface you bind to.
4. `packages/dirtytalk-structural/src/tracker.ts` — `trackRender`.
5. `packages/dirtytalk-structural/src/path-set.ts` — `emptyPathSet`.
6. `packages/dirtytalk-structural/src/react-hook.ts` — current stub.
7. `packages/dirtytalk-structural/src/react.ts` — current empty barrel.
8. (Reference) `packages/blac-react/src/useBloc.ts` — the existing hook, for inspiration on React-side wiring patterns we want to keep (StrictMode handling, useId for stable consumer keys, etc.). Do **not** copy.
9. `~/.claude/CLAUDE.md` — commit format.

---

## Owned files (write set)

```
packages/dirtytalk-structural/src/react-hook.ts        (replace stub body)
packages/dirtytalk-structural/src/react-hook.test.ts   (create)
packages/dirtytalk-structural/src/react.ts             (extend barrel)
```

**Do not touch:** any other source file, including `container.ts`. If you find a bug in `container.ts` while testing, **stop and file a separate fix commit** with scope `fix(dirtytalk-structural):` — don't bundle it into this feature commit.

If `react` / `@types/react` weren't added to `package.json` during Phase 0 (catalog unavailable), this is the task that adds them. Do that as a separate prep commit (`chore(dirtytalk-structural): add react peer dependency`) before the feature commit.

---

## Spec

### Signature

```ts
import type { StructuralContainer } from './container';

export interface UseStructuralResult<S, C extends StructuralContainer<S>> {
  0: S;
  1: C;
  readonly length: 2;
  [Symbol.iterator](): IterableIterator<S | C>;
}

export function useStructural<S, C extends StructuralContainer<S>>(
  container: C,
): readonly [S, C];
```

Returns a `[trackedState, container]` tuple. The tracked state is a proxy that records reads into the consumer's `PathSet`; the container is passed through verbatim for actions and direct subscriptions.

### Implementation

```ts
import { useEffect, useId, useReducer, useRef } from 'react';
import { trackRender } from './tracker';
import { emptyPathSet } from './path-set';
import type { PathSet } from './path-set';
import type { StructuralContainer } from './container';

export function useStructural<S, C extends StructuralContainer<S>>(
  container: C,
): readonly [S, C] {
  const consumerId = useId();
  const pathRef = useRef<PathSet>(emptyPathSet());
  const [, force] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    const unsub = container.subscribe(
      () => pathRef.current,
      () => force(),
    );
    return () => {
      unsub();
      container.unregisterConsumer(consumerId);
    };
  }, [container, consumerId]);

  const { value, paths } = trackRender(container.state, container.interner);
  pathRef.current = paths;
  container.registerConsumerPaths(consumerId, paths);

  return [value, container] as const;
}
```

### Key invariants

- **`trackRender` runs on every render.** The proxy is allocated fresh each call; recordings reflect the current render's reads.
- **`pathRef.current` updates before `registerConsumerPaths`** so the next channel flush sees the updated interest.
- **`useEffect` subscribes once per `container`/`consumerId` pair.** It does not depend on `pathRef`; the thunk closure reads `pathRef.current` lazily at flush time, so the subscription survives every render with the latest paths.
- **`force()` triggers React to re-render**, which re-runs `trackRender`, which updates the consumer's paths and the skeleton.
- **StrictMode double-invoke is safe.** `useEffect` mounts twice in dev; the first cleanup runs `unregisterConsumer` and the second mount re-registers. Because `consumerId` from `useId` is stable across the double-invoke, the second registration happens before the first cleanup *might* run, depending on React's exact order. Verify in tests that no paths leak in the consumer registry after a StrictMode mount+unmount+remount.
- **Unmount cleanly removes the consumer.** Unregister must run in the effect cleanup, not in a separate effect.

### `react.ts` barrel — final

```ts
// @dirtytalk/structural/react — React adapter
export { useStructural } from './react-hook';
```

---

## Tests — `src/react-hook.test.ts`

Use `@testing-library/react` (add as a `devDependency` in the prep commit if absent). Test environment: `jsdom`.

If `@testing-library/react` isn't catalog'd, **stop and report** rather than hand-rolling a renderer — testing React hooks without it is brittle.

Required cases:

1. **Initial render returns `[state, container]`.** Mount a component that calls `useStructural(c)`; assert it returns `c.state` and `c`.
2. **Reading state during render registers paths.** Component reads `state.count`; after mount, `c.consumerCount === 1` and the container's skeleton includes `'count'`. (Probe via a subsequent `patch` that touches `'count'` and a separate one that touches `'label'`; only the first should trigger a re-render.)
3. **`patch` triggers a re-render for tracked paths.** Component reads `state.count`. `c.patch({ count: 1 })`. The component re-renders; the new `state.count` is visible in the next render's JSX.
4. **`patch` does NOT re-render for untracked paths.** Component reads `state.count` only. `c.patch({ label: 'x' })`. Render count does not increment.
5. **Conditional reads adapt the skeleton.** First render reads `state.count`. Parent re-renders with a prop that flips the conditional to read `state.label`. After the second render, `c.patch({ label: 'x' })` re-renders; `c.patch({ count: 99 })` does NOT.
6. **`emit` with two consumers does source-diff.** Mount two components reading disjoint paths. `emit` a new state that changes only one path. Only one component re-renders.
7. **Unmount removes the consumer.** Mount, then unmount. `c.consumerCount === 0`. Skeleton is empty.
8. **StrictMode double-invoke leaves a clean registry.** Wrap in `<React.StrictMode>`. Mount → unmount → mount sequence (forced via key change). Final state: one consumer registered, no stale entries.
9. **Two components on the same container have stable distinct `consumerId`s.** Their paths combine in the skeleton; unmounting one leaves the other.
10. **Direct `c.subscribe` and `useStructural` coexist.** A plugin-style `subscribe` callback still fires; the hook still re-renders.

### Test scaffolding helper

```tsx
import { render, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { StructuralContainer } from './container';
import { SyncScheduler } from '@dirtytalk/engine';
import { useStructural } from './react-hook';

class Counter extends StructuralContainer<{ count: number; label: string }> {}

const makeContainer = (state = { count: 0, label: 'a' }) =>
  new Counter(state, { scheduler: new SyncScheduler() });
```

Use `SyncScheduler` so React Testing Library's synchronous assertions see effects immediately.

---

## Cycle (check → prep → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - `feat(dirtytalk-structural): implement StructuralContainer` is in `git log` (Phase 3 landed).
   - `grep "not implemented" src/container.ts` returns empty.

2. **Prep (only if needed).**
   - If `react`, `@types/react`, or `@testing-library/react` aren't in `package.json`, add them (using the workspace catalog if available, else pinned versions).
   - Update `vite.config.ts` test config to switch this file to `jsdom`:
     ```ts
     test: {
       environment: 'node',
       environmentMatchGlobs: [
         ['src/react-hook.test.ts', 'jsdom'],
       ],
     }
     ```
   - Run `vp install` from repo root.
   - **Separate commit** before the feature commit:
     ```
     chore(dirtytalk-structural): add react peer + jsdom test env
     ```

3. **Implement.** ~30 lines for the hook; update the barrel.

4. **Verify.** `vp run typecheck`, `vp run lint`, `vp run format:check`.

5. **Test.**
   - `vp run test src/react-hook.test.ts` — all 10 cases pass.
   - `vp run test` — full suite green.
   - `vp run build` — confirms `dist/react.{js,cjs,d.ts,d.cts}` emits with `useStructural` exported.

6. **Commit.**

   ```
   feat(dirtytalk-structural): implement useStructural React hook
   ```

   No body. No co-author.

---

## Acceptance criteria

- [ ] `useStructural(container)` returns `readonly [S, C]`.
- [ ] All 10 React tests pass.
- [ ] StrictMode mount/unmount leaves no stale consumers.
- [ ] Untracked-path mutations don't re-render.
- [ ] `react.ts` barrel re-exports `useStructural`.
- [ ] Two-entry build still emits both `index.*` and `react.*` outputs.
- [ ] `vp run {typecheck,lint,format:check,test,build,verify}` green.
- [ ] No changes outside owned write set (excepting the prep commit's package.json + vite.config edits).

---

## Pitfalls

- **Don't `useRef(emptyPathSet())` without re-creating.** A ref initialised once means every consumer mounted in a SSR-then-hydrate cycle shares the same Set. The hook signature in the spec gets this right (`emptyPathSet()` is called *inside* `useRef`, which only uses the value on first render — but on subsequent renders the ref persists, which is what we want).
- **Don't put `trackRender` inside `useEffect`.** It must run during render so the proxy is in scope for the JSX that reads it.
- **Don't put `registerConsumerPaths` inside `useEffect`.** Same reason — by the time `useEffect` runs, the render is over and the subscription thunk has already been evaluated with stale paths.
- **Don't subscribe inside render.** That double-subscribes on every render. Effect is the right place; the effect's `interest` thunk reads `pathRef.current` lazily so re-renders update what the channel sees without re-subscribing.
- **Don't use `useSyncExternalStore`.** It looks like a fit, but its `getSnapshot` contract is "stable value", which doesn't match our "proxy is freshly allocated per render" model. The `useReducer(force)` pattern is more honest.
- **Don't try to memoise the returned tuple.** Each render produces a fresh proxy; `state` value identity isn't stable. Consumers that depend on `[state, c]` identity are doing the wrong thing and should be helped to fix it, not propped up with a memo.
- **Don't add a `select` option.** Out of scope for v1. The proxy-tracking flow handles the common case; an explicit-deps `select` is a follow-up matching today's `useBloc({ select })`.
- **Don't import from `@dirtytalk/structural` (the package's own root)** — use relative imports (`./container`, `./tracker`). Importing your own package by name in source is a publint failure.
- **Don't bump React version requirements.** `react >=18` peer; the hook uses `useId` (available since 18). Don't pull in features that need 18.3+ or 19.
- **No `React.memo` on test components.** Make components re-render counts observable via a render-counter ref pattern; memo will hide real re-renders.
