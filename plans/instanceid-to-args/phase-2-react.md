# Phase 2 — blac-react (after Phase 1 · ∥ Phase 3)

## Task 2.1 — Remove `instanceId`; args-only `useBloc`; args-based `BlocProvider`

**Model: Sonnet · Effort: high** — hooks + context + a dedicated test suite to rewrite.
**Depends on:** Phase 1 (green + built). **Parallel-safe with:** Phase 3 (disjoint package).

### Files in scope (blac-react only)

- `src/types.ts` (`UseBlocOptions`)
- `src/useBloc.ts`
- `src/BlocProvider.tsx`
- `src/testing.ts` (`renderWithBloc`)
- `src/__tests__/*` (rewrite the instanceId/isolation suites)

### Check

- This plan's README "Target API".
- Phase 1's final core exports: `resolveInstanceKey(Bloc, args)`, the `@internal` registry tier,
  args-only `acquire/release`.
- Current `useBloc.ts` identity block (lines ~113–143, 219) and the `useId()` reserve-slot (line 94 — **keep**, it's unrelated to `instanceId`).
- Current `BlocProvider.tsx` `InstanceIdContext` / `useInstanceIdFromContext`.

### Implement

1. **`UseBlocOptions`** (`types.ts`): remove `instanceId?: string | number`. Options become
   `{ args?, select?, onMount?, onUnmount? }`.
2. **`useBloc.ts`**:
   - Remove `explicitInstanceId` and the `String(explicitInstanceId)` path.
   - Identity = `args` (own) → provider args (context) → none. Compute the key via
     `resolveInstanceKey(BlocClass, effectiveArgs)`.
   - Acquire/release through the internal tier with the **same** resolved key on both sides
     (preserve the acquire↔release pairing). Keep `consumerId`, `pathRef`, select-mode, and the
     `useId()` reserve slot intact.
   - `useMemo` dep: replace `explicitInstanceId`/`ctxInstanceId` with `argsKey` (+ provider args key).
3. **`BlocProvider.tsx`** → args-based scoping:
   - New props `{ bloc: BlocClass; args: ExtractArgs<Bloc>; children }`.
   - Replace `InstanceIdContext` with an **args context keyed by bloc class** (e.g. a `Map`/lookup
     so nested providers for different blocs compose). Export `useProvidedArgs(BlocClass)` for `useBloc`.
   - A descendant `useBloc(Bloc)` with no own `args` inherits the nearest provider args **for that Bloc**.
     Own `args` always win.
4. **`renderWithBloc`** (`testing.ts`): `instanceKey?` option → `args?`.

### Update react tests

- `useBloc.instance-isolation.test.tsx` — re-express isolation via distinct `args` (and the
  per-mount `{ args: { _id } }` pattern). Keep the _behaviors_ (separate state, independent
  re-render, dispose-one-keeps-other), drop the `instanceId` framing.
- `useBloc.instanceId-types.test.tsx` — repurpose to **args** type-acceptance (or delete if fully
  covered by `useBloc.args.test.tsx`; if deleted, note why in the commit body).
- `BlocProvider.test.tsx` — rewrite "E1 — instance-id context" suite to args-based provider scoping.
- `useBloc.test.tsx` — "Isolated Instances" / "Custom Instance IDs" describes → args-based.
- `useBloc.args.test.tsx` — the `"args passed alongside explicit instanceId"` test → args-only.
- `useBloc.stress.test.tsx` — "50 unique instanceIds" → 50 unique `args`.
- `useBloc.cross-bloc-react.test.tsx`, `useBloc.messenger-reproduction.test.tsx` — swap internal
  `instanceId:` usage in test components for `args:` (give those fixtures a `static key`).

### Verify (scoped)

```
pnpm --filter @blac/react typecheck
pnpm --filter @blac/react lint
pnpm --filter @blac/react test
pnpm --filter @blac/react format:check
pnpm --filter @blac/react build
```

### Commit

`refactor(react): remove instanceId option; args-only useBloc + BlocProvider`

### Done when

- `UseBlocOptions` has no `instanceId`; `BlocProvider` is args-based.
- React package typecheck/lint/test/format green; builds.
