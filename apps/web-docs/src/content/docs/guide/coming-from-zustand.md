---
title: Coming from Zustand
description: How Zustand's no-provider store maps onto BlaC, where logic lives, how re-renders are scoped, and a side-by-side bear-counter port.
---

Zustand and BlaC share the same "no provider" philosophy and a minimal surface area. The divergence is in
_where logic lives_ (a closure vs a class), _how re-renders are scoped_ (an explicit selector vs
auto-tracked read paths), and _what you get for free as complexity grows_ (a flat store vs a typed unit
you can test in isolation).

If you are comfortable with Zustand but find yourself writing many selectors, leaking logic into
components, or struggling to test state mutations, BlaC is a natural next step.

## Concept mapping

| Zustand term                       | BlaC term                                                              | Notes                                                               |
| ---------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `create((set, get) => ...)`        | `class MyCubit extends Cubit<S>`                                       | Logic lives in the class body instead of a closure                  |
| `set(partial)`                     | `this.patch(partial)` / `this.emit(next)`                              | `patch` deep-merges; `emit` replaces                                |
| `get()`                            | `this.state`                                                           | Read current state from the instance property                       |
| `useStore(selector)`               | `useBloc(MyCubit)` + auto-tracked `state`                              | No selector needed; tracking is inferred from what the render reads |
| `useStore((s) => s.count)`         | `useBloc(MyCubit)` reading `state.count`                               | Reading `state.count` in render _is_ the subscription               |
| Middleware (`devtools`, `persist`) | First-party plugins (`@blac/devtools-connect`, `@blac/plugin-persist`) | Plugin API is explicit; installed once globally                     |
| `subscribeWithSelector`            | `watch(MyCubit, cb)`                                                   | Outside React; no middleware needed                                 |
| `createWithEqualityFn`             | `select` option on `useBloc`                                           | `select: (s, b) => [s.derived]` — re-render only when array changes |
| Slices pattern (`combine`)         | Separate `Cubit` per concern                                           | Each Cubit is already a self-contained slice                        |
| Immer middleware                   | `patch(partial)` (built-in deep-merge)                                 | Or use spread in `update` — no middleware required                  |

## The key model difference

Zustand stores logic in a `create()` closure. The object it returns is both the state and the actions —
a flat record with properties and function values mixed together. Re-render scoping requires an explicit
selector passed to every hook call.

BlaC separates the concerns: state is typed separately from the class body, methods are class methods,
and the hook returns a `[state, bloc]` tuple. Because the hook wraps `state` in a Proxy during render,
it records which paths the component reads — no selector needed.

## Side-by-side port: a bear counter

**Zustand**

```tsx
import { create } from 'zustand';

interface BearStore {
  bears: number;
  honey: number;
  increasePopulation: () => void;
  eatHoney: () => void;
  reset: () => void;
}

const useBearStore = create<BearStore>((set) => ({
  bears: 0,
  honey: 10,
  increasePopulation: () => set((s) => ({ bears: s.bears + 1 })),
  eatHoney: () => set((s) => ({ honey: Math.max(0, s.honey - 1) })),
  reset: () => set({ bears: 0, honey: 10 }),
}));

function BearCounter() {
  // explicit selector — component only re-renders when bears changes
  const bears = useBearStore((s) => s.bears);
  const increase = useBearStore((s) => s.increasePopulation);
  return <button onClick={increase}>Bears: {bears}</button>;
}

function HoneyJar() {
  const honey = useBearStore((s) => s.honey);
  const eat = useBearStore((s) => s.eatHoney);
  return <button onClick={eat}>Honey: {honey}</button>;
}
```

**BlaC**

```ts twoslash
import { Cubit } from '@blac/core';
// ---cut---
class BearCubit extends Cubit<{ bears: number; honey: number }> {
  constructor() {
    super({ bears: 0, honey: 10 });
  }

  increasePopulation = () => this.patch({ bears: this.state.bears + 1 });

  eatHoney = () => this.patch({ honey: Math.max(0, this.state.honey - 1) });

  reset = () => this.emit({ bears: 0, honey: 10 });
}
```

```tsx
import { useBloc } from '@blac/react';

function BearCounter() {
  // reading state.bears → component re-renders only when bears changes
  const [state, bear] = useBloc(BearCubit);
  return (
    <button onClick={bear.increasePopulation}>Bears: {state.bears}</button>
  );
}

function HoneyJar() {
  // reading state.honey → re-renders only when honey changes
  const [state, bear] = useBloc(BearCubit);
  return <button onClick={bear.eatHoney}>Honey: {state.honey}</button>;
}
```

`BearCounter` and `HoneyJar` re-render independently — each only wakes on the path it actually reads.
With Zustand you would write two `useStore((s) => s.x)` selectors by hand. With BlaC the read _is_ the
subscription; no selector required.

## Where logic grows

The flat closure model works well for small stores. As a slice accumulates validation, derived values,
and async flows, the Zustand pattern collapses everything into one growing object literal. The BlaC Cubit
keeps those concerns in class methods and getters:

**Zustand — a growing store**

```ts
const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  removeItem: (id) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  // getter-like value mixed into the store shape
  get total() {
    return get().items.reduce((sum, i) => sum + i.price * i.qty, 0);
  },
  checkout: async () => {
    const items = get().items;
    await api.checkout(items);
    set({ items: [] });
  },
}));
```

**BlaC — the same cart**

```ts twoslash
import { Cubit } from '@blac/core';

interface CartItem {
  id: string;
  price: number;
  qty: number;
}
declare const api: { checkout(items: CartItem[]): Promise<void> };
// ---cut---
class CartCubit extends Cubit<{ items: CartItem[] }> {
  constructor() {
    super({ items: [] });
  }

  addItem = (item: CartItem) =>
    this.patch({ items: [...this.state.items, item] });

  removeItem = (id: string) =>
    this.patch({ items: this.state.items.filter((i) => i.id !== id) });

  get total() {
    return this.state.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  checkout = async () => {
    await api.checkout(this.state.items);
    this.emit({ items: [] });
  };
}
```

The Cubit is testable without React or a mock store wrapper:

```ts twoslash
import { Cubit } from '@blac/core';

interface CartItem {
  id: string;
  price: number;
  qty: number;
}
class CartCubit extends Cubit<{ items: CartItem[] }> {
  constructor() {
    super({ items: [] });
  }
  addItem = (item: CartItem) =>
    this.patch({ items: [...this.state.items, item] });
  get total() {
    return this.state.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }
}
// ---cut---
const cart = new CartCubit();
cart.addItem({ id: 'a', price: 10, qty: 2 });
cart.addItem({ id: 'b', price: 5, qty: 1 });

console.log(cart.total); // 25
```

No `act()`, no render harness, no `getState()` reached through a store handle.

## Middleware → plugins

Zustand middleware wraps the store creator (devtools, persist, immer). BlaC uses a plugin system
installed once globally:

```ts
import { getPluginManager } from '@blac/core';
import { createDevToolsBrowserPlugin } from '@blac/devtools-connect';
import { createIndexedDbPersistPlugin } from '@blac/plugin-persist';
import { LoggingPlugin } from '@blac/logging-plugin';

getPluginManager().install(createDevToolsBrowserPlugin(), {
  environment: 'development',
});
getPluginManager().install(createIndexedDbPersistPlugin());
getPluginManager().install(new LoggingPlugin({ level: 'info' }), {
  environment: 'development',
});
```

No middleware composition, no `devtools(persist(immer(...)))` nesting. Plugins observe all Cubits
globally; you can opt individual Cubits out via `@blac({ excludeFromDevTools: true })`.

## Subscribing outside React

Zustand's `subscribeWithSelector` and its vanilla `store.subscribe` travel to BlaC's `watch`:

```ts twoslash
import { Cubit } from '@blac/core';
import { watch } from '@blac/core';

class BearCubit extends Cubit<{ bears: number; honey: number }> {
  constructor() {
    super({ bears: 0, honey: 10 });
  }
}
// ---cut---
const unwatch = watch(BearCubit, (bloc) => {
  document.title = `Bears: ${bloc.state.bears}`;
});

// later:
unwatch();
```

`watch` observes a Cubit's state from outside React. No store handle, no selector middleware needed.

## Slices → separate Cubits

The Zustand slices pattern (`combine`, `createSlice`) splits one large store into sections that are
merged back together. BlaC separates concerns at the class level — each Cubit is already an
independent slice. Cross-cubit access uses `this.depend()`:

```ts twoslash
import { Cubit } from '@blac/core';

class AuthCubit extends Cubit<{ user: string | null }> {
  constructor() {
    super({ user: null });
  }
}
// ---cut---
class CartCubit extends Cubit<{ items: string[] }> {
  private auth = this.depend(AuthCubit);

  constructor() {
    super({ items: [] });
  }

  checkout = async () => {
    const authState = this.auth.untracked().state;
    if (!authState.user) throw new Error('Not logged in');
    // ... proceed
  };
}
```

No slice merging, no shared-store handle. `depend` returns a handle that resolves the Cubit from the
registry, keeping the two slices decoupled.

## Re-render scoping: selector vs auto-track

The most common Zustand pattern is a per-hook selector:

```tsx
// Zustand — every subscription needs a selector
const count = useCounterStore((s) => s.count);
const name = useUserStore((s) => s.profile.name);
```

BlaC infers the subscription from the render read:

```tsx
// BlaC — read it, that's the subscription
const [counterState] = useBloc(CounterCubit);
const [userState] = useBloc(UserCubit);
// count = counterState.count, name = userState.profile.name
// no selectors written
```

When you do need finer control — a computed value, a cross-field condition — use the `select` option:

```tsx
const [state] = useBloc(CartCubit, {
  select: (s, cart) => [cart.total], // re-render only when total changes
});
```

## Mental-model shift

| Zustand                                     | BlaC                                                   |
| ------------------------------------------- | ------------------------------------------------------ |
| `create()` closure holds state + actions    | Class body holds state type + methods                  |
| Explicit selector per hook call             | Auto-tracked read paths; `select` for computed values  |
| Middleware stack (`devtools(persist(...))`) | Plugin list installed once globally                    |
| `subscribeWithSelector` for outside-React   | `watch(Class, cb)` — no middleware needed              |
| Slices merged via `combine`                 | Independent Cubits; cross-cubit via `depend()`         |
| Mutations tested via `getState()`           | Mutations tested by calling methods on `new MyCubit()` |
| `immer` middleware for nested merges        | `patch(partial)` built in                              |

## When to stay with Zustand

BlaC earns its weight when state accumulates logic worth testing, derived values, or async flows. If
your state is a handful of booleans in a flat object that never grows a method, Zustand's closure is
the lower-overhead choice. See [When to use BlaC](/guide/introduction#when-to-use-blac).

## See also

- [Comparison](/guide/comparison) — BlaC vs Zustand vs Jotai side by side, including when Zustand is the better fit
- [Core Concepts](/guide/concepts) — state containers, registry, dependency tracking
- [useBloc](/react/use-bloc) — full hook reference with `args`, `select`, `onMount`
- [Dependency Tracking](/react/dependency-tracking) — auto-tracking and `select` in depth
- [Patterns & Recipes](/guide/patterns) — cross-bloc deps, persistence, async
