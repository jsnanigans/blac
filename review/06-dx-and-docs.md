# 06 — Developer experience and documentation

## 1. DX traps ranked by how quickly a new user hits them

1. **`#private` fields crash through the proxy.** First real bloc with a
   private field and a getter. No error message mentions BlaC.
   → [01 §4](./01-correctness.md#4-user-blocs-cannot-use-es-private-fields-or-methods)
2. **Async method after unmount throws.** First `fetch` in a bloc.
   → [01 §5](./01-correctness.md#5-emit-after-dispose-throws)
3. **Persist + `init()` seeding silently loses data.** First persisted keyed
   bloc. → [01 §1](./01-correctness.md#1-persisted-state-is-discarded-for-blocs-that-seed-state-in-init)
4. **Mutating `state` in a component silently writes to the store.** No
   warning, no re-render. → [05 §2.2](./05-api-and-types.md#22-state-is-only-shallowly-readonly-and-mutation-is-not-trapped)
5. **Deps require symbol indexing.** `cubit[APPLY_DEPS](useId(), {...})` in
   every component that passes a ref. → [05 §4](./05-api-and-types.md#4-the-deps-lane-has-no-public-api)
6. **`BlocProvider` re-renders every consumer on every parent render** when
   `args={{ ... }}` is an inline literal, because the context value is a new
   `Map` (`BlocProvider.tsx:73-77` memoises on `args` identity). Memoise on
   the structural key of `args` instead, the same way `useBloc` does.
7. **Args must be JSON-serialisable and throw otherwise.** Reasonable, but the
   error comes from deep inside `JSON.stringify` with no hint about which
   `useBloc` call passed a function. Wrap the throw with the class name.
8. **`select` must be referentially stable** or the channel treats it as a new
   consumer. The docs say so; the hook could just read `selectRef.current` at
   flush time (it already does) and drop the warning, since the subscription
   is keyed on `bloc` not `select`.

## 2. Documentation drift

Everything below was checked against source on 2026-09-04.

### `packages/blac-core/README.md`

| Line    | Says                                                           | Reality                                                                                         |
| ------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 147     | Public API includes `subscribe(listener)`                      | `subscribe(interest, cb)` inherited from `StructuralContainer`; listener form removed in 2.0.18 |
| 149     | `depend(BlocClass, instanceKey?)`                              | `depend(Type, defaultArgs?)` returning a `DepHandle`                                            |
| 127     | "Use `StateContainer` when you want `emit`/`update` protected" | They are public                                                                                 |
| 205-214 | `tracked()` from `@blac/core`                                  | Does not exist                                                                                  |
| 199     | `watch(instance(CounterCubit, 'counter-1'), …)`                | `instance(Type, args?)`; a string is hashed as JSON `"counter-1"`                               |
| 225     | Plugin hook `onStateChanged(instance, prev, curr)`             | `onStateChange(ctx, prev, next, paths)`                                                         |
| 238-239 | Subpath `@blac/core/tracking`; `/watch` exports `tracked`      | No such subpath; no `tracked`                                                                   |

### `README.md` (root)

| Line  | Says                                                                                  | Reality                                       |
| ----- | ------------------------------------------------------------------------------------- | --------------------------------------------- |
| 20    | "Concurrent-safe — Built on `useSyncExternalStore`"                                   | Uses `useReducer`; `use-bloc.mdx:251` says so |
| 21    | "Framework adapters — First-class React and Preact support, extensible adapter layer" | No Preact or adapter package in the repo      |
| 54-55 | Lists `@blac/preact`, `@blac/adapter` with links                                      | Directories do not exist                      |

### `packages/blac-react/README.md`

| Line    | Says                                                  | Reality                                                                                                         |
| ------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 92      | Links `plans/blac-ambient-tracking/design.md`         | No `plans/` directory                                                                                           |
| 160-172 | Deps via `APPLY_DEPS` symbols is "the supported path" | Marked `@internal` in source                                                                                    |
| 312     | "Breaking Changes (v2)" section                       | Fine for a migration note, but it is the only place `dependencies → select` is explained; move to the docs site |

### `packages/blac-core/src/watch-entry.ts`

Doc example `instance(UserBloc, 'user-123')` has the same string-vs-args
problem as the README.

### `apps/web-docs`

- `react/preact.mdx` documents a package that does not exist.
- `core/tracked.md` is correct and explicitly says there is no `tracked()`
  helper, which contradicts the core README. Fix the README, not the page.
- `guide/internals.md` is excellent and accurate; consider making it the
  canonical architecture doc and linking the READMEs to it instead of
  duplicating.

## 3. Make docs a CI concern

- Run `api-extractor` in `verify` and commit the `.api.md` reports. Any public
  signature change then shows up in the diff, and README code blocks can be
  checked against it.
- The docs site already uses `twoslash` for some blocks (`internals.md`).
  Turn it on for every `ts`/`tsx` block in the READMEs by rendering them
  through the same pipeline, or add a script that extracts README code blocks
  and type-checks them against the built `.d.ts`. The `tracked()` and
  `subscribe(listener)` examples would have failed immediately.

## 4. Error messages

Good: the circuit-breaker messages explain the likely cause and the config
knob. Extend the same style to:

- `structuralKey` function-in-args (`[blac] args must be serializable`): add
  the bloc name and the offending key path.
- `Cannot emit state from disposed container X`: add "this usually means an
  async method resolved after the last consumer unmounted; check
  `$blac.disposed` after `await`, or move the work to `onActivate`".
- `#private` `TypeError`: catch in `buildTrackedProxy` in dev and rethrow
  with a BlaC message until the architecture fix lands.

## 5. Onboarding surface

The three-lane model (args / deps / events) is the best-explained idea in the
docs and should be on the landing page. The current landing page leads with
"zero providers" and "useSyncExternalStore", one of which is now half true
(`BlocProvider` exists) and one false.

Suggested pitch order: (1) leaf-level re-render isolation with no selectors,
(2) class-based logic with typed args/deps, (3) cross-bloc getters that track
automatically, (4) lifecycle managed by ref counting, (5) plugins.
