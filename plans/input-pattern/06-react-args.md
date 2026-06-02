---
task: 06-react-args
phase: 3
parallel_safe: false
serial_group: react
model: sonnet
effort: medium
depends_on:
  - 05-adapter-typecompat
files:
  - packages/blac-react/src/types.ts
  - packages/blac-react/src/useBloc.ts
  - packages/blac-react/src/__tests__/useBloc.args.test.tsx # (new)
---

# 06 — `useBloc` `args` option: typing + threading + keying precedence

## Goal

Let `useBloc(Bloc, { args })` pass typed construction/identity data. `args` is **required when `Args != void`** and **forbidden when `Args == void`** (type-level). React resolves the React-specific identity precedence, then passes the final `instanceKey` + `args` into `acquire`; the core registry (task 03) derives the key from args when React doesn't supply an explicit one.

## Approach

1. **`types.ts` — conditional `args` on `UseBlocOptions`** (current shape: `instanceId`, `autoInstance`, `dependencies`, `autoTrack`, `onMount`, `onUnmount` at `:9-29`). Use a conditional/overload so `args` is required iff the bloc declares them:

   ```ts
   import type { ExtractArgs } from '@blac/adapter';
   type ArgsOption<T> = ExtractArgs<T> extends void
     ? { args?: never }
     : { args: ExtractArgs<T> };
   export type UseBlocOptions<T extends StateContainerConstructor> = ArgsOption<T> & {
     instanceId?: string | number;
     autoInstance?: boolean;
     dependencies?: (...) => unknown[];   // renamed to `select` in task 08 — leave for now
     autoTrack?: boolean;
     onMount?: (bloc: InstanceType<T>) => void;
     onUnmount?: (bloc: InstanceType<T>) => void;
   };
   ```

   Confirm the existing `useBloc<T>(BlocClass, options?)` signature still lets callers omit `options` for void-args blocs (the `args?: never` branch keeps `options` optional).

2. **`useBloc.ts` — thread args into resolution** (instance resolution `useMemo` at `:142-205`, `acquire` call at `:161`):
   - Read `const args = options?.args;`. Keep it in a ref (`argsRef`) like `depsRef`/`onMountRef` so changing-identity is handled by the dep array, not stale closures.
   - **Precedence** (design §10): the existing chain at `:153-158` already does `instanceId > autoInstance(useId) > ctxInstanceId`. Extend so that when NONE of those apply, `instanceKey` stays `undefined` and `args` is passed to `acquire` — letting core derive the key from `static key`/structural hash. When one DOES apply, pass that explicit `instanceKey` AND still pass `args` (args feed `init`, even when the key is explicit).
   - Pass args to acquire: `acquire(BlocClass, instanceKey, refId, args)` (the core wrapper gained the param in task 02).
   - **Dep array** (`:205`): add a _stable structural signature_ of args so a meaningful arg change re-resolves the instance. Compute `const argsKey = useMemo(() => args === undefined ? undefined : structuralKeySafe(args), [<stable?>])` — simplest correct approach: include `JSON.stringify(args)` (or reuse core's `structuralKey`) in the `useMemo` dep array so different args → new instance resolution. Document the serialization requirement (matches core).

3. **Dev-warn for explicit `instanceId` + keying args disagreement** is added in task 08; here just ensure both can be passed.

### Subtleties

- `args` participating in the resolution `useMemo` dep array is what makes "different userId → different instance" work on the React side. Use the structural key string, not the object reference (object identity changes every render).
- Do NOT put `deps` here — that's task 07.
- Keep `autoInstance`/`isolated`/context behavior intact.

## Check (before editing)

```fish
grep -n "UseBlocOptions" packages/blac-react/src/types.ts
grep -n "acquire(BlocClass\|instanceKey =\|useMemo<" packages/blac-react/src/useBloc.ts
```

Confirm `UseBlocOptions` has no `args` yet and `acquire(BlocClass, instanceKey, refId)` is called without args (`:161`). STOP if `args` already wired.

## Implement

1. Add conditional `args` to `UseBlocOptions`.
2. Thread `args` into the resolution `useMemo` + `acquire` call + dep array (via structural key string).
3. Keep precedence; pass args even when an explicit key applies.

## Test

`useBloc.args.test.tsx`:

```tsx
class UserCard extends Cubit<{ id: string | null }, { userId: string }> {
  state = { id: null as string | null };
  protected init(a: { userId: string }) {
    this.emit({ id: a.userId });
  }
}
it('seeds state from args; different userId → different instance', () => {
  const { rerender, result } = renderHook(
    ({ u }) => useBloc(UserCard, { args: { userId: u } }),
    { initialProps: { u: 'a' } },
  );
  expect(result.current[0].id).toBe('a');
  rerender({ u: 'b' });
  expect(result.current[0].id).toBe('b'); // re-resolved to the 'b' instance
});
it('same userId across two consumers shares one instance', () => {
  /* mount two, assert bloc identity */
});
// type test: @ts-expect-error when args omitted for a bloc that requires them
```

(Use the package's existing render/hook utilities; see `useBloc.test.tsx` for the harness.)

## Verify

```fish
pnpm --filter @blac/react typecheck
pnpm --filter @blac/react test -- useBloc.args
pnpm --filter @blac/react lint
```

## Commit

```
feat(react): add typed args option to useBloc with identity keying
```

Body: `useBloc(C, { args })` — required when the bloc declares Args; feeds `init` and derives the instance key (different args → different instance).

## Checklist

- [x] conditional `args` typing (required iff `Args != void`)
- [x] args threaded into resolution `useMemo`, `acquire`, and dep array (structural key)
- [x] precedence preserved; args passed even with explicit key
- [x] tests pass; typecheck & lint clean
- [x] committed with Completion filled

## Completion

**Commit SHA:** 821b9929
**Files touched:** 3 — `packages/blac-react/src/types.ts`, `packages/blac-react/src/useBloc.ts`, `packages/blac-react/src/__tests__/useBloc.args.test.tsx`
**Typecheck result:** pass (0 errors)
**Test result:** 4/4 new args tests pass; 5 pre-existing failures in `useBloc.array-methods-tracking.test.tsx` unrelated to this task
