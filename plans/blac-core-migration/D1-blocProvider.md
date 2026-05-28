# D1 — Verify / patch `BlocProvider` and finalize `@blac/react` barrel

**Phase:** D (parallel after D0; safe alongside D2)
**Model:** Sonnet 4.6
**Effort:** low (mostly verification; small barrel update)
**Estimated touch:** 2 files

---

## Goal

Verify `BlocProvider` still works with the rewritten `useBloc` from D0, and update `src/index.ts` to reflect the final `@blac/react` public surface. No major rewrite expected — the provider's job (context-provided `instanceId`) is orthogonal to the dirty-tracking model.

---

## Inputs — read these first

1. `packages/blac-react/src/BlocProvider.tsx` — current implementation.
2. `packages/blac-react/src/useBloc.ts` (after D0) — how `useInstanceIdFromContext` is consumed.
3. `packages/blac-react/src/index.ts` — current barrel.
4. `plans/blac-core-migration/_audit.md` — `BlocProvider` callsites in apps.
5. `~/.claude/CLAUDE.md` — commit format.

---

## What to verify

- `BlocProvider` provides `instanceId` (and any other context fields) via React context.
- `useInstanceIdFromContext()` exists and returns `string | undefined`.
- The provider supports nesting (inner overrides outer).
- The provider's `props: BlocProviderProps` shape is unchanged.

## What to update (`src/index.ts`)

Final exports:

```ts
export { useBloc } from './useBloc';
export { configureBlacReact } from './config';
export type { BlacReactConfig } from './config';
export type { UseBlocOptions, UseBlocReturn } from './types';
export {
  BlocProvider,
  useInstanceIdFromContext,
  type BlocProviderProps,
} from './BlocProvider';
```

Same shape as today, just verify after D0.

---

## Owned files (write set)

```
packages/blac-react/src/BlocProvider.tsx     (only if a real fix is needed)
packages/blac-react/src/index.ts
```

**Do not touch:** `useBloc.ts` (D0), `types.ts` (D0), `config.ts` (D0), tests (D2).

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - D0 committed.
   - Read `BlocProvider.tsx` end-to-end. If it doesn't reference anything from `@blac/adapter` and doesn't peek into `StateContainer` internals, it should Just Work.

2. **Implement.**
   - If no source fix needed: only update `src/index.ts` (verify the export shape).
   - If a fix is needed: keep it minimal. The most likely fix is a removed import (e.g. `@blac/adapter`'s types).

3. **Verify.**
   - `vp run typecheck` from `packages/blac-react/`.
   - `vp run lint`.
   - `vp run format:check`.

4. **Test.**
   - Tests owned by D2; don't fix here. `vp run test` to see if BlocProvider tests are green — if not, D2 picks them up.

5. **Commit.**

   ```
   refactor(blac-react): finalize BlocProvider for rewritten useBloc
   ```

   Or, if no source change:

   ```
   chore(blac-react): verify barrel exports after useBloc rewrite
   ```

   No body needed.

---

## Acceptance criteria

- [ ] `src/index.ts` exports match the spec above.
- [ ] `BlocProvider`, `useInstanceIdFromContext`, `BlocProviderProps` are public.
- [ ] No import from `@blac/adapter` anywhere in `packages/blac-react/src/`.
- [ ] `vp run typecheck` passes.

---

## Pitfalls

- **Empty commit if nothing changed.** If `BlocProvider` truly didn't need a fix and the barrel was already correct, you have nothing to commit. Don't create an empty commit — just report "no changes needed" and skip the commit. The plan's status board entry for D1 is then marked complete via the next commit's body.
- **Context default value.** `useInstanceIdFromContext()` should return `undefined` outside any provider — preserving today's behavior. If you find a default of `''` or `null`, leave it; just document.
- **`useInstanceIdFromContext` is exported.** Apps may use it directly. Don't remove the export.
