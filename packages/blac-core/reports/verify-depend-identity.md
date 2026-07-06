# Verification: `depend()` / instance-identity feedback (reports 02, 04, 05, 07)

Source verified against `@blac/core`/`@blac/react` v2.0.18 as currently on
`main` (packages/blac-core/src, packages/blac-react/src). All claims below
are quoted from source, not paraphrased from docs.

## Report 04 — `depend()` ergonomics + cycle detection

**A. `depend()` returns a handle, not the instance — VERIFIED.**
`packages/blac-core/src/core/StateContainer.ts:303-306`:
```ts
protected depend<T extends StateContainerConstructor>(
  Type: T,
  defaultArgs?: ExtractArgs<T>,
): DepHandle<T> {
```
`DepHandle<T>` (`StateContainer.ts:49-53`) has exactly `track()`, `untracked()`,
and a branded `[DEP_BRAND]` field — no callable/instance shortcut. Matches the
report's quoted signature exactly (report renders `defaultArgs` as second
positional param, same as shipped).

**B. No `dependValue()`-style sugar — VERIFIED (does not exist).**
`rg -n "dependValue"` across `packages/blac-core/src` and `packages/blac-react/src`
returns zero matches. Only `.track()`/`.untracked()` exist on the handle.

**C. Cycle detection / registry insertion order — VERIFIED, claim is accurate.**
`StateContainerRegistry.acquire` (`core/StateContainerRegistry.ts:269-356`):
```
335:    this.assertInstanceLimit(Type, instances.size);   // reads size BEFORE insertion
338:    const instance = new Type() as InstanceType<T>;
339:    instance[INIT_CONFIG](config);                     // runs init() (StateContainer.ts:368-384)
...
346:    instances.set(resolvedKey, { instance, refs: initialRefs, args }); // inserted only after init() returns
```
`INIT_CONFIG` (`StateContainer.ts:368-384`) calls `this.init(...)` synchronously
at line 383, before `[INIT_CONFIG]` returns — confirming `init()` fully runs
before the `instances.set(...)` line executes. `assertInstanceLimit` (line
216-230) only compares `currentCount` (== `instances.size`, read before any
insertion) against `maxInstancesPerType`; there is no in-progress-construction
set, no `CircularDependencyError`, and no other guard anywhere in
`acquire`/`ensure`/`resolveKey`/`depend()` (`rg` for
`CircularDependency|in-progress|constructing` across `src` returns no hits
outside comments already checked). The report's traced mechanism for why a
mutual eager-`init()` cycle stack-overflows undetected is accurate as
described, and the fix location it names (`assertInstanceLimit`, or a new
check alongside it in `acquire`) is the only sane insertion point — there's no
existing partial guard to build on.

## Report 05 — keyed-instance identity

**D. `resolveInstanceKey` precedence — PARTIALLY-TRUE, missing a branch.**
Real code, `StateContainerRegistry.resolveKey` (`core/StateContainerRegistry.ts:192-208`):
```ts
resolveKey(Type, instanceKey, args) {
  if (instanceKey !== undefined) return instanceKey;   // (0) explicit key — NOT in report's precedence list
  const keyFn = getClassKey(Type);
  if (keyFn) return keyFn(args);                        // (1) static key(args)
  if (args !== undefined) return structuralKey(args);   // (2) structural hash
  return DEFAULT_STRUCTURAL_KEY;                        // (3) default sentinel
}
```
The report's traced precedence (`static key` → `structuralHash` → sentinel) is
correct *as reachable from `depend()`* but omits branch (0): an explicit
`instanceKey` string already outranks everything, at the registry-method
level. This matters for fix design — see E.

**E. `depend()`/`useBloc` accepting an `instanceKey` — PARTIALLY-TRUE, nuanced.**
The **internal** registry tier already accepts a pre-resolved `instanceKey`
string: `acquire(Type, instanceKey?, options)` (line 269-271), `ensure(Type,
instanceKey?, args?)` (line 416-420), `borrow`/`borrowSafe`/`release` all take
`instanceKey` too. `useBloc` uses this tier — `blac-react/src/useBloc.ts:566`
calls `registry.resolveKey(brand.Type, undefined, args)` (always passes
`undefined` for `instanceKey`, deriving purely from `args`). **The *public*,
user-facing `depend()` method on `StateContainer` does NOT expose an
`instanceKey` parameter** — its only param besides `Type` is `defaultArgs`
(`StateContainer.ts:303-306`, confirmed under A). So: the *mechanism* exists
end-to-end in the registry, but no public API surface (`depend()`, `useBloc`,
`acquire()` free function in `registry/acquire.ts:16-19`, which only takes
`{args, refId}`) lets a caller pass one in. The report's "never implemented in
the shipped resolver at all" (its exact wording) is FALSE for the resolver
itself — `resolveKey` implements it — but VERIFIED for every public entry
point into that resolver. This distinction changes the fix: it's a plumbing
gap (thread an existing param through), not new resolver logic.

**F. README documents `depend(BlocClass, instanceKey?)` — VERIFIED, exact match.**
`packages/blac-core/README.md:149`:
```
**Protected API:** `emit(state)`, `update(fn)`, `init(args)` (optional), `onDepsChanged(next, prev)` (optional), `onSystemEvent(event, handler)`, `depend(BlocClass, instanceKey?)`
```
This is a real doc/impl mismatch — the shipped signature is `depend(Type,
defaultArgs?)`, not `depend(Type, instanceKey?)`. Note `apps/web-docs`'s
glossary (`apps/web-docs/src/content/docs/guide/glossary.md`) already has the
*correct* current signature documented (`defaultArgs?`), so the drift is
isolated to `packages/blac-core/README.md` — the newer Astro docs are already
accurate on this point, only the package README is stale.

**G. Dev-warning for "same key, different args" — VERIFIED, exists.**
`StateContainerRegistry.acquire`, lines 298-315: when an existing entry is
found and `args !== undefined && entry.args !== undefined`, it compares
`structuralKey(args)` vs `structuralKey(entry.args)` and `console.warn`s if
they differ, naming the existing/new structural keys and suggesting either
removing the explicit `instanceKey` or adding a `static key`. This fires
regardless of whether the resolved key came from an explicit key, `static
key`, or structural hash — it only requires a resolved-key collision plus
differing args shapes. This is Mode 1 in the report; Mode 2 (different
resolved keys entirely, so no collision to warn about) has no corresponding
check anywhere — confirmed no second warning path exists.

## Report 02 — reactive `.onChange` / owner-scoped cleanup

**H. `watch()` / `onSystemEvent()` signatures — VERIFIED.**
`watch()` (`watch/watch.ts:165-209`, exported as `watchImpl` + `.STOP`,
`watch/watch.ts:211`) accepts a single `StateContainerConstructor | BlocRef`
or an array of them, plus a callback; returns an unsubscribe `() => void`;
fires once immediately then on every `channel.subscribe(() => ALL_PATHS, ...)`
tick; `watch.STOP` returned from the callback tears down all subscriptions
(matches report exactly, including `instance(BlocClass, args)` for the
keyed-ref form, `watch/watch.ts:37-46`).
`onSystemEvent` (`StateContainer.ts:719-733`) — `onSystemEvent<E>(event:
E, handler: SystemEventHandler<S,E>): () => void`, events are `'stateChanged'
| 'dispose' | 'hydrationChanged'` (`StateContainer.ts:65`), `stateChanged`
payload is `{ state, previousState }` per `SystemEventPayloads` (`StateContainer.ts:67-71`
region). Returns an unsubscribe closure. `DepHandle` (`StateContainer.ts:49-53`)
has no `onChange` — confirmed, only `track`/`untracked`/`[DEP_BRAND]`.

**I. Owner-scoped auto-cleanup of cross-instance subscriptions — VERIFIED, does not exist.**
`dispose()` (`StateContainer.ts:403-439`) only clears state belonging to
*this* instance: its own `_systemEventHandlers` (handlers *others* registered
on it, line 432), its own `_bridgeUnsub` (internal channel bridge, lines
429-430), and reconciles `_depsByOwner` to empty (lines 413-416). It does
**not** touch anything this instance subscribed to on *other* instances
(e.g. a stop function from `otherInstance.onSystemEvent(...)` or from
`watch(...)`) — those live only in local variables/fields on the calling
Cubit, per the report's `UrlSyncCubit` example, and nothing in `dispose()`
sweeps them. One nuance worth flagging for fix design: `depend()`'s own
bookkeeping (`_dependencies: Map<DepCtor, instanceKey>`, `StateContainer.ts:253`,
populated at `StateContainer.ts:307-313`) is **not** an active subscription —
it's inert metadata for `$blac.dependencies`, and `dispose()` never needs to
"sweep" it because it holds no ref, no listener, nothing to tear down. So the
report's framing that a future `.onChange()` would get "the same owner-scoped
auto-disposal that `depend()`'s other resolution paths already benefit from"
overstates what exists today — there is no existing sweep mechanism to reuse;
one would need to be built from scratch (e.g. track handles-with-subscriptions
per owner, mirroring how `_depsByOwner` already tracks per-owner state).

## Report 07 — `Deps` lane vs `depend()`

**J. `Deps` third-type-param + `APPLY_DEPS`/`REMOVE_DEPS_OWNER` reachability — VERIFIED.**
The lane exists: `StateContainer.ts:141-146` (`_depsByOwner`, `_deps`, `get
deps()`), `StateContainer.ts:156-187` (`[APPLY_DEPS]`), `StateContainer.ts:192-196`
(`[REMOVE_DEPS_OWNER]`), `StateContainer.ts:224` (`onDepsChanged` protected
hook). Both symbols are exported `@internal` from `packages/blac-core/src/index.ts:25`.
React's `UseBlocOptions` (`packages/blac-react/src/types.ts:32-57`) is exactly:
```ts
export type UseBlocOptions<TBloc extends StateContainerConstructor> =
  ArgsOption<TBloc> & {
    select?: (...) => unknown[];
    onMount?: (bloc: InstanceType<TBloc>) => void;
    onUnmount?: (bloc: InstanceType<TBloc>) => void;
  };
```
No `deps` field — confirmed. `rg -n "APPLY_DEPS|REMOVE_DEPS_OWNER"` across all
of `packages/blac-react/src` returns **zero matches** — `useBloc.ts` never
calls either symbol, despite a stale comment inside `blac-core` itself
claiming otherwise (`StateContainer.ts:138`: `` `@blac/react/src/useBloc.ts`
reads APPLY_DEPS / REMOVE_DEPS_OWNER ``, and `index.ts:22` similarly). The
**only** real caller of `[APPLY_DEPS]` outside its own test file
(`StateContainer.deps.test.ts`) is `packages/blac-core/src/testing.ts:157`:
```ts
(instance as any)[APPLY_DEPS](TESTING_DEPS_OWNER, options.deps);
```
inside `createCubitStub`, using a synthetic `TESTING_DEPS_OWNER` string
(`testing.ts`, matches report's `"testing-deps"`-style owner claim in
substance — exact literal not re-quoted here, owner constant confirmed
synthetic/testing-only). So: the `Deps` lane is fully implemented in core,
completely unreachable from the React binding as shipped, and the stale
internal comments claiming `useBloc` wires it are themselves wrong and should
be corrected alongside any doc fix.

## Fix-design implications

1. **Cycle detection (C)**: add an in-progress-construction guard inside
   `StateContainerRegistry.acquire`, keyed per `(Type, resolvedKey)`, checked
   before `new Type()` and cleared after `instances.set(...)` — this is the
   only choke point all `depend()`/`ensure`/`acquire` paths funnel through.
2. **`instanceKey` on `depend()` (E)**: this is plumbing, not new resolver
   logic — `resolveKey`'s explicit-key branch (D) already exists and is
   already load-bearing (used internally by `acquire`/`ensure`/`borrow`).
   Threading an `instanceKey` option through `depend()`'s public signature to
   `this._registry.resolveKey(Type, instanceKey, args)` is a small, low-risk
   change. Report 05's proposed `{ instanceKey?, args? }` options-object shape
   is reasonable but is a breaking signature change from today's positional
   `defaultArgs` — consider whether to keep `defaultArgs` positional and add
   `instanceKey` as a second optional param, or move to an options object
   (breaking either way once a second param is added meaningfully).
3. **README drift (F)**: `packages/blac-core/README.md:149` needs updating to
   the real signature; `apps/web-docs` is already correct — don't regress it
   when fixing the README.
4. **`.onChange()` on `DepHandle` (H/I)**: no existing owner-scoped cleanup
   mechanism to extend (per I's nuance) — this needs genuinely new
   bookkeeping (e.g., an owner-keyed subscription registry on the *dependent*
   Cubit, swept in its own `dispose()`), not a wire-through of something that
   already sweeps other things.
5. **`Deps` lane wiring into `useBloc` (J)**: two independent fixes bundled
   in report 07 — (a) docs: contrast `Deps`/`this.deps` vs `depend()`
   explicitly, and fix the stale `useBloc.ts`-reads-`APPLY_DEPS` comments in
   `StateContainer.ts:138` and `index.ts:22`; (b) code: decide whether to
   actually wire `APPLY_DEPS`/`REMOVE_DEPS_OWNER` into `useBloc` (exposing a
   `deps` hook option) or to formally scope the `Deps` lane to
   testing-only and document that. These are separable — (a) is safe/cheap,
   (b) is a real feature decision.
