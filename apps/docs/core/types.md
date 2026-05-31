# Types

The complete type toolkit exported from `@blac/core`. These utilities let you derive the state, args, deps, and instance shapes of a container class without hand-writing them, and the branded-ID helpers give you nominal `InstanceId` strings. Every signature on this page is quoted verbatim from source.

For a task-oriented walkthrough of typing blocs (generic parameters, inference, common pitfalls) see [TypeScript](/guide/typescript). This page is the reference: one heading per export, the exact signature, what it does, and a small example.

::: info Where these come from
The extraction and instance utilities live in `@blac/core`'s `types/utilities` module; the branded-ID helpers live in `types/branded`. Both are re-exported from the package root, so you import everything from `@blac/core` directly.
:::

All examples assume this setup, which is hidden from the rendered snippet but type-checked:

```ts twoslash
import { Cubit } from '@blac/core';

interface CounterState {
  count: number;
  label: string;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, label: 'idle' });
  }
}
```

## Extracting type parameters

A `StateContainer` (and therefore `Cubit`) carries three type parameters: `S` (state), `Args` (serializable construction/identity data), and `Deps` (injected non-serializable handles). These utilities pull each one back out of a container _class_ (the constructor, e.g. `typeof CounterCubit`), so you never have to re-declare a state shape that already lives on the class.

### `ExtractState`

**Signature**

```ts
export type ExtractState<T> =
  T extends StateContainerConstructor<infer S> ? Readonly<S> : never;
```

Extracts the state type from a container constructor as a `Readonly<S>`. This is the type you get back from `useBloc` and from the `state` getter — read-only, because state is immutable from the outside. Resolves to `never` if `T` is not a container constructor.

```ts twoslash
import { Cubit } from '@blac/core';
import type { ExtractState } from '@blac/core';
interface CounterState {
  count: number;
  label: string;
}
class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, label: 'idle' });
  }
}
// ---cut---
type S = ExtractState<typeof CounterCubit>;
//   ^?
```

### `ExtractStateMutable`

**Signature**

```ts
export type ExtractStateMutable<T> =
  T extends StateContainerConstructor<infer S> ? S : never;
```

The same as `ExtractState`, but without the `Readonly<>` wrapper — the raw `S` as the class declared it. Reach for this only when you genuinely need a mutable view (for example, building the next state object before you `emit` it); prefer `ExtractState` everywhere a value is being read.

```ts twoslash
import { Cubit } from '@blac/core';
import type { ExtractStateMutable } from '@blac/core';
interface CounterState {
  count: number;
  label: string;
}
class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, label: 'idle' });
  }
}
// ---cut---
type Draft = ExtractStateMutable<typeof CounterCubit>;
//   ^?
```

### `ExtractArgs`

**Signature**

```ts
export type ExtractArgs<T> = T extends new () => StateContainer<
  any,
  infer A,
  any
>
  ? A
  : void;
```

Extracts the `Args` type — the serializable data a bloc is constructed/identified with (see [Passing Inputs](/guide/inputs)). Falls back to `void` when the class declares no args. Note the match is against a zero-argument constructor shape (`new () =>`), which is how container subclasses are written.

```ts twoslash
import { Cubit } from '@blac/core';
import type { ExtractArgs } from '@blac/core';
// ---cut---
interface UserState {
  name: string;
}
class UserCubit extends Cubit<UserState, { userId: string }> {
  constructor() {
    super({ name: '' });
  }
}

type A = ExtractArgs<typeof UserCubit>;
//   ^?
```

### `ExtractDeps`

**Signature**

```ts
export type ExtractDeps<T> = T extends new () => StateContainer<
  any,
  any,
  infer D
>
  ? D
  : Record<string, never>;
```

Extracts the `Deps` type — the injected non-serializable handles (clients, services, other blocs) a container depends on. Falls back to `Record<string, never>` (the "no deps" shape) when none are declared.

```ts twoslash
import { Cubit } from '@blac/core';
import type { ExtractDeps } from '@blac/core';
// ---cut---
interface FeedState {
  posts: string[];
}
class FeedCubit extends Cubit<FeedState, void, { api: { fetch(): void } }> {
  constructor() {
    super({ posts: [] });
  }
}

type D = ExtractDeps<typeof FeedCubit>;
//   ^?
```

### `ExtractConstructorArgs`

**Signature**

```ts
export type ExtractConstructorArgs<T> = T extends new (...args: infer P) => any
  ? P
  : never[];
```

Extracts the _runtime_ constructor parameter tuple from any class — this is plain TypeScript constructor inference, not BlaC's `Args`. Use it when you need the literal `constructor(...)` parameters of a class. Resolves to `never[]` for non-constructors.

```ts twoslash
import type { ExtractConstructorArgs } from '@blac/core';
// ---cut---
class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

type P = ExtractConstructorArgs<typeof Point>;
//   ^?
```

## Instance and constructor types

These describe the _instance_ a container class produces, and the _constructor_ shape (including the static registry methods like `acquire` and `release`) that `@blac/core` and `@blac/react` use to type their entry points.

### `BlocInstanceType`

**Signature**

```ts
export type BlocInstanceType<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: any) => infer R ? R : any;
```

Resolves a constructor type to its instance type, including abstract classes. It is the abstract-aware sibling of TypeScript's built-in `InstanceType<T>` (which rejects abstract constructors). Because `Cubit` and `StateContainer` are abstract, this is the safe choice for "the instance of this class."

```ts twoslash
import { Cubit } from '@blac/core';
import type { BlocInstanceType } from '@blac/core';
interface CounterState {
  count: number;
  label: string;
}
class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, label: 'idle' });
  }
}
// ---cut---
type Instance = BlocInstanceType<typeof CounterCubit>;
```

### `BlocConstructor`

**Signature**

```ts
export type BlocConstructor<
  S extends object = any,
  T extends new (...args: any[]) => StateContainer<S, any, any> = new (
    ...args: any[]
  ) => StateContainer<S, any, any>,
> = (new (...args: any[]) => InstanceType<T>) & {
  acquire(instanceKey?: string, ...args: any[]): InstanceType<T>;
  borrow(instanceKey?: string, ...args: any[]): InstanceType<T> | null;
  borrowSafe(
    instanceKey?: string,
    ...args: any[]
  ):
    | { error: Error; instance: null }
    | { error: null; instance: InstanceType<T> };
  ensure(instanceKey?: string): InstanceType<T>;
  release(instanceKey?: string): void;
  keepAlive?: boolean;
};
```

A constructor type that, on top of being a container class, also declares a static registry surface (`acquire`, `borrow`, `borrowSafe`, `ensure`, `release`, plus the optional `keepAlive` flag). It is a structural description used by signatures that want to talk about that surface as static class members. Note that an ordinary `Cubit` / `Bloc` subclass does **not** satisfy `BlocConstructor` on its own — the base `StateContainer` declares no such static methods, so a plain class is missing all five. To operate the registry you pass the class to the standalone `acquire` / `release` functions, whose parameter type is the lighter [`StateContainerConstructor`](#statecontainerconstructor) (no static surface required). See [Instance Management](/core/instance-management) for what those functions do.

```ts twoslash
import { acquire, release } from '@blac/core';
import type { BlocConstructor, StateContainerConstructor } from '@blac/core';
import { Cubit } from '@blac/core';
interface CounterState {
  count: number;
  label: string;
}
class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, label: 'idle' });
  }
}
// ---cut---
// A helper that only needs "some container class" uses StateContainerConstructor.
// A plain Cubit/Bloc subclass satisfies this directly.
function describe(Bloc: StateContainerConstructor) {
  const inst = acquire(Bloc);
  release(Bloc);
  return inst;
}

describe(CounterCubit);

// BlocConstructor is the heavier shape: a container class that ALSO exposes the
// registry methods as statics. You annotate with it where that surface matters.
type CounterCtor = BlocConstructor<CounterState>;
//   ^?
```

### `InstanceReadonlyState`

**Signature**

```ts
export type InstanceReadonlyState<T extends StateContainerConstructor = any> =
  Omit<InstanceType<T>, 'state'> & { state: ExtractState<T> };
```

The instance type of a container class with its `state` property narrowed to the `Readonly` state for that class. Useful when you want the full instance (methods, getters) but with a precisely-typed, read-only `state`.

```ts twoslash
import { Cubit } from '@blac/core';
import type { InstanceReadonlyState } from '@blac/core';
interface CounterState {
  count: number;
  label: string;
}
class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, label: 'idle' });
  }
}
// ---cut---
type ReadonlyInstance = InstanceReadonlyState<typeof CounterCubit>;
declare const c: ReadonlyInstance;
c.state.count;
//        ^?
```

### `InstanceState`

**Signature**

```ts
export type InstanceState<T extends StateContainerConstructor = any> = Omit<
  InstanceType<T>,
  'state'
> & { state: ExtractStateMutable<T> };
```

Like `InstanceReadonlyState`, but the `state` property is the _mutable_ `S` rather than `Readonly<S>`. Reach for it only when you specifically need a writable view of state on a typed instance.

```ts twoslash
import { Cubit } from '@blac/core';
import type { InstanceState } from '@blac/core';
interface CounterState {
  count: number;
  label: string;
}
class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, label: 'idle' });
  }
}
// ---cut---
type MutableInstance = InstanceState<typeof CounterCubit>;
```

### `StateContainerInstance`

**Signature**

```ts
export type StateContainerInstance<S extends object = any> = Omit<
  StateContainer<S, any, any>,
  'state'
> & { state: Readonly<S> };
```

A `StateContainer` instance keyed by its _state_ type `S` rather than by a concrete class, with `state` narrowed to `Readonly<S>`. Use it when you want to describe "any container holding this state shape" without pinning a specific subclass.

```ts twoslash
import type { StateContainerInstance } from '@blac/core';
// ---cut---
interface CounterState {
  count: number;
  label: string;
}
function readCount(c: StateContainerInstance<CounterState>) {
  return c.state.count;
}
```

### `StateContainerConstructor`

**Signature**

```ts
export type StateContainerConstructor<S extends object = any> = new (
  ...args: any[]
) => StateContainer<S, any, any>;
```

The minimal constructor type for a container class, parameterized by state `S`. It is the constraint the extraction utilities (`ExtractState`, `ExtractStateMutable`, `InstanceReadonlyState`, `InstanceState`) match against. Unlike [`BlocConstructor`](#blocconstructor) it carries no static registry methods — use it where you only care that something is a container class.

```ts twoslash
import { Cubit } from '@blac/core';
import type { StateContainerConstructor } from '@blac/core';
interface CounterState {
  count: number;
  label: string;
}
class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, label: 'idle' });
  }
}
// ---cut---
const Ctor: StateContainerConstructor<CounterState> = CounterCubit;
```

## Branded IDs

BlaC tags instance-identity strings with a _brand_ so a plain `string` cannot be passed where an `InstanceId` is expected. The brand is a compile-time-only phantom property keyed by a `unique symbol`; it has no runtime footprint — branded values are just strings at runtime.

### `Brand`

**Signature**

```ts
declare const brand: unique symbol;

export type Brand<T, B> = T & { [brand]: B };
```

The general nominal-typing helper: intersects a base type `T` with a phantom property under a private `unique symbol`, tagged by the brand identifier `B`. Two `Brand`s with different `B` are incompatible even when `T` is identical, which is what prevents accidental mixing of similar primitive types.

```ts twoslash
import type { Brand } from '@blac/core';
// ---cut---
type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

declare const u: UserId;
declare function loadOrder(id: OrderId): void;
// @errors: 2345
loadOrder(u);
```

### `BrandedId`

**Signature**

```ts
export type BrandedId<B> = Brand<string, B>;
```

A convenience alias for the common case of branding a `string`: `BrandedId<B>` is exactly `Brand<string, B>`. Use it whenever the base type is a string ID.

```ts twoslash
import type { BrandedId } from '@blac/core';
// ---cut---
type SessionId = BrandedId<'SessionId'>;
```

### `InstanceId`

**Signature**

```ts
export type InstanceId = Brand<string, 'InstanceId'>;
```

The branded `string` type BlaC uses for state-container instance identities — `BrandedId<'InstanceId'>` by another name. Registry and identity APIs accept and return this rather than a bare `string`, so an arbitrary string cannot stand in for an instance key by accident.

```ts twoslash
import type { InstanceId } from '@blac/core';
// ---cut---
declare function lookup(id: InstanceId): void;
// @errors: 2345
lookup('not-branded');
```

### `instanceId()`

**Signature**

```ts
export function instanceId(id: string): InstanceId {
  return id as InstanceId;
}
```

The value-level helper that brands a plain `string` as an [`InstanceId`](#instanceid). It is a pure cast at runtime (returns the input unchanged); its only job is to give you a typed `InstanceId` to hand to APIs that require one, without writing the `as InstanceId` assertion yourself.

```ts twoslash
import { instanceId } from '@blac/core';
import type { InstanceId } from '@blac/core';
// ---cut---
const id: InstanceId = instanceId('user-42');
```

## See also

- [TypeScript](/guide/typescript) — typing blocs end to end: generics, inference, and pitfalls
- [Cubit](/core/cubit) — the class these utilities extract types from
- [Instance Management](/core/instance-management) — `acquire` / `borrow` / `release` and the registry surface that `BlocConstructor` describes
- [Passing Inputs](/guide/inputs) — the args / deps identity model that `ExtractArgs` and `ExtractDeps` read
- [useBloc](/react/use-bloc) — where `ExtractState` shows up as the hook's return type
