---
title: Troubleshooting & FAQ
description: A symptom-to-fix lookup table for the most common BlaC problems, with links into the reference pages that own each explanation.
---

This page is a fast lookup table for the problems that actually bite. Each entry is **symptom → cause → fix**, with a link into the reference page that owns the full explanation. If you are new and want the _why_ behind these behaviours, read the [Mental Model](/guide/mental-model) first — this page assumes you just want the answer.

:::tip[How to use this page]
Scan the **Symptom** column for the thing you are seeing, expand the matching detail block, apply the fix, and follow the link if you need depth. Nothing here invents new API — every fix uses the surface documented in [`useBloc`](/react/use-bloc), [Instance management](/core/instance-management), and [Configuration](/core/configuration).
:::

## Common problems

### Re-rendering

| Symptom                                       | Likely cause                                                       | Fix                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Component never re-renders when state changes | State was read **outside** the render body                         | Read the value during render, not in an effect/callback                                  |
| Component never re-renders                    | State was **destructured/copied before** the tracked read          | Read leaf properties off the live `state` proxy during render                            |
| Component never re-renders                    | A `select` selector is present and never returns the changed value | Add the value to the selector array (or remove `select` to auto-track)                   |
| Component never re-renders                    | State was **mutated in place** instead of replaced                 | Use `emit` / `update` / `patch` so a new reference is published                          |
| Component re-renders too often                | Reading a coarse path (whole array/object) instead of the leaf     | Read the specific leaf you render; see [dependency tracking](/react/dependency-tracking) |

<details>
<summary>"My component does not re-render" — full walk-through</summary>

Auto-tracking records a state path **only when you read it on the `state` proxy during render**. Four things break that contract:

**1. The read happened outside render.** Reads inside `useEffect`, event handlers, `setTimeout`, or `onMount` are not recorded — only synchronous reads in the render body are.

```tsx
// ✗ read happens in an effect — nothing is tracked, no re-render
const [state, bloc] = useBloc(CounterCubit);
useEffect(() => {
  console.log(state.count); // recorded? no.
}, []);

// ✓ read during render — `count` is tracked
const [state] = useBloc(CounterCubit);
return <span>{state.count}</span>;
```

**2. You destructured or copied before reading.** Pulling values into a local at the top, or spreading the state, can read a parent path (coarse) or no path at all, depending on how you then use it. Read the exact leaf you render, off the live proxy.

```tsx
// △ spreading reads the parent, widening (or losing) what is tracked
const { ...snapshot } = state;
return <span>{snapshot.count}</span>;

// ✓ read the leaf directly
return <span>{state.count}</span>;
```

**3. You passed a `select` selector that omits the value.** Providing `select` opts **out** of auto-tracking entirely — the hook re-renders only when the returned array changes per index (`Object.is`). If the value you render is not in that array, it will never trigger a render.

```tsx
// ✗ render uses `total`, but the selector only watches `count`
const [state] = useBloc(CartCubit, { select: (s) => [s.count] });
return <span>{state.total}</span>;

// ✓ either include it…
const [state] = useBloc(CartCubit, { select: (s) => [s.count, s.total] });
// ✓ …or drop `select` and let auto-tracking handle it
const [state] = useBloc(CartCubit);
```

**4. You mutated state in place.** `emit` short-circuits when `prev === next` by reference, and `patch` skips per-key when `Object.is(old, new)` holds. Mutating the existing object and re-emitting it publishes nothing.

```ts
// ✗ same reference — emit no-ops
update((s) => {
  s.count++;
  return s;
});

// ✓ new reference
update((s) => ({ ...s, count: s.count + 1 }));
// ✓ or target the field
patch({ count: this.state.count + 1 });
```

Owner page: [Dependency tracking](/react/dependency-tracking). Mechanism: [Mental Model](/guide/mental-model).

</details>

:::caution[Map / Set / Date / class instances are leaves]
The tracker wraps **plain objects and arrays** only. A `Map`, `Set`, `Date`, or class instance in state is treated as a single leaf value — a change is detected as a **reference change at that path**, never as a change to something inside it. Replace the whole value (`emit(new Map(prev).set(k, v))`) rather than mutating it in place. See [dependency tracking limitations](/react/dependency-tracking).
:::

---

### Stale values in callbacks

| Symptom                              | Likely cause                                                   | Fix                                                                         |
| ------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| A callback fires with an old value   | Closure captured a render-time snapshot                        | Read off the bloc inside the callback, or invert the callback into the bloc |
| `deps` callback sees stale variables | Inline arrow re-created each render but captured stale closure | Make the handle stable; put the _logic_ in the bloc                         |

<details>
<summary>"Stale value in a callback" — callback inversion</summary>

A callback you define in the component closes over the variables that existed **when that render ran**. If it fires later, it still sees those old values.

```tsx
// ✗ `count` is frozen at the render that created this handler
const [state, bloc] = useBloc(CounterCubit);
const onClick = () => console.log(state.count); // stale
```

Two fixes, in order of preference:

**Read off the bloc, not the closure.** The `bloc` instance is stable for the consumer's lifetime, and `bloc.state` is always current.

```tsx
const [, bloc] = useBloc(CounterCubit);
const onClick = () => console.log(bloc.state.count); // always current
```

**Invert the callback into the bloc.** Better still, move the behaviour onto the bloc as a method (an arrow-function class field, so `this` binds). The component just calls the action; there is no closure to go stale.

```ts
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  logCount = () => console.log(this.state.count); // `this.state` is live
}
```

```tsx
const [, bloc] = useBloc(CounterCubit);
return <button onClick={bloc.logCount}>log</button>;
```

If you must pass a callback **into** a bloc, route it through the `deps` lane (a non-serializable, per-consumer handle) rather than `args` — and keep the handle referentially stable so it does not re-key. Putting a fresh inline arrow in `deps` every render is the classic stale-closure trap. See [Passing inputs](/guide/inputs#deps-non-serializable-handles).

</details>

---

### Instance identity (too many / too few)

| Symptom                                                   | Likely cause                                                                             | Fix                                                                                      |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Two instances when you expected one                       | `args` differ structurally between consumers (or a fresh object that hashes differently) | Ensure args are equal; narrow identity with `static key`                                 |
| A **new** instance every render                           | A function or non-serializable value is in `args`                                        | Move it to `deps`; `args` must be JSON-serializable                                      |
| Everyone shares one instance, but you wanted one per item | All consumers use the same key (default, or same `args`)                                 | Pass distinct `args` (e.g. a name field, or `_id: useId()` + `static key` for per-mount) |
| Per-item components leak into each other                  | Same `args` key reused across items                                                      | Give each item distinct `args` (e.g. the row id)                                         |

<details>
<summary>"I got two instances when I expected one"</summary>

Identity is resolved from, in precedence order: own **`args`** (via `static key(args)`, else the **structural hash of `args`**) → `<BlocProvider>` context args → the `'default'` sentinel. Two consumers land on the same instance only when their resolved key matches.

Common causes of an unexpected split:

- **Args differ structurally.** `{ userId: '1' }` and `{ userId: 1 }` hash differently (string vs number). Normalise the type.
- **You only want a subset of args to key the instance.** Use `static key` so config that "rides along" does not fork instances:

  ```ts
  class DocumentCubit extends Cubit<
    DocState,
    { docId: string; readonly: boolean }
  > {
    static key = (args: DocumentCubit['args']) => args.docId; // `readonly` does not fork
  }
  ```

`args` is memoised internally on `JSON.stringify(args)`, so a fresh object literal each render is fine **as long as its contents are equal**. Owner page: [Passing inputs](/guide/inputs#args-construction-data-that-keys-the-instance).

</details>

<details>
<summary>"A new instance is created on every render"</summary>

If `args` contains a **function** (or other non-serializable value), the structural-key hash throws in dev with:

```text
[blac] args must be serializable; put refs/callbacks in `deps`
```

In production the hash will differ each render and you get a brand-new instance constantly. The fix is always the same: **`args` is for serializable identity data only.** Refs, callbacks, and live handles go in the [`deps`](/guide/inputs#deps-non-serializable-handles) lane.

```tsx
// ✗ callback in args — throws in dev, new instance in prod
useBloc(ListCubit, { args: { onSelect: () => {} } });

// ✓ identity data in args, handle in deps (deps never key identity)
useBloc(ListCubit, {
  args: { listId } /* , deps: { onSelect } via your deps wiring */,
});
```

</details>

<details>
<summary>"Everyone shares one instance when I wanted per-item"</summary>

By default, a bloc with `void` args resolves to the single `'default'` key — every consumer shares it. To get one instance per item, give each consumer distinct `args`. Identity always comes from `args`; differ by intent only in _what_ you put there:

| Want                                                   | Use                                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| One instance per **data identity** (e.g. per `userId`) | `args: { userId }` — same args share, different args split        |
| One instance per **caller-chosen key**                 | a name field in args, e.g. `args: { row: row.id }` + `static key` |
| One **fresh** instance per component mount             | `args: { _id: useId() }` + `static key`                           |

```tsx
// per data identity
useBloc(UserCardCubit, { args: { userId } });

// caller-chosen key — each row is its own instance (static key = a => a.row)
useBloc(RowCubit, { args: { row: row.id } });
```

```tsx
// fresh per mount — useId() is a stable-per-mount value (static key = a => a._id)
const _id = useId();
useBloc(WidgetCubit, { args: { _id } });
```

A per-mount instance keyed off `useId()` always resolves to its own key, never the args supplied by an ancestor [`BlocProvider`](/react/use-bloc), so each mount stays private. Owner page: [Instance management](/core/instance-management).

</details>

:::caution[`args: { _id: useId() }`, not `autoInstance` or `instanceId`]
You may see `autoInstance` or an `instanceId` option in old notes or stale comments — neither exists in the shipping API. The per-mount mechanism is a synthetic `args` field plus a `static key` that selects it (use `useId()` for a stable-per-mount value). A `static isolated` field exists but is **not** wired into `useBloc` in the current release, so do not rely on it. See the [glossary](/guide/glossary).
:::

---

### Lifecycle (disposed too early / never disposed)

| Symptom                                      | Likely cause                                                       | Fix                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Instance disposed while still in use         | A `depend()`/`ensure` reference holds no ref count                 | Hold a real ref (a `useBloc` consumer), or mark the source `keepAlive`         |
| Instance never disposed                      | A ref was acquired without a matching release                      | Pair every `acquire` with a `release` (outside React)                          |
| State unexpectedly resets                    | Last consumer unmounted → auto-dispose → fresh instance on remount | Mark the class `@blac({ keepAlive: true })` if it should outlive its consumers |
| State persists when you wanted a clean slate | `keepAlive` is on, so refcount 0 never disposes                    | Drop `keepAlive`, or `release(..., forceDispose)` / `clear` in teardown        |

<details>
<summary>"Instance disposed too early / never disposed" — ref counting</summary>

The registry ref-counts instances. Each `useBloc` consumer acquires one ref on mount and releases it on unmount. When the ref count reaches **0**, the instance is auto-disposed (unless it is `keepAlive`), and the dispose **cascades** to `ensure`-created dependencies that now also have zero refs.

**Disposed too early.** `depend()` resolves its target via `ensure()`, which takes **no ref**. If nothing else holds the dependency, it can be disposed out from under you. Keep it alive by having a real consumer hold it, or mark the source class `keepAlive`.

```ts
// inside a bloc — depend() does NOT keep the target alive on its own
private user = this.depend(UserCubit);
```

```ts
// keep a shared, long-lived source alive
@blac({ keepAlive: true })
class SessionCubit extends Cubit<SessionState> {
  /* … */
}
```

**Never disposed.** Outside React you manage refs yourself: every `acquire` must be paired with a `release`. A missing `release` leaks the instance forever.

```ts
const refId = 'job-42';
const job = acquire(JobCubit, { refId });
// … later, always:
release(JobCubit, { refId });
```

`keepAlive` instances are never auto-disposed at refcount 0; tear them down explicitly with `release(C, { forceDispose: true })` or `clear(Class)` (a test/teardown utility — see [testing core](/testing/core)). Owner page: [Instance management](/core/instance-management); see also [Configuration](/core/configuration#keepalive-true).

</details>

---

### Type errors

| Symptom                                        | Likely cause                            | Fix                                                   |
| ---------------------------------------------- | --------------------------------------- | ----------------------------------------------------- |
| `args` is **required** but you did not pass it | The bloc declares a non-`void` `Args`   | Pass `{ args: … }` — it is mandatory and type-checked |
| `args` is **forbidden** (`never`)              | The bloc's `Args` is the default `void` | Remove `args` from the `useBloc` call                 |
| `select` "must be stable" re-keys constantly   | A fresh selector function each render   | Wrap the selector in `useCallback`                    |

<details>
<summary>"Property 'args' is required / 'args' does not exist"</summary>

`useBloc`'s `args` option is **conditional on the bloc's type**:

```ts
type ArgsOption<T> =
  ExtractArgs<T> extends void ? { args?: never } : { args: ExtractArgs<T> };
```

- If the bloc extends `Cubit<S, SomeArgs>`, `args` is **required** — omitting it is a compile error.
- If the bloc uses the default `void` args, `args` is typed `never` — **passing** it is a compile error.

```tsx
// bloc: class UserCubit extends Cubit<S, { userId: string }>
useBloc(UserCubit); // ✗ Property 'args' is missing
useBloc(UserCubit, { args: { userId } }); // ✓

// bloc: class CounterCubit extends Cubit<S>  (void args)
useBloc(CounterCubit, { args: {} }); // ✗ 'args' does not exist on type
useBloc(CounterCubit); // ✓
```

If you genuinely need to pass data to a `void`-args bloc, give the bloc an `Args` type. Owner page: [Passing inputs](/guide/inputs).

</details>

---

### DevTools not showing

| Symptom                                  | Likely cause                                    | Fix                                                           |
| ---------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| DevTools panel empty / nothing appears   | The DevTools plugin is not installed            | `install` the DevTools plugin via `getPluginManager()`        |
| A specific bloc is missing from DevTools | The class is `excludeFromDevTools`              | Remove `@blac({ excludeFromDevTools: true })` from that class |
| DevTools loaded but no live updates      | Plugin installed only for the wrong environment | Check the plugin's `environment` config matches `NODE_ENV`    |

<details>
<summary>"DevTools not showing my blocs"</summary>

Two independent gates control DevTools visibility:

**1. The plugin must be installed.** DevTools is a plugin, not built in. Install it through the plugin manager, and respect its `environment` (a plugin configured for `'development'` is skipped in production by a runtime `NODE_ENV` check).

```ts
import { getPluginManager } from '@blac/core';
// install your devtools plugin instance:
getPluginManager().install(devtoolsPlugin, { environment: 'development' });
```

**2. The class must not be excluded.** A class marked `excludeFromDevTools` (checked via `isExcludedFromDevTools`) is deliberately hidden:

```ts
@blac({ excludeFromDevTools: true })
class NoiseCubit extends Cubit<NoiseState> {
  /* … */
}
```

If you want this bloc visible, drop that option. The option is documented in [Configuration](/core/configuration); usage lives in [the DevTools plugin](/plugins/devtools).

</details>

---

### SSR & hydration

| Symptom                                        | Likely cause                                         | Fix                                                                    |
| ---------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| Hydration mismatch warning from React          | Server and client produced different first snapshots | Seed initial state from `args` in `init(args)` so both render the same |
| Persisted state appears, then vanishes         | State changed _while_ hydrating → discarded          | Hold writes until `isHydrated`; observe `hydrationChanged`             |
| Instance key differs between server and client | Relying on internal auto-ids for stable identity     | Key off stable `args` (or a `BlocProvider`) for SSR-stable identity    |

<details>
<summary>"SSR / hydration notes"</summary>

A few facts that matter when rendering on the server:

- **First snapshot is synchronous.** `args` are forwarded to `init(args)` **once, before the first state snapshot**, so a bloc keyed by `args` renders identical initial state on server and client — no flash, no mismatch — provided the `args` are the same on both sides.
- **`useBloc` does not fight React for SSR id slots.** Internally it uses a plain module counter for its consumer id (a `useId()` slot is reserved but unused), so it will not desync SSR-streamed ids. For identity that must be **stable across server/client**, derive it from stable `args` or a [`BlocProvider`](/react/use-bloc); do not rely on auto-generated ids.
- **State hydration is a guarded lifecycle.** `beginHydration()` → `applyHydratedState(next)` → `finishHydration()`. `applyHydratedState` returns `false` (and skips) if the bloc was disposed, is not hydrating, or **`changedWhileHydrating`** — i.e. a normal write landed mid-hydration, so the live state wins and the persisted snapshot is discarded. If persisted state seems to be ignored, you almost certainly wrote to the bloc before hydration finished. Observe transitions via the [`hydrationChanged`](/core/system-events) system event and gate writes on `isHydrated`.

See [Persistence](/plugins/persistence) for the full hydration story and [System events](/core/system-events) for `hydrationChanged`.

</details>

---

## FAQ

<details>
<summary>Is there a `Bloc` class?</summary>

No. The only base classes are `StateContainer` (abstract) and [`Cubit`](/core/cubit) (abstract, extends `StateContainer`). "Bloc" is colloquial shorthand for any container instance — see the [glossary](/guide/glossary).

</details>

<details>
<summary>How do I track a value without decorating it? Where is `@tracked`?</summary>

There is no `@tracked` decorator and no `autoTrack` option. Tracking is **automatic and unconditional** whenever `select` is omitted — a render-time proxy records every leaf path you read. The only opt-out is supplying `select`. See [dependency tracking](/react/dependency-tracking).

</details>

<details>
<summary>`emit` vs `update` vs `patch`?</summary>

`emit(next)` replaces the whole state; `update(fn)` is `emit(fn(state))`; `patch(partial)` deep-merges a `DeepPartial<S>`. Note the equality check applies to `emit`/`update` only — `patch` filters per-key with its own `Object.is` comparison. A common mistake is calling `emit` with a partial object, which silently drops the missing fields. See [Cubit](/core/cubit).

</details>

<details>
<summary>Why did my `select` start re-keying / re-subscribing each render?</summary>

`select` must be **referentially stable**. A fresh function each render is treated as a new consumer and forces the subscription to re-key. Wrap it in `useCallback`. See [`useBloc`](/react/use-bloc).

</details>

<details>
<summary>Does `depend()` make my component re-render when the dependency changes?</summary>

A plain `.untracked()` read does **not** auto-subscribe to the dependency's channel — but `.track()` does: read a dep's state via `const [s] = this.dep.track()` inside a getter and the component reading that getter re-renders when the dependency changes, no second `useBloc` needed. Calling a dependency's method (through `.untracked()`) never subscribes you to it. See [Bloc communication](/core/bloc-communication#auto-tracking-with-track).

</details>

<details>
<summary>`watch` callback fires async / `watch` never stops — what gives?</summary>

`watch` fires once immediately, then on every change, but subscriptions are **microtask-deferred** — callbacks land after the synchronous `emit`. `watch` returns a cleanup function; if you never call it (or never return `watch.STOP`), the watcher leaks. Also note `watch` uses `ensure` and takes **no ref**, so it does not keep the bloc alive. See [`watch`](/core/watch).

</details>

<details>
<summary>My tests leak state between cases.</summary>

The registry is global. Reset it between tests with the testing setup helpers so instances do not bleed across cases. See [Testing overview](/testing/overview) and [Testing core](/testing/core).

</details>

<details>
<summary>A circuit breaker threw ("max instances" / "max refs").</summary>

You hit `maxInstancesPerType` or `maxRefsPerInstance` from the global config — usually a leak (unreleased refs, or distinct `args` exploding instance count). Find the leak first; raise the limit (or set it to `Infinity` to disable) only if the count is legitimately high. `maxEmitsPerSecond` only warns in dev, never throws. See [Configuration](/core/configuration).

</details>

## See also

- [Mental Model](/guide/mental-model) — the _why_ behind tracking, identity, and disposal
- [Passing inputs](/guide/inputs) — `args` and `deps` in depth
- [`useBloc`](/react/use-bloc) — the canonical options and precedence reference
- [Instance management](/core/instance-management) — acquire/release, ref counting, `keepAlive`
- [Glossary](/guide/glossary) — one-line definitions for every term used here
