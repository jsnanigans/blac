---
title: Showcase
description: Forkable interactive demos — counter, todo, form, and dashboard — all running the published @blac/core and @blac/react packages live in your browser.
---

<script setup>
import { counterShowcaseFiles } from './demos/showcase/counter';
import { todoShowcaseFiles } from './demos/showcase/todo';
import { formShowcaseFiles } from './demos/showcase/form';
import { dashboardShowcaseFiles } from './demos/showcase/dashboard';
</script>

# Showcase

Each demo below runs entirely in your browser via
[Sandpack](https://sandpack.codesandbox.io/). Sandpack installs the **published**
`@blac/core@2.0.15` and `@blac/react@2.0.15` packages from its CDN, so you're
running the real API — not a mock or workspace build.

Every embed is **fully editable**. Change a file, watch the preview hot-reload.
Click the **Fork** button (top-right of the editor) to open the sandbox on
CodeSandbox and keep experimenting.

::: tip First load
The preview may take a few seconds on first load while Sandpack resolves the
dependency tree from CDN. Subsequent loads are cached.
:::

---

## Counter

The minimum viable BlaC app. One `CounterCubit` holds `{ count, lastAction }`.
The component calls cubit methods — no action objects, no reducers, no dispatch.

- **`Cubit`** — subclass with a typed initial state
- **`patch()`** — partial-merge update; `emit()` for a full replace
- **`useBloc()`** — returns `[state, cubit]` (no provider needed)

<BlacSandpack
  :files="counterShowcaseFiles"
  active-file="/App.tsx"
  :editor-height="480"
/>

---

## Todo list

Multiple components consume the same `TodoCubit` without any extra wiring —
no context, no prop-drilling. Derived getters (`filteredItems`, `activeCount`)
live on the cubit and recompute whenever state changes.

- Reactive **list state** — add, toggle, remove, filter
- **Derived getters** on the Cubit class
- Multiple unrelated components, all reading the same singleton

<BlacSandpack
  :files="todoShowcaseFiles"
  active-file="/App.tsx"
  :editor-height="540"
/>

---

## Registration form

`FormCubit` tracks every field's `value` and `touched` flag, plus computed
`errors`, `isValid`, and `progress`. Validation logic stays in the cubit — the
components are pure view.

- Per-field **touched state** — errors surface only after blur
- **Derived `errors` getter** returns only fields that fail
- **Progress bar** driven by a computed percentage, no local state

<BlacSandpack
  :files="formShowcaseFiles"
  active-file="/App.tsx"
  :editor-height="500"
/>

---

## Analytics dashboard

Two independent Cubits — `StatsCubit` (counters + live simulation) and
`ActivityCubit` (event log) — coexist without a provider. A `useEffect` in
`App` writes to the activity log whenever stats refresh, showing cross-cubit
coordination via React effects instead of `this.depend()`.

- **Two Cubits** used in the same tree, no shared provider
- **Live simulation** with `setInterval` managed inside the cubit
- Cross-cubit coordination via React effects

<BlacSandpack
  :files="dashboardShowcaseFiles"
  active-file="/App.tsx"
  :editor-height="560"
  :show-console="true"
/>

---

::: info Messenger not included
The messenger scenario was scoped out of this gallery. It requires several
blocs, a mock service layer, real-time typing indicators, and a multi-file
component tree that is too large to be self-contained as a Sandpack string
module. It remains available in the `apps/examples` workspace for local
exploration.
:::

## What to try

Once a demo loads, try these edits to explore the API:

- **Counter** — add a `double` method to `CounterCubit` that calls
  `this.patch({ count: this.state.count * 2 })`.
- **Todo** — add a `prioritize(id)` method and a `priority` field to the
  `Todo` interface; sort `filteredItems` by priority.
- **Form** — add a fourth field (e.g. `username`) and a uniqueness rule to
  `errors`.
- **Dashboard** — wire `StatsCubit` to `ActivityCubit` using `this.depend()`
  inside `StatsCubit.tick()` so the log updates without a React effect.
