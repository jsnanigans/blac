---
title: Playground
---

# Playground

An interactive, editable BlaC sandbox running entirely in your browser. No
install needed — just edit the code and watch it update.

The starter demonstrates a **Cubit** with typed state, an **`useBloc`** hook
consumer, and a **render counter** wired directly in the render body (not
`useEffect`) so every real re-render is counted accurately.

::: tip What to try

- Add a new field to `CounterState` in `counter.ts` and read it in `App.tsx`.
- Add a second independent component that consumes the same Cubit — bump the
  counter and notice the render counter of the other component does **not**
  tick (per-consumer auto-tracking).
- Replace `Cubit` with `Bloc` and dispatch events instead of calling methods.
  :::

<script setup>
import { playgroundStarterFiles } from './demos/playground-starter';
</script>

<BlacSandpack
  :files="playgroundStarterFiles"
  active-file="/App.tsx"
  :editor-height="580"
  :show-console="true"
/>

## What you're editing

| File                | Role                                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `App.tsx`           | Root component; renders the `Counter` component and passes nothing — the Cubit is resolved automatically from the global registry. |
| `counter.ts`        | `CounterCubit` — start here. Add state fields, tweak actions, or swap to a `Bloc` with events.                                     |
| `RenderCounter.tsx` | Utility component that counts renders in the render body. Carry this into any component to measure re-render isolation.            |
| `styles.css`        | Plain CSS — no framework. Edit freely.                                                                                             |

## Starting ideas

**Extend the Cubit** — add a `history: number[]` field and record each value
after every increment.

**Per-consumer isolation** — split the counter display into two sibling
components: one reads `state.count`, the other reads `state.step`. Add render
counters to both, then change the step. Only the step reader should re-render.

**Async action** — add an `incrementAfterDelay` method that calls
`setTimeout` before invoking `this.update(...)`. Watch the UI stay responsive
while the delay runs.

**Bloc events** — refactor `CounterCubit` into a `CounterBloc` with
`IncrementEvent` / `DecrementEvent` / `ResetEvent`. The `useBloc` call in
`App.tsx` stays the same — only the implementation changes.
