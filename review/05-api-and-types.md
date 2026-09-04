# 05 — API design and type safety

## 1. `Cubit` and `StateContainer` are the same class

`Cubit.ts` is an empty subclass. Its own doc comment says so and keeps it
"because downstream code does `instanceof Cubit`". The core README says the
opposite: _"StateContainer — use this when you want `emit`/`update` to be
protected"_. In fact `emit`, `patch`, `update` are public on `StateContainer`
(`StateContainer.ts:481` has no modifier; `StructuralContainer` declares them
public).

Pick one:

- **Make the README true.** `StateContainer` declares
  `protected override emit`, `protected override patch`, `protected update`;
  `Cubit` re-declares them `public`. TypeScript allows widening visibility in
  a subclass. Then the two classes have a real difference and the
  encapsulation story ("business logic lives in the class") holds.
- **Delete `Cubit`** and export `Cubit = StateContainer` as a deprecated alias
  for one release.

The first option is better for the library's pitch.

## 2. Type safety

### 2.1 Constructors are not constrained to zero args

```ts
export type StateContainerConstructor<S extends object = any> = new (
  ...args: any[]
) => StateContainer<S, any, any>;
```

Every registry function and `useBloc` accept this, then call `new Type()`.
A class with a required constructor parameter type-checks and gets
`undefined` at runtime. `ExtractArgs<T>` separately requires `new () =>`,
so such a class also silently infers `Args = void`.

Fix: `new () => StateContainer<S, any, any>`. The abstract base keeps its
`(initialState, options)` constructor; subclasses must supply the state, which
is exactly the documented contract.

### 2.2 State is only shallowly readonly and mutation is not trapped

`ExtractState<T>` is `Readonly<S>`; nested objects are mutable in the type
system. The tracking proxy has only `get` / `has` / `ownKeys` traps
(`tracker.ts:378-563`), so `state.user.name = 'x'` in a component writes
straight through to the store with no re-render and no warning.

Fix:

- Export a `DeepReadonly<S>` and use it for `ExtractState`, the `state`
  getter's public type, and `select`'s first argument.
- In the dev build add `set`, `deleteProperty`, and `defineProperty` traps
  that throw `[blac] state is read-only; call a bloc method instead`.

### 2.3 `InstanceReadonlyState<T>` erases the class

`Omit<InstanceType<T>, 'state'> & { state: ... }` turns the class type into an
object type: `this`-typed return values, `instanceof` narrowing, and
overload resolution on methods degrade. Prefer an intersection that keeps the
class and overrides only `state`:

```ts
type WithReadonlyState<I, S> = I & { readonly state: DeepReadonly<S> };
```

or, once `state` is `DeepReadonly` at the source, drop the wrapper entirely.

### 2.4 `any` in the public surface

`S extends object = any` on `StateContainer`/`Cubit`, `InstanceReadonlyState<T = any>`,
`LifecycleListener` payloads (`any, any`), `getStaticProp` via `(Type as any)`,
`registry.emit(...args: any[])`. Each is a place where a typo compiles.
Default `S` to `object`, type the listener payloads with the container's `S`,
and type the static-prop helpers with a declared static interface:

```ts
interface BlacStatics {
  keepAlive?: boolean;
  key?: (args: unknown) => string;
  __equality?: EqualityFn;
}
```

### 2.5 `constructor.name` as identity

`_name`, `_instanceId`, `register()`'s duplicate check, `getStats().typeBreakdown`,
and devtools labels all use `constructor.name`. Under minification every bloc
is `t`, `register()` throws on the second class, and stats collapse into one
bucket. Add a `static blacName?: string` (or reuse `static name` via the
`blac()` decorator) and read it first.

## 3. Dead and redundant surface

| Item                                                                                               | Location                             | Action                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------- |
| Third tuple element `ref: RefObject<ComponentRef>` where `ComponentRef = Record<string, never>`    | `useBloc.ts:104`, `:686`, `types.ts` | Remove. Return `[state, bloc]`.                                                   |
| No-op `useId()` "reserved for forwards compatibility"                                              | `useBloc.ts:116`                     | Remove; it costs an id slot per consumer.                                         |
| `configureBlacReact` with an empty `BlacReactConfig`                                               | `blac-react/src/config.ts`           | Remove until there is a knob (the array-coarsening threshold would be the first). |
| `register()` keyed by class name                                                                   | `StateContainerRegistry.ts:register` | Remove or key by constructor.                                                     |
| `borrow`/`borrowSafe` default key `BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY` vs `DEFAULT_STRUCTURAL_KEY` | `constants.ts`, `structural-key.ts`  | One constant.                                                                     |
| Unreachable `throw` after `listeners.get(event)` in `on()`                                         | `StateContainerRegistry.ts:on`       | Delete.                                                                           |
| `BLAC_DEFAULTS.MAX_GETTER_DEPTH`, `BLAC_ID_PATTERNS`                                               | `constants.ts`                       | Unused. Delete.                                                                   |
| `global.d.ts` `__BLAC_LOGGING__`                                                                   | `blac-core/src/global.d.ts`          | Unused. Delete.                                                                   |
| `registry/*.ts` (8 files of 3-line wrappers)                                                       | `registry/`                          | Collapse into one `registry.ts`; they all do `resolveKey` + delegate.             |
| `debug.ts` / `plugins.ts` / `watch-entry.ts` / `types.ts` re-exporting barrel symbols              | `blac-core/src`                      | See [03 §3](./03-bundle-and-packaging.md#3-subpath-exports-duplicate-the-barrel). |
| `getInstancesMap()` returning a fresh empty `Map` for unknown types                                | registry                             | Return `undefined` or a shared frozen empty map; callers already handle absence.  |
| `_instanceId` initialiser `generateSimpleId(this.constructor.name, 'main')`                        | `StateContainer.ts`                  | Always overwritten in `[INIT_CONFIG]`; make the field `!`-declared.               |

## 4. The deps lane has no public API

The React README and the `inputs` guide tell users to import `APPLY_DEPS` and
`REMOVE_DEPS_OWNER`, which are marked `@internal`, and to call
`cubit[APPLY_DEPS](useId(), slice)` from an effect. That is the documented
"supported path" for one of the three headline input lanes.

Fix: ship the wrapper.

```ts
export function useBlocDeps<T extends StateContainerConstructor>(
  bloc: InstanceType<T>,
  slice: Partial<ExtractDeps<T>>,
): void {
  const ownerId = useId();
  useEffect(() => {
    bloc[APPLY_DEPS](ownerId, slice);
    return () => bloc[REMOVE_DEPS_OWNER](ownerId);
  }, [bloc, ownerId, ...Object.values(slice)]);
}
```

Or accept `deps` as a `useBloc` option and apply it in the subscribe/effect
phase. Either way, the symbols stop appearing in user code.

## 5. `blac()` decorator accepts one option at a time

`BlacOptions` is a union of single-key objects, so `@blac({ keepAlive: true, key: ... })`
is a type error even though the implementation handles all four keys. Make it
a plain object with optional fields.

## 6. Static inheritance is implicit

`getStaticProp` reads through the class prototype chain, so a `static key` or
`static keepAlive` on a base class applies to every subclass. Usually desired
for `keepAlive`, rarely for `key` (a subclass with different `Args` inherits
the wrong key function). Either document it or read own statics only with
`Object.hasOwn`.

## 7. `watch()` holds a real ref

`watch(UserBloc, cb)` creates the instance if missing and keeps it alive until
`unwatch`. That is consistent with the ownership model but surprising next to
`borrow`. Consider `watch.existing(...)` or a `{ create: false }` option for
observers that should not extend lifetime.

## 8. Naming

- `ensure` / `borrow` / `borrowSafe` / `acquire` / `release` is five verbs for
  two concepts (own vs. peek). After [04 §4](./04-architecture.md#4-one-ownership-model):
  `acquire`, `release`, `peek`, `peekSafe`.
- `InstanceReadonlyState` vs `InstanceState` vs `StateContainerInstance` are
  three near-identical aliases; keep one.
- `onSystemEvent` is protected but `channel.subscribe` is public, so outside
  code has a lower-level API than the bloc itself. Either expose
  `onStateChanged(cb)` publicly or hide `channel` behind `/debug`.
