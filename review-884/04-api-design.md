# API Design · Missing Features · Simplification

## API design issues (D)

### D1 · `useBloc`'s third tuple element is dead weight
`blac-react/src/types.ts:67-76`, `useBloc.ts:97, 467-471` — `UseBlocReturn[2]` is `RefObject<ComponentRef>` where `ComponentRef = Record<string, never>` (an always-empty object). Nothing reads or writes it. Every consumer pays a tuple slot and the docs say "advanced use cases" that don't exist. Remove (breaking, but nobody can be using an empty record meaningfully).

### D2 · `blac()` options can't be combined
`decorators/blac.ts:8-24` — `BlacOptions` is a union of single-key objects ("Only one option can be specified at a time"), but the *implementation* happily handles all four keys. `@blac({ keepAlive: true, key: a => a.id })` is a completely reasonable ask and is rejected by types only. Make it a partial object type; the union buys nothing.

### D3 · Cubit vs StateContainer is a distinction without a difference
`core/Cubit.ts` — empty class kept for `instanceof`. `emit`/`patch` are **public on StateContainer** (inherited from StructuralContainer), so the stated purpose of Cubit ("exposes emit/patch as public mutation surface") is already true of every bloc — any component can `bloc.emit(...)` directly. Either (a) make StructuralContainer's mutators `protected` in StateContainer and re-expose them `public` in Cubit — giving the split real meaning and giving library users an encapsulation option — or (b) delete Cubit. Also its docblock is stale: it claims patch has no skip semantics, but `StateContainer.patch` pre-skips shallow-equal partials (`StateContainer.ts:489-501`).

### D4 · `configureBlacReact` configures nothing
`blac-react/src/config.ts` — empty interface, three exported functions, "reserved for forwards-compatible knobs". Shipping a public no-op API costs migration pain when the real shape arrives (nothing guarantees the future config will be a mergeable flat object). Remove until there's a knob.

### D5 · `ExtractArgs` silently degrades for parameterized constructors
`types/utilities.ts:26-33` — `T extends new () => StateContainer<any, infer A, any>`. A subclass whose constructor takes required parameters does not match `new ()` → `ExtractArgs` = `void` → `useBloc` **forbids** `args` (`ArgsOption` = `{ args?: never }`) with no hint why. Constrain via the instance type instead (`InstanceType<T>['__args']` — the phantom already exists) or document "blocs must have zero-arg constructors" as a hard rule and enforce it in `StateContainerConstructor`.

### D6 · `select` gates re-renders but doesn't select
`useBloc.ts:330-341` — with `select`, the returned state is still the **full raw state**; the selector only drives re-render timing. Every mainstream API named "selector" returns the slice; this will surprise users repeatedly. Either return the selection (breaking; arguably the better API — see F1) or rename the option (`watch:`/`compare:`) so it stops promising selection.

### D7 · `watch()` can't express args, and `instance()`'s docs mislead
`watch/watch.ts:37-46`; `watch-entry.ts` example passes `instance(UserBloc, 'user-123')` — a *string as args*, structural-keyed as `"user-123"`, which reads like an instance-key API that doesn't exist. Beyond the R5 bug, the watch API needs an args story symmetric with `useBloc`/`acquire` (`watch(UserBloc, cb, { args })`).

### D8 · Concurrent-React posture is undeclared
`useBloc` mutates refs during render, acquires in `useMemo`, subscribes without uSES, and reads live state per-consumer (two components can render different snapshots of the same bloc in one pass — tearing). Each may be an acceptable tradeoff, but nothing in docs/types says "not tearing-safe; avoid `startTransition` around bloc-driven trees". Adopting `useSyncExternalStore` for the wake-up path (R2) would fix mount-gap + tearing and make the posture defensible; interest tracking can stay proxy-based.

### D9 · Asymmetries and paper cuts
- `emit()` consults the equality fn; `patch()` doesn't (only per-key `Object.is` + deep-merge no-op detection). Per-class `@blac({ equality })` therefore silently doesn't apply to patch. Document or unify.
- `emit`/`patch` **throw** on disposed containers (`StateContainer.ts:473,528`) while `APPLY_DEPS`/`REMOVE_DEPS_OWNER` silently no-op — async callbacks landing after unmount-dispose crash (`Cannot emit state from disposed container`) unless every bloc guards manually. Consider dev-warn + no-op for late emits, or expose an ergonomic `if (this.$blac.disposed) return` pattern in docs. This *will* be the most common crash users hit (fetch resolves after unmount).
- `PluginManager.install` silently skips on env mismatch but `uninstall` throws if absent — a plugin skipped by environment makes teardown code throw.
- `console.log` on every plugin install/uninstall, unconditional (`PluginManager.ts:106,137,163`) — libraries shouldn't log at info level in prod; gate on debug/dev.
- `onSystemEvent` is `protected`, so the dispose/hydration events are unreachable from outside the subclass — yet `watch`/devtools legitimately need dispose (R5). Either expose a public read-only subscription surface or add registry-level events.
- Doc drift: `plugins.ts` example calls `getPluginManager().register(...)` (method is `install`); `InstanceMetadata.previousState/currentState` fields are declared but never populated (`PluginManager.ts:358-374`).

### D10 · `borrowSafe` naming/shape
It's `borrow` wrapped in try/catch returning `{error, instance}`. A single `borrow(BlocClass, { args, orNull: true })` or `tryBorrow` returning `instance | null` is smaller API for the same power; the discriminated-object shape forces destructuring ceremony for a simple existence check that `hasInstance` already covers.

### D11 · `StateContainerConfig.instanceId` is the resolved key, exposed as `$blac.id`
`generateSimpleId(name, resolvedKey)` → `"CounterBloc:default"` — so `$blac.id` is **not unique across recreations**: dispose + re-acquire under the same key yields the same id. Devtools distinguishing instance generations can't. Consider `id` (stable per key) + `generation` or a truly unique `instanceUid`.

---

## Missing / additional features (F)

F1 · **A real selector hook.** `useBlocSelect(Bloc, s => s.count)` returning the slice (per D6). Cheap to build on the existing select-mode subscription.

F2 · **`useSyncExternalStore`-based core binding** (fixes R2, tearing; enables React 19 `use`-adjacent patterns). Interest tracking stays as-is.

F3 · **Suspense/async integration.** The hydration machine already has `wait()`; a `useBloc(B, { suspend: true })` that throws `hydration.wait()` while `status === 'hydrating'`, and an error-boundary path for `'error'`, would make the hydration feature usable from React — today nothing in `@blac/react` consumes hydration at all.

F4 · **Dispose-scoped async helpers.** Blocs doing `init()` fetches have no cancellation story; every user reimplements the disposed-guard (see D9). Provide `this.$blac.signal` (an `AbortSignal` aborted on dispose) and/or `this.safeEmit(next)` that no-ops after dispose. Tiny, kills the most common footgun.

F5 · **SSR/serialization story.** Core hydration exists, but there's no dehydrate counterpart (`snapshot()` of all/selected instances → JSON) and no React `<BlacHydrationBoundary state={...}>`. Also `StructuralContainer` defaults to `MicrotaskScheduler`; SSR wants `SyncScheduler` (the option exists but isn't reachable through blac config — expose per-class or global scheduler choice).

F6 · **Registry scoping via React context.** `setRegistry` is process-global — parallel tests, multi-tenant embeds, and Storybook isolation all want a `<RegistryProvider registry={...}>` consumed by `useBloc` instead of the module-global. The registry class is already instantiable; only the lookup is global.

F7 · **`watch` with path interest / selector.** `watch` is `ALL_PATHS`-only; the channel supports narrow interest. `watch(Bloc, cb, { paths: ['user.name'] })` or a selector+equality option would make non-React consumers as efficient as React ones.

F8 · **Plugin-driven state injection for devtools.** Time-travel/state-edit currently has no sanctioned path (only the hydration `apply`, which requires `begin()` status juggling and flips `isHydrated`). A `ctx.setState(instance, next, { reason })` that routes through `applyState` with a tagged source would unlock devtools editing cleanly.

F9 · **Error channel.** `configureBlac({ onError })` receiving (container, phase, error) from system-event handlers, plugin hooks, and channel subscriber errors — today they go to `console.error` or unhandled microtask throws (R22), invisible to app error reporting.

F10 · **Leak diagnostics surface.** The registry already counts refs; a dev-mode `getLeakReport()` (instances with monotonically growing single-refId counts — exactly R3's signature; ensure-created zero-ref instances older than N — R5/R9's signature) would turn the silent leaks in this review into actionable warnings.

F11 · **`onDepsChanged` for args?** Blocs get `onDepsChanged` but there's no `onArgsChanged`; args are fixed per instance by keying, which is coherent — but then `StateContainerConfig.args` being mutable-looking (`entry.args` stored, dev-warned on mismatch) invites confusion. Document "args are identity; new args = new instance" prominently in the core README (the glossary has it; the code comments don't).

---

## Simplify / remove (S)

S1 · **Dead code cluster in `utils/idGenerator.ts`** — `createIdGenerator`, `generateId`, `globalCounters`, `__resetIdCounters` have zero non-test callers (only `generateSimpleId` is used). Delete (~60 lines).

S2 · **`BLAC_DEFAULTS.MAX_GETTER_DEPTH`** — no references anywhere. Delete.

S3 · **`global.d.ts` / `__BLAC_LOGGING__`** — declared, documented, never read. Delete or implement.

S4 · **Unused type exports** — `BlocConstructor` (only web-docs mention it; carries a stray `keepAlive?` static that duplicates the real flag mechanism), `BlocInstanceType`, `ExtractConstructorArgs`. `Brand`/`BrandedId`/`InstanceId`/`instanceId()` are a `/types` subpath used by nothing in either package — if devtools don't use them, drop the subpath.

S5 · **`hasInitHook`** (`BlacPlugin.ts:172`) — exported from the module, not the barrel, used nowhere. Delete along with `BlacPluginWithInit` if nothing external needs it.

S6 · **`InstanceMetadata.previousState/currentState`** — never populated; remove from the interface.

S7 · **`configureBlacReact` + `BlacReactConfig`** — see D4.

S8 · **`ComponentRef` third tuple element** — see D1.

S9 · **`register()`/`registeredTypeNames`** — the name-based duplicate check guards nothing (registration isn't required for anything; `registerType` happens automatically on acquire) and misfires on minified/same-name classes (R12). Remove the public `register` or make it identity-keyed and actually meaningful.

S10 · **Testing helper overlap** — `withBlocState`/`withBlocMethod` are thin variants of `createCubitStub`+`ensure`; `overrideEnsure` wraps `withTestRegistry`+`registerOverride`. Consolidating to `createCubitStub` + `registerOverride` (+ `withTestRegistry`) would halve the testing API with no lost capability.

S11 · **The reserved `useId()` call in `useBloc`** (`useBloc.ts:109`) — a no-op hook call held "for forwards compatibility". Hook order is per-component, not per-library-version — a future version adding hooks doesn't need today's slot reservation unless components are expected to hot-swap library versions without remount (they aren't). Remove.

S12 · **`emit` override indirection** — `override emit(next) { this.applyState(next, 'default') }` plus `applyState(source)` exists only so hydration can share the path; `patch` duplicates ~80% of the same concerns inline (disposed guard, rate-check, pending capture, registry notify). Extracting the shared post-mutation tail (`captureChange(prev, next)`) would remove the duplication that already let the two paths drift (equality handling differs — D9).
