# 01 — Correctness

Severity scale: **S1** data loss / silent wrong behaviour, **S2** leak or crash
in a realistic path, **S3** inconsistency that will bite later.

---

## 1. Persisted state is discarded for blocs that seed state in `init()`

**Severity:** S1 · **Status:** traced through source (core + `@blac/plugin-persist`)

### What happens

`StateContainer[INIT_CONFIG]` (`packages/blac-core/src/core/StateContainer.ts:388-421`)
does this in order:

```ts
this._registry.emit('created', this); // line 402
if (!this._initCalled) {
  this._initCalled = true;
  this.init(this._config.args as Args); // line 405
}
```

`PluginManager` forwards `created` synchronously to `onCreated`. The persist
plugin's `onCreated` (`packages/plugin-persist/src/IndexedDbPersistPlugin.ts:112-145`)
calls `context.startHydration(instance)` synchronously, which sets
`_hydrationStatus = 'hydrating'`.

Then `init(args)` runs. The documented pattern is to seed args-derived state
there via `this.emit(...)` / `this.patch(...)`. `applyState` sees
`_hydrationStatus === 'hydrating' && source !== 'hydration'` and sets
`_changedWhileHydrating = true`.

When the IndexedDB read resolves, `_applyHydratedState` returns `false`
because `_changedWhileHydrating` is set. The persisted state is thrown away
and the bloc keeps its seed state. No warning is logged.

### Why it matters

Every bloc that both persists and uses `init()` to seed loses persistence.
This is exactly the combination the docs recommend (keyed args + seeded state).

### Fix

Emit `created` after `init()` has run, so plugins observe a fully initialised
instance:

```ts
[INIT_CONFIG](config: StateContainerConfig): void {
  this._config = { ...config };
  // ...identity fields...
  if (!this._initCalled) {
    this._initCalled = true;
    this.init(this._config.args as Args);
  }
  this._registry.emit('created', this);
  // clobber guard...
}
```

Consequences to check:

- `PluginManager.attachStateBridge` snapshots `prevState` at `created`. With
  the reorder the first `onStateChange` `prev` becomes the post-init state,
  which is more useful, not less.
- `StateContainer.lifecycle-events.test.ts` and `PluginManager.test.ts` assert
  on ordering; update the expectations.
- If you want plugins to be able to observe the pre-init state, add a
  separate `onConstructed` hook rather than keeping `created` early.

Also consider a dev warning inside `_applyHydratedState` when it returns
`false` because of `_changedWhileHydrating`, since today the discard is silent.

---

## 2. `release()` disposes a dependency that a live owner still uses

**Severity:** S1 · **Status:** reproduced

### What happens

Two code paths decide whether an instance may be disposed:

- `_releaseDependent` (`StateContainerRegistry.ts:170-190`) requires
  `dependents.size === 0 && refs.size === 0`.
- `release()` (`StateContainerRegistry.ts:585`) requires only
  `refs.size === 0`.

So an instance created through `depend()` (no public ref, one dependent) that
is later acquired and released by a component is disposed while the owner is
still alive. The owner's next `.track()`/`.untracked()` re-resolves and gets a
fresh instance with initial state.

### Reproduction (passed as written)

```ts
const owner = reg.acquire(Owner, 'o', { refId: 'r1' });
const dep1 = owner.read(); // depend(Dep).untracked()
dep1.emit({ n: 42 });
reg.acquire(Dep, 'default', { refId: 'ui' });
reg.release(Dep, 'default', false, 'ui');
const dep2 = owner.read();
expect(dep1.$blac.disposed).toBe(true); // passes
expect(dep2).not.toBe(dep1); // passes
expect(dep2.state.n).toBe(0); // passes — state lost
```

### Fix

Factor a single predicate and use it in every dispose decision:

```ts
private isUnowned(Type: StateContainerConstructor, entry: InstanceEntry): boolean {
  return (
    entry.refs.size === 0 &&
    (entry.dependents === undefined || entry.dependents.size === 0) &&
    !isKeepAliveClass(Type)
  );
}
```

Call sites: `release()` auto-dispose branch, `_releaseDependent`, and the
future zero-ref sweep (see [04 §2](./04-architecture.md#2-activation-lifecycle-and-a-pure-render)).
Add a test that mirrors the reproduction above and asserts `dep2 === dep1`.

---

## 3. Dependent edges for per-call args are never released

**Severity:** S2 (leak) · **Status:** traced

### What happens

`depend(Type, defaultArgs)` records one entry per **type** in
`_dependencies: Map<Constructor, string>` keyed by the _default_ args key
(`StateContainer.ts:270-277`).

But `resolve(args)` inside the handle calls `registry.acquire(..., { dependent: this })`
with the **per-call** key. Every distinct `.track({ args })` adds `this` to
that entry's `dependents` set.

On owner disposal `_handleDisposed` (`StateContainerRegistry.ts:137`) only
iterates `$blac.dependencies`, i.e. the default key per type. Entries reached
with other args keep a disposed owner in `dependents` forever, so
`_releaseDependent` never sees `size === 0` for them and they are never
disposed.

### Fix

Track edges per resolved key. Cheapest version: make `_dependencies` a
`Map<Constructor, Set<string>>` and add every key `resolve()` touches:

```ts
private _dependencies: Map<StateContainerConstructor, Set<string>> | null = null;

private recordDependency(Type: StateContainerConstructor, key: string) {
  const byType = (this._dependencies ??= new Map());
  let keys = byType.get(Type);
  if (!keys) byType.set(Type, (keys = new Set()));
  keys.add(key);
}
```

`_handleDisposed` then iterates all `(Type, key)` pairs. Update the public
`BlacMeta.dependencies` type accordingly (it is read by devtools).

Alternative with less churn: have the registry itself record
`dependent → Set<[Type, key]>` in a `WeakMap` when `acquire` receives a
`dependent`, and sweep from that map. Then `StateContainer` does not need to
know about keys at all.

---

## 4. User blocs cannot use ES `#private` fields or methods

**Severity:** S1 (crash, undocumented) · **Status:** reproduced

### What happens

`buildTrackedProxy` (`packages/blac-react/src/buildTrackedProxy.ts:60-85`)
invokes prototype getters as `desc.get.call(thisProxy)` where `thisProxy` is a
`Proxy` around the instance. Any `this.#x` inside a getter, or inside a method
called from a getter, fails the private brand check and throws
`TypeError: Cannot read private member #x from an object whose class did not declare it`.

The same happens for methods called via the outer proxy (`bloc.method()`):
`this` is the outer proxy.

`meta.ts` carries a banner comment forbidding `#private` _inside the library_
for this reason, but nothing tells users. `#private` is the default choice for
many TypeScript codebases in 2026.

### Reproduction (passed as written)

```ts
class PrivateBloc extends Cubit<{ items: number[] }> {
  #hidden = 3;
  get total() {
    return this.state.items.length + this.#hidden;
  }
}
const desc = Object.getOwnPropertyDescriptor(PrivateBloc.prototype, 'total')!;
expect(() => desc.get!.call(new Proxy(b, {}))).toThrow(TypeError); // passes
```

### Fix

Short term: document it loudly in the React README and `useBloc` docs, and add
a dev-only check in `buildTrackedProxy` that catches the specific `TypeError`
and rethrows with a BlaC-specific message.

Real fix: stop invoking getters with a Proxy receiver. Use a tracking override
slot on the real instance. Full design in
[04 §3](./04-architecture.md#3-tracking-override-instead-of-a-this-proxy).

---

## 5. `emit` after dispose throws

**Severity:** S2 · **Status:** reproduced

### What happens

`applyState` and `patch` throw `Cannot emit state from disposed container`
(`StateContainer.ts:497`, `:552`). The most common way to hit this is an async
method:

```ts
async load() {
  this.patch({ loading: true });
  const data = await fetch(...);      // component unmounts here
  this.patch({ data, loading: false }); // throws → unhandled rejection
}
```

Every async bloc method needs a manual `if (this.$blac.disposed) return` after
each `await`. Nobody will do that consistently.

### Fix

Make post-dispose mutations a no-op with a dev-only warning, and return a
boolean so callers that care can check:

```ts
override emit(next: S): boolean {
  if (this._disposed) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[blac] ${this._name}: emit() after dispose ignored`);
    }
    return false;
  }
  return this.applyState(next, 'default');
}
```

If throwing is a deliberate design choice, at minimum provide a helper such as
`this.alive(() => this.patch(...))` or `this.guard()` and document the async
pattern prominently. The activation lifecycle in
[04 §2](./04-architecture.md#2-activation-lifecycle-and-a-pure-render) also
helps: an `AbortSignal` handed to `onActivate` and aborted on deactivate
gives async work a natural cancellation point.

---

## 6. Instance creation and `init()` side effects run inside render

**Severity:** S2 (SSR leak, double fetch) · **Status:** traced

### What happens

`useBloc.ts:220-274` creates the instance inside `useMemo`:

```ts
const instance = registry.acquire(BlocClass, resolvedKey, {
  canCreate: true,
  countRef: false,
  args: effectiveArgs,
});
```

`acquire` runs `new Type()`, `[INIT_CONFIG]`, and therefore `init(args)`,
during render. Three consequences:

1. **Discarded renders leak.** Suspense, an error boundary, or a concurrent
   render that React throws away never reaches the layout effect that takes the
   ref. The instance sits in the registry with zero refs and no one ever
   disposes it. With per-mount `useId()` args, each abandoned attempt is a
   fresh key.
2. **SSR leaks per request.** Effects never run on the server, so every render
   creates zero-ref instances in the module-global registry. The SSR guide
   documents an `AsyncLocalStorage` workaround for cross-request state, but
   nothing sweeps these instances.
3. **`init()` side effects can run twice** under StrictMode or concurrent
   rendering if the key differs between attempts, and always run before the
   component has committed.

### Fix

Two-part:

- Keep `init()` synchronous and pure (seed state only). Move network and
  subscription work to an `onActivate` hook that fires on the 0→1 ref
  transition. See [04 §2](./04-architecture.md#2-activation-lifecycle-and-a-pure-render).
- Add a registry sweep for instances that were created without a ref and never
  received one. Simplest form: `acquire` with `countRef:false` and no
  `dependent` schedules a microtask/idle check; if the entry still has no refs
  and no dependents, dispose it. For SSR, a `registry.dispose()` at the end of
  the request or an explicit `renderScope()` wrapper.

---

## 7. Tearing under concurrent rendering

**Severity:** S2 · **Status:** traced; contradicted by README

`useBloc` reads `bloc.state` directly during render and re-renders through a
`useReducer` dispatch. `apps/web-docs/.../react/use-bloc.mdx:251` states this
plainly. The root `README.md:20` says the opposite ("Built on
`useSyncExternalStore` for React 18+").

Two components rendering in the same concurrent pass can observe different
snapshots if an emit lands between their renders. The "R2 mount gap" and
"rebind nonce" code in `useBloc.ts` are compensations for the same underlying
issue.

### Fix

Adopt `useSyncExternalStore`; design in
[04 §1](./04-architecture.md#1-usesyncexternalstore-with-a-per-consumer-version-snapshot).
Until then, fix the README claim.

---

## 8. `StateContainer.dispose()` never calls `super.dispose()`

**Severity:** S3 · **Status:** traced

`StateContainer.ts:425-465` tears down the bridge, handlers and registry entry
but never calls `StructuralContainer.dispose()`, so the `DirtyChannel` is never
disposed and a scheduled flush is not cancelled. Because `emit` throws after
dispose nothing marks the channel again, so this is a latent rather than
active leak. Add `super.dispose()` at the end of the method.

---

## 9. Registry `on()` payloads are not coalesced, plugin payloads are

**Severity:** S3

`notifyStateChanged` pushes one tuple per emit; the plugin `onStateChange`
fires once per flush with coalesced `prev`/`next`. Two listeners for "state
changed" therefore see different event counts and different `prev` values.
Route the registry `stateChanged` event through the same per-container flush
bridge the plugin manager uses, or document the difference.

---

## 10. Failing test writes to an absolute path

**Severity:** S3 · `packages/blac-react/src/__tests__/useBloc.proxy-prop-tracing.test.tsx:176`

Writes a timeline to a scratchpad directory from a previous session and fails
with `ENOENT` on any other machine. It also asserts the _presence_ of the
parent-pollution behaviour, which reads as documenting a known limitation
rather than testing a contract. Delete the file write; consider deleting the
test and keeping the insight in the docs.
