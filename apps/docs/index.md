---
layout: home

hero:
  name: BlaC
  text: State management that stays out of your way
  tagline: Put your logic in a class. Read it with one hook. Components re-render only when the data they actually used changes — no providers, no selectors, no boilerplate.
  image:
    src: /logo.svg
    alt: BlaC
  actions:
    - theme: brand
      text: Get Started
      link: /guide/introduction
    - theme: alt
      text: Quick Start — 5 min
      link: /guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/jsnanigans/blac

features:
  - icon: 🎯
    title: Type-safe, end to end
    details: Your state type flows from the class through the hook to the value you read. Zero annotations, full inference.
    link: /guide/typescript
    linkText: See TypeScript

  - icon: ⚡
    title: Surgical re-renders
    details: A render-time proxy records exactly which properties you read. Touch one field, and only the components reading that field update.
    link: /core/tracked
    linkText: See tracking

  - icon: 🔌
    title: No providers, ever
    details: Import the class, call useBloc, done. A ref-counted registry shares the instance and disposes it when nobody's listening.
    link: /core/instance-management
    linkText: See instances

  - icon: 🔗
    title: Reactive cross-bloc getters
    details: One bloc can read another via depend().track() — and the component reading the result wakes when either bloc changes. No selectors, no wiring.
    link: /core/bloc-communication#auto-tracking-with-track
    linkText: See .track()

  - icon: 🧪
    title: Logic you can unit-test
    details: Business logic lives in plain classes, not components. Instantiate, call a method, assert the state. No render harness required.
    link: /testing/overview
    linkText: See testing

  - icon: 🧩
    title: Plugins & DevTools
    details: Official plugins for time-travel DevTools, logging, and IndexedDB persistence — or write your own against a small surface.
    link: /plugins/overview
    linkText: See plugins
---

<script setup>
import { perConsumerTrackingFiles } from './demos/per-consumer-tracking';
</script>

## The whole loop, in one screen

State and the actions that change it live in a class. A single hook connects any component to it — shared automatically, tracked automatically.

```tsx twoslash
import React from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

// 1. Logic in a class
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.emit({ count: this.state.count + 1 });
}

// 2. One hook — state is shared across every component that asks for it
function Counter() {
  const [state, counter] = useBloc(CounterCubit);
  return <button onClick={counter.increment}>{state.count}</button>;
}
```

## See it: only the reader re-renders

Two counters share nothing but the page. Click **Bump left** and watch the render counters: the left one ticks up, the right one sits perfectly still. It never read `state.left`, so BlaC never re-rendered it. No `memo`, no selectors — just reading state.

<BlacSandpack :files="perConsumerTrackingFiles" active-file="/App.tsx" :editor-height="500" />

## Install

::: code-group

```bash [pnpm]
pnpm add @blac/core @blac/react
```

```bash [npm]
npm install @blac/core @blac/react
```

```bash [yarn]
yarn add @blac/core @blac/react
```

:::

Then head to the [Quick Start](/guide/getting-started), or see how BlaC stacks up in the [Comparison](/guide/comparison).
