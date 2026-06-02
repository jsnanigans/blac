---
title: Comparison
description: An honest, side-by-side look at how BlaC compares to Zustand and Jotai, and when each is the better choice.
---

If you are evaluating BlaC against Zustand or Jotai, the first question is usually skeptical: _why a class?_ Hooks-first stores feel lighter, and "OOP for state" reads like a step backwards. This page makes the affirmative case first, then puts the three side by side honestly — including the cases where Zustand or Jotai is the better choice.

This is positioning, not a feature scoreboard. None of these libraries is wrong; they make different bets. The goal here is to make BlaC's bet legible so you can tell whether it is yours.

## Why a class is the unit of logic

The class is not ceremony for its own sake. Each thing it gives you is a direct answer to a recurring pain in store-closure or atom-graph designs.

**Logic is colocated with the state it mutates.** State shape, the methods that change it, derived values, and async flows live in one cohesive unit. A `CartCubit` holds `items` and _also_ holds `addItem`, `removeItem`, `checkout`, and `get total`. You do not chase a mutation across a reducer file, an action-creators file, and a selectors file — the concern is one class. When the cart's rules change, you edit one place.

**You can test it without React.** A Cubit has no dependency on React, the DOM, or hooks. You construct it, call methods, and assert on `state` and getters directly — a plain unit test, no render harness, no `act()`, no test renderer:

```ts
const cart = new CartCubit();
cart.addItem({ id: 'a', price: 10, qty: 2 });
expect(cart.total).toBe(20);
```

Store-closure designs can be tested headless too, but it is less direct: you reach through the store's `getState`/`setState` rather than calling a method on an object, and shared mutable module state between tests is easy to leak. A fresh `new CartCubit()` per test is the natural isolation boundary.

**Getters are derived state, for free.** A `get total()` recomputes from `items` on every read, so it can never drift from its source. The tracker records the getter's underlying reads, so a component that reads `cart.total` wakes only when `items` actually changes the computed result — no `useMemo`, no `reselect`, no memo input arrays to keep in sync. Derived state in an atom library is its own atom you compose and wire; here it is a method body.

**The lineage is `flutter_bloc`, deliberately.** "Business Logic Component" is the Flutter pattern: a class that owns a slice of logic and emits state. BlaC keeps the `Cubit` half of that lineage (methods you call, not events you dispatch — there is no `Bloc` event class; see [Best Practices](/guide/best-practices)) because the testability and colocation win travels straight across from Flutter to React.

**Re-renders are per consumer, automatically.** Each `useBloc` call site gets its own render-time proxy and its own recorded set of read paths. Two components reading the same instance subscribe to different fields and wake independently — without you writing a selector per subscription. The dependency declaration _is_ the JSX. The full mechanism is in [Mental Model](/guide/mental-model).

:::note[This is a real tradeoff]
A class is heavier than a `create((set) => ...)` closure or a one-line atom for trivial state. If your state is a single boolean or a counter that never grows logic, that weight is not buying you anything. BlaC earns its keep as a slice of state accumulates _mutations, derived values, and async_ — not at the first `useState`.
:::

## At a glance

A fixed rubric across the three. Read it as "how each library answers this question," not as winners and losers.

|                         | **BlaC**                                              | **Zustand**                                        | **Jotai**                                          |
| ----------------------- | ----------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------- |
| **State model**         | Class (`Cubit`) with methods + getters                | `create()` store closure with `set`/`get`          | Composable atoms (primitive + derived)             |
| **Render optimization** | Auto-tracked read paths, per consumer (no selector)   | Selector you pass to the hook (`useStore(s => …)`) | Per-atom subscription; granularity from atom split |
| **Boilerplate**         | Class + `super(initial)`; methods are intents         | Minimal; one closure                               | Minimal per atom; grows with atom count + wiring   |
| **Providers**           | None — global ref-counted registry                    | None by default (optional context store)           | `Provider` for scoping/SSR (optional at root)      |
| **TS inference**        | State flows from the class type param                 | Strong; sometimes needs a typed `create<T>()`      | Strong; derived-atom types inferred                |
| **Async**               | `async` methods on the class; explicit status state   | Async actions in the store closure                 | Async atoms (promise atoms, Suspense-friendly)     |
| **DevTools**            | First-party `@blac/devtools` plugin                   | Redux DevTools middleware                          | Jotai DevTools / Redux DevTools integration        |
| **SSR**                 | Per-request isolation via instance keys / registry    | Supported; hydrate store on the client             | Strong story via `Provider` + hydration            |
| **Framework-agnostic**  | Core is framework-agnostic; React adapter is separate | Core is framework-agnostic; vanilla + React        | React-centric (Jotai core targets React)           |
| **Bundle size**         | Measured: core ~6.88 kB, react ~2.6 kB (brotli)       | Tiny; see their published claims                   | Tiny core; grows with utility imports              |

Bundle-size detail is in [its own section below](#bundle-size) — only BlaC's number is measured here; the others are described qualitatively on purpose.

## Honest comparisons

BlaC borrows liberally and differs deliberately. Here is where it sits relative to tools you likely know — including Redux, MobX, and Context for completeness — and when one of them is the better fit.

| Library             | What BlaC borrows                                                                   | What BlaC does differently                                                                                                                                                                      | Reach for it instead when                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Redux (Toolkit)** | Single source of truth per concern; immutable updates; a devtools/time-travel story | No global reducer/action/dispatch indirection; logic is methods on a class, not reducers + action creators; auto-tracking replaces hand-written selectors                                       | You need a strict, serializable action log as the center of your architecture, or large-team conventions built around RTK                           |
| **Zustand**         | No-provider, hook-first store; minimal API                                          | State lives in a class with methods and getters (not a `create((set) => ...)` closure); re-render scope is per-read-path automatically, not a selector you pass to the hook                     | You want the smallest possible store with no class ceremony and are happy writing selectors per subscription                                        |
| **MobX**            | Read-to-subscribe transparent reactivity; derived values feel free                  | Reactivity is render-time path recording over **immutable** snapshots, not observable mutable objects with autorun; you replace state, you don't mutate it; no decorators required for tracking | You want deep observable graphs with `computed`/`reaction` and prefer mutate-in-place ergonomics                                                    |
| **React Context**   | Tree-free _consumption_ ergonomics (just call a hook)                               | Sharing is registry identity, not provider position; no subtree re-render on change; instances are ref-counted and disposable                                                                   | The value is genuinely tree-scoped config (theme, locale, a request) that should follow the component tree, change rarely, and never needs disposal |
| **Jotai / Recoil**  | Fine-grained, atom-like subscription granularity                                    | Granularity comes from _which paths you read in one state object_, not from composing many atoms; one cohesive class instead of a graph of atoms                                                | You think in independent composable atoms and want bottom-up derived-atom graphs                                                                     |

What to take from the table: BlaC's distinctive bet is **transparent reactivity (like MobX) over immutable snapshots (like Redux), with no provider and automatic lifecycle (unlike both)**. The granularity of an atom library without managing atoms; the testability of a class without the reducer boilerplate. If your problem is genuinely a serializable event log, a tree-scoped config value, or a handful of `useState` hooks, the honest answer is that one of those tools fits better — see the "when to use BlaC" framing in the [Introduction](/guide/introduction#when-to-use-blac).

## The same counter, three ways

A counter is too small to _need_ any of these libraries — that is exactly why it isolates the shape of each model. Watch where the logic lives and how a component subscribes.

**Zustand** — logic in a `create()` closure; the component passes a selector to scope its re-renders.

```tsx
import { create } from 'zustand';

const useCounter = create<{
  count: number;
  increment: () => void;
}>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));

function Counter() {
  const count = useCounter((s) => s.count);
  const increment = useCounter((s) => s.increment);
  return <button onClick={increment}>Count: {count}</button>;
}
```

**Jotai** — state and its updater are atoms; the component subscribes to the atom it reads.

```tsx
import { atom, useAtom } from 'jotai';

const countAtom = atom(0);

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  return <button onClick={() => setCount((c) => c + 1)}>Count: {count}</button>;
}
```

**BlaC** — logic in a class; the component reads `state.count` and that read _is_ the subscription.

```ts twoslash
import { Cubit } from '@blac/core';
// ---cut---
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.emit({ count: this.state.count + 1 });
}
```

```tsx
import { useBloc } from '@blac/react';

function Counter() {
  const [state, counter] = useBloc(CounterCubit);
  return <button onClick={counter.increment}>Count: {state.count}</button>;
}
```

The three converge on roughly the same line count for a counter. The divergence shows up as logic grows: the Zustand closure and the Jotai atom set accumulate updaters and derived atoms inline, while the Cubit accumulates methods and getters as a typed unit you can test in isolation. The render-scoping line — `useCounter((s) => s.count)` vs `useAtom(countAtom)` vs an untouched `state.count` read — is the per-consumer-isolation difference made literal: BlaC infers it from the read, the other two make it explicit (a selector, or which atom you reach for).

## Which one to choose

**Choose BlaC when** state is _shared, complex, and worth testing without React_: validation, derived values, async flows, cross-bloc coordination. You want logic colocated in a typed unit, automatic per-read re-render scoping, and a ref-counted lifecycle with no providers — and you are comfortable with classes as the organizing idea.

**Choose Zustand when** you want the smallest possible store with no class ceremony, are happy writing a selector per subscription to scope re-renders, and your logic stays close to a flat closure. It is an excellent floor for "I just need a shared store."

**Choose Jotai when** you think bottom-up in independent, composable pieces — derived-atom graphs, fine-grained Suspense-friendly async, state that is naturally a web of small values rather than a few cohesive slices. Atoms shine when the composition _is_ the model.

If a piece of state lives in one component and never travels, none of the three earns its weight — reach for `useState`. See [When to use BlaC](/guide/introduction#when-to-use-blac).

## Bundle size

BlaC's footprint is **measured in CI with [size-limit](https://github.com/ai/size-limit)** on the published ESM build, brotli-compressed:

- **`@blac/core`** is about **6.88 kB** (brotli).
- **`@blac/react`** is about **2.6 kB** (brotli), excluding `react` / `react-dom` peers.

These are the real numbers from the size budget that gates every build, not estimates. A React app pulls in both, so the floor is roughly **9.5 kB** before your own code.

For Zustand and Jotai, consult their own published figures rather than any number quoted here. Both are deliberately small — Zustand advertises a tiny core, and Jotai's primitives are minimal — but a precise byte count depends on which utilities and middleware you import, your bundler, and your compression settings, so inventing exact competitor numbers would be dishonest. The fair summary: all three are small enough that bundle size is rarely the deciding factor between them. Pick on model fit, not bytes.

## See also

- [Mental Model](/guide/mental-model) — why auto-tracking, the registry, and immutable emit work the way they do
- [Introduction](/guide/introduction#when-to-use-blac) — what BlaC is and when it earns its weight
- [Best Practices](/guide/best-practices) — Cubit-vs-Bloc, state shape, and the input lanes
- [Dependency Tracking](/react/dependency-tracking) — auto-track vs `select` in practice
- [Migration from v1](/guide/migration-from-v1) — moving an existing BlaC app forward
