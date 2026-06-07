---
title: TypeScript
description: How state shape, action signatures, args, deps, and select all flow from a single Cubit class declaration with minimal annotations.
---

BlaC is written in TypeScript and assumes you are too. Almost everything you need — state shape, action signatures, the args a consumer must pass — flows from a single class declaration, so most of this page is about _reading_ the inference rather than writing annotations.

This is the discoverable, example-driven tour. For the exhaustive list of exported type utilities (`ExtractState`, `ExtractArgs`, `ExtractDeps`, `InstanceReadonlyState`, and friends), see [Core Types](/core/types).

## Compiler posture

BlaC works with a standard strict React setup. The defaults that matter:

```jsonc
{
  "compilerOptions": {
    "target": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "useDefineForClassFields": true,
    "experimentalDecorators": true, // only if you use @blac(...) decorator syntax
  },
}
```

`strict: true` is the assumption behind every inference example below — `strictNullChecks` in particular is what makes `this.args` correctly `Args | undefined` and what forces you to narrow discriminated unions. Without it the examples still compile, but the safety they demonstrate is gone.

Decorators are optional. The `@blac(...)` configuration decorator works as either a legacy (`experimentalDecorators`) decorator _or_ a TC39/stage-3 decorator — pick whichever your toolchain emits. If you'd rather not touch decorator flags at all, the functional form needs none:

```ts twoslash
import { Cubit, blac } from '@blac/core';
// ---cut---
const AuthCubit = blac({ keepAlive: true })(
  class extends Cubit<{ user: string | null }> {
    constructor() {
      super({ user: null });
    }
  },
);
```

`blac(opts)(class)` is a plain higher-order function — no compiler flag, no syntax proposal. The decorator form is sugar over exactly this. See [Configuration](/core/configuration) for the full options union (`keepAlive`, `equality`, `excludeFromDevTools`, `key`).

:::tip[Match getting-started]
The tsconfig block above is the same one in [Getting Started](/guide/getting-started). If you change one, change both.
:::

## The three generics

Both `Cubit` and `StateContainer` take the same three type parameters, in the same order — `State`, `Args`, `Deps`:

```ts
abstract class StateContainer<
  S extends object = any,
  Args = void,
  Deps extends object = Record<string, never>,
> extends StructuralContainer<S> {}

abstract class Cubit<
  S extends object = any,
  Args = void,
  Deps extends object = Record<string, never>,
> extends StateContainer<S, Args, Deps> {}
```

So:

| Param  | Constraint       | Default                 | What it is                                       |
| ------ | ---------------- | ----------------------- | ------------------------------------------------ |
| `S`    | `extends object` | `any`                   | The state shape. Always provide it.              |
| `Args` | none             | `void`                  | Typed construction input passed to `init(args)`. |
| `Deps` | `extends object` | `Record<string, never>` | Non-serializable handles read via `this.deps`.   |

You only declare the ones you use, left to right. State-only is the common case:

```ts twoslash
import { Cubit } from '@blac/core';
// ---cut---
interface CounterState {
  count: number;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => this.emit({ count: this.state.count + 1 });
}
```

### How inference flows from `S`

Declaring `S` is the only annotation you need — `state`, `emit`, `update`, and `patch` all specialize from it. Hover any of these and you'll see the concrete type, not `any`:

```ts twoslash
import { Cubit } from '@blac/core';
// ---cut---
interface CounterState {
  count: number;
  label: string;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, label: 'start' });
  }

  demo() {
    const c = this.state.count;
    //    ^?
    this.emit({ count: 1, label: 'a' }); // emit/update take the FULL state
    this.update((s) => ({ ...s, count: s.count + 1 }));
    this.patch({ count: 2 }); // patch takes DeepPartial<S>
  }
}
```

`emit` and the value `update`'s callback returns both require the _complete_ `S` — omit a key and it's a type error, which is the compiler enforcing the replace-not-merge rule. `patch` accepts a `DeepPartial<S>`, so partial objects are legal there and only there:

```ts twoslash
// @errors: 2345
import { Cubit } from '@blac/core';
// ---cut---
interface CounterState {
  count: number;
  label: string;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, label: 'start' });
  }

  bad() {
    this.emit({ count: 1 }); // missing `label` — emit replaces, so this is an error
  }
}
```

## Getters as derived state

Anything computed from state belongs in a getter. Getters infer their return type, can't drift from the state they read, and require no extra type plumbing:

```ts twoslash
import { Cubit } from '@blac/core';
// ---cut---
interface CartState {
  items: { price: number; qty: number }[];
}

class CartCubit extends Cubit<CartState> {
  constructor() {
    super({ items: [] });
  }

  get total(): number {
    return this.state.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  get isEmpty() {
    // return type inferred as boolean — no annotation needed
    return this.state.items.length === 0;
  }
}
```

:::caution[A getter on the instance does not drive re-renders by itself]
Auto-tracking records reads on the `state` proxy, not on the bloc instance. Reading `cart.total` directly in render won't subscribe the component to `items`. To make a getter reactive, read it through [`select`](#typing-select) (`select: (state, bloc) => [bloc.total]`) or read the underlying state path in render. This is a _runtime_ tracking rule, not a type rule — the types let you read `cart.total` anywhere. See [Dependency Tracking](/react/dependency-tracking).
:::

## Discriminated unions and narrowing

The single most useful TypeScript pattern in BlaC is a discriminated-union state. Model a request as a `status` tag and the compiler will _force_ you to handle every case and _forbid_ you from reading a field before it exists.

Declare the union as the state type. Each variant carries only the data that's valid in that state:

```ts twoslash
import { Cubit } from '@blac/core';
// ---cut---
interface User {
  id: string;
  name: string;
}

type UserState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; user: User }
  | { status: 'error'; error: string };

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({ status: 'idle' });
  }

  load = async (id: string) => {
    this.emit({ status: 'loading' });
    try {
      const user = await fetchUser(id);
      this.emit({ status: 'success', user });
    } catch (e) {
      this.emit({ status: 'error', error: String(e) });
    }
  };
}

declare function fetchUser(id: string): Promise<User>;
```

Because `emit` wants the full `UserState`, you can't emit `{ status: 'success' }` without a `user` — the variant's required fields are checked at the emit site:

```ts twoslash
// @errors: 2345
import { Cubit } from '@blac/core';
// ---cut---
type UserState =
  | { status: 'idle' }
  | { status: 'success'; user: { id: string } };

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({ status: 'idle' });
  }

  oops() {
    this.emit({ status: 'success' }); // forgot `user`
  }
}
```

### Narrowing on the read side

The payoff is on the read side. Switch on `state.status` and inside each branch TypeScript narrows the union — `state.user` exists only in the `success` arm, `state.error` only in `error`. Here the consumer is a plain function so the inference is visible; in a component the same `state` comes out of `useBloc`:

```ts twoslash
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
interface User {
  id: string;
  name: string;
}
type UserState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; user: User }
  | { status: 'error'; error: string };
declare class UserCubit extends Cubit<UserState> {}
// ---cut---
function userLabel(): string {
  const [state] = useBloc(UserCubit);

  switch (state.status) {
    case 'idle':
      return 'Not loaded';
    case 'loading':
      return 'Loading…';
    case 'success':
      return `Hello ${state.user.name}`;
    //                      ^? (state narrowed to the success variant)
    case 'error':
      return `Failed: ${state.error}`;
  }
}
```

Rendered in a component, that's an ordinary `switch` over `state.status`:

```tsx
function UserCard() {
  const [state] = useBloc(UserCubit);

  switch (state.status) {
    case 'idle':
      return <p>Not loaded</p>;
    case 'loading':
      return <p>Loading…</p>;
    case 'success':
      return <p>Hello {state.user.name}</p>; // state.user only exists here
    case 'error':
      return <p>Failed: {state.error}</p>;
  }
}
```

Reaching for a field outside its variant is a compile error, which is exactly the bug class discriminated unions exist to kill:

```ts twoslash
// @errors: 2339
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
type UserState =
  | { status: 'loading' }
  | { status: 'success'; user: { name: string } };
declare class UserCubit extends Cubit<UserState> {}
// ---cut---
function userName(): string {
  const [state] = useBloc(UserCubit);
  // no narrowing yet — `user` doesn't exist on the `loading` arm
  return state.user.name;
}
```

:::tip[Exhaustiveness checking]
Give your `switch` a `default` that assigns `state` to `never`. Add a new variant later and forget to handle it, and the assignment fails to compile — a free reminder.

```ts twoslash
// @errors: 2322
type UserState = { status: 'idle' } | { status: 'loading' };
declare const state: UserState;
// ---cut---
function render(): string {
  switch (state.status) {
    case 'idle':
      return 'idle';
    // forgot the 'loading' case
    default: {
      const _exhaustive: never = state; // error: 'loading' is not assignable to never
      return _exhaustive;
    }
  }
}
```

:::

Narrowing works identically inside a getter — derive a flag once and read it everywhere:

```ts twoslash
import { Cubit } from '@blac/core';
// ---cut---
type UserState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; user: { name: string } }
  | { status: 'error'; error: string };

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({ status: 'idle' });
  }

  get displayName(): string {
    const s = this.state;
    return s.status === 'success' ? s.user.name : 'Guest';
    //                                  ^? (narrowed to the success variant)
  }
}
```

## Typing `select`

`select` lets a consumer use an explicit dependency array instead of auto-tracked reads. The component re-renders only when one of those values changes (compared per-index with `Object.is`). Its signature is:

```ts twoslash
import type {
  ExtractState,
  InstanceReadonlyState,
  StateContainerConstructor,
} from '@blac/core';
// ---cut---
type Select<TBloc extends StateContainerConstructor> = (
  state: ExtractState<TBloc>,
  bloc: InstanceReadonlyState<TBloc>,
) => unknown[];
```

Both arguments are fully inferred from the bloc you pass to `useBloc` — `state` is the readonly state, `bloc` is the readonly instance (so getters are reachable). The return type is `unknown[]`, an array of whatever values gate the re-render:

```ts twoslash
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
// ---cut---
interface CartState {
  items: { price: number; qty: number }[];
  coupon: string | null;
}

class CartCubit extends Cubit<CartState> {
  constructor() {
    super({ items: [], coupon: null });
  }
  get total() {
    return this.state.items.reduce((s, i) => s + i.price * i.qty, 0);
  }
}

function cartTotal(): number {
  // re-renders only when `total` or item count changes
  const [, cart] = useBloc(CartCubit, {
    select: (state, bloc) => [bloc.total, state.items.length],
    //                ^?
  });
  return cart.total;
}
```

`state` is `Readonly`, so `select` can't accidentally mutate it; that's also why reading a getter here (`bloc.total`) is the supported way to make a derived value drive re-renders. Keep the selector referentially stable — a fresh function each render re-keys the subscription. See [useBloc](/react/use-bloc#select).

## Conditional `args`

When a bloc declares an `Args` type, passing `args` to `useBloc` is _required_. When it doesn't (the default `void`), passing `args` is _forbidden_. The type system enforces both directions through a conditional option type (verified in `@blac/react`'s `types.ts`):

```ts twoslash
import type { ExtractArgs, StateContainerConstructor } from '@blac/core';
// ---cut---
type ArgsOption<T extends StateContainerConstructor> =
  ExtractArgs<T> extends void ? { args?: never } : { args: ExtractArgs<T> };
```

`ExtractArgs<T>` pulls the second generic off the class. If it's `void`, the option becomes `{ args?: never }` — present-but-forbidden. Otherwise it's `{ args: Args }` — required and typed.

A void-args bloc rejects `args` (the option's type there is `never`):

```ts twoslash
// @errors: 2322
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
// ---cut---
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}

function count(): number {
  // CounterCubit has no Args → passing `args` is a type error
  const [state] = useBloc(CounterCubit, { args: { foo: 1 } });
  return state.count;
}
```

A bloc that declares `Args` requires it, with the exact shape. Note the enforcement only kicks in once you pass an options object: the whole second parameter is optional, so `useBloc(UserCubit)` with _no_ options compiles, but `useBloc(UserCubit, {})` reports the missing `args`:

```ts twoslash
// @errors: 2345
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
// ---cut---
interface UserState {
  name: string;
}

class UserCubit extends Cubit<UserState, { userId: string }> {
  constructor() {
    super({ name: '' });
  }
  protected init(args: { userId: string }) {
    void args.userId;
  }
}

function userName(): string {
  // passing options without `args` is a compile error
  const [state] = useBloc(UserCubit, {});
  return state.name;
}
```

Provide it correctly and `args` is type-checked against the declared shape:

```ts twoslash
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
interface UserState {
  name: string;
}
class UserCubit extends Cubit<UserState, { userId: string }> {
  constructor() {
    super({ name: '' });
  }
}
// ---cut---
function userName(userId: string): string {
  const [state, user] = useBloc(UserCubit, { args: { userId } });
  //            ^?
  return state.name;
}
```

Inside the bloc, the `args` getter is `Args | undefined` (it's unset until the instance is acquired), so reach for the value `init(args)` hands you when you need it non-optionally:

```ts twoslash
import { Cubit } from '@blac/core';
// ---cut---
class UserCubit extends Cubit<{ name: string }, { userId: string }> {
  constructor() {
    super({ name: '' });
  }

  protected init(args: { userId: string }) {
    // `args` here is the non-optional declared shape
    void this.fetch(args.userId);
  }

  retry() {
    // the `args` GETTER is `Args | undefined` — guard it
    const id = this.args?.userId;
    //    ^?
    if (id) void this.fetch(id);
  }

  private async fetch(_id: string) {}
}
```

## A typed custom hook

Wrapping `useBloc` in a domain hook is the idiomatic way to give a feature a named, typed entry point. Inference is preserved end to end as long as you don't widen the return — let it flow:

```ts twoslash
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
// ---cut---
interface TodoState {
  items: string[];
  filter: 'all' | 'active' | 'done';
}

class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({ items: [], filter: 'all' });
  }
  add = (t: string) => this.patch({ items: [...this.state.items, t] });
  get count() {
    return this.state.items.length;
  }
}

// Custom hook: no explicit return annotation needed — it's inferred as
// [Readonly<TodoState>, InstanceReadonlyState<typeof TodoCubit>, ...]
function useTodos() {
  return useBloc(TodoCubit);
}

function todoCount(): number {
  const [state, todo] = useTodos();
  //            ^?
  todo.add('x');
  return state.items.length;
}
```

For a hook that takes arguments, type the parameters and forward them — the bloc's `Args` requirement still applies at the call site inside the hook:

```ts twoslash
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
// ---cut---
interface UserState {
  name: string;
}

class UserCubit extends Cubit<UserState, { userId: string }> {
  constructor() {
    super({ name: '' });
  }
  protected init(args: { userId: string }) {
    void args.userId;
  }
}

// the hook's signature documents what the feature needs
function useUser(userId: string) {
  return useBloc(UserCubit, { args: { userId } });
}

function profileName(id: string): string {
  const [state] = useUser(id);
  return state.name;
}
```

If you _do_ want to annotate the return — for a public package API, say — derive it from the bloc rather than restating the shape. `ExtractState` and `InstanceReadonlyState` are exported from `@blac/core`:

```ts twoslash
import { Cubit } from '@blac/core';
import type { ExtractState, InstanceReadonlyState } from '@blac/core';
import { useBloc } from '@blac/react';
declare class TodoCubit extends Cubit<{ items: string[] }> {}
// ---cut---
type TodoState = ExtractState<typeof TodoCubit>;
//   ^?
type TodoBloc = InstanceReadonlyState<typeof TodoCubit>;

function useTodos(): [TodoState, TodoBloc] {
  const [state, bloc] = useBloc(TodoCubit);
  return [state, bloc];
}
```

These utilities, plus `ExtractArgs`, `ExtractDeps`, and the rest, are documented in full in [Core Types](/core/types).

## See also

- [Core Types](/core/types) — the exhaustive reference for every exported type utility
- [Cubit](/core/cubit) — `emit` / `update` / `patch`, `init`, getters, and lifecycle
- [useBloc](/react/use-bloc) — the hook, its option surface, and `select`
- [Passing Inputs](/guide/inputs) — the `args` / `deps` / events model in depth
- [Dependency Tracking](/react/dependency-tracking) — why a getter needs `select` to re-render
