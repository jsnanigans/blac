---
title: 'Tutorial: build a Todo app, then make it time-travel'
description: Build a Todo app one step at a time and finish with full undo, redo, and time travel using only BlaC's core state primitives.
---

This is the long way round — one app, built in seven numbered steps, each a small diff on the last. We start with an empty Cubit and finish with full **undo / redo and time travel**, all from the same state primitives you meet in the first step. No new APIs appear at the end; the payoff is that BlaC's plain-immutable-state model makes undo fall out almost for free.

If you have not read [Quick Start](/guide/getting-started) and [Core Concepts](/guide/concepts) yet, skim them first — this page assumes you know what `emit`/`update`/`patch` do and that `useBloc` returns a `[state, bloc]` tuple. Everything else is built up here.

There are two interactive checkpoints: one when the app first becomes usable, one at the end with time travel. The code blocks in between are type-checked against the real published API by the docs build, so they compile exactly as written.

## What we are building

A todo list with:

- adding, toggling, and removing items;
- a filter (all / active / done) that is _view_ state, kept separate from the data;
- a derived "items left" count;
- and — the finale — a full history stack so every change can be undone, redone, or jumped to.

The whole thing is **one Cubit**. Every component reads only the slice it needs, so adding a todo never re-renders the filter chips, and toggling the filter never re-renders the add box. That isolation is automatic; you will see it without writing a single selector for most of the app.

## Step 1 — the state shape and the first action

Start with the data. A todo has an `id`, `text`, and a `done` flag. The Cubit's state is a list of them. Nothing else yet.

```ts twoslash
import { Cubit } from '@blac/core';

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export interface TodoState {
  todos: Todo[];
}

export class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({ todos: [] });
  }

  add = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // patch deep-merges: we mention only the key we change.
    this.patch({
      todos: [
        ...this.state.todos,
        { id: crypto.randomUUID(), text: trimmed, done: false },
      ],
    });
  };
}
```

Two things to notice, both from [Quick Start](/guide/getting-started):

- `add` is an **arrow-function field**, not a method, so `this` stays bound when you pass `todo.add` straight to an event handler.
- We build the next array with a spread (`[...this.state.todos, …]`) rather than `push`. State is treated as immutable; you always hand `patch`/`emit` a fresh value. That immutability is exactly what makes Step 7 possible.

## Step 2 — render it in React

`useBloc(TodoCubit)` gives this component the shared instance and subscribes it to the state it reads. Here it reads `state.todos`, so it wakes whenever the list changes.

```tsx
import { useBloc } from '@blac/react';
import { TodoCubit } from './TodoCubit';

function TodoList() {
  const [state] = useBloc(TodoCubit);
  return (
    <ul>
      {state.todos.map((t) => (
        <li key={t.id}>{t.text}</li>
      ))}
    </ul>
  );
}
```

And an input to drive `add`. This component reads _nothing_ from state — it only calls an action — so it never re-renders when the list changes:

```tsx
import { useState } from 'react';
import { useBloc } from '@blac/react';
import { TodoCubit } from './TodoCubit';

function AddRow() {
  const [text, setText] = useState('');
  const [, todo] = useBloc(TodoCubit); // only the bloc, no state read

  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          todo.add(text);
          setText('');
        }
      }}
    />
  );
}
```

That `const [, todo] =` — dropping the state slot — is the idiom for an action-only consumer. There is no subscription to anything, so nothing wakes it.

## Step 3 — toggle and remove

Two more actions on the Cubit. Both produce a brand-new array; neither mutates the old one. `toggle` maps over the list flipping one item's `done`; `remove` filters it out.

```ts twoslash
import { Cubit } from '@blac/core';
interface Todo {
  id: string;
  text: string;
  done: boolean;
}
interface TodoState {
  todos: Todo[];
}
class Base extends Cubit<TodoState> {
  constructor() {
    super({ todos: [] });
  }
}
// ---cut---
class TodoCubit extends Base {
  toggle = (id: string) => {
    this.patch({
      todos: this.state.todos.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t,
      ),
    });
  };

  remove = (id: string) => {
    this.patch({ todos: this.state.todos.filter((t) => t.id !== id) });
  };
}
```

In the row component, wire a checkbox to `toggle` and a button to `remove`. A row only needs the bloc, plus the props passed by its parent:

```tsx
function TodoRow({ id, text, done }: Todo) {
  const [, todo] = useBloc(TodoCubit);
  return (
    <li>
      <input type="checkbox" checked={done} onChange={() => todo.toggle(id)} />
      <span>{text}</span>
      <button onClick={() => todo.remove(id)}>✕</button>
    </li>
  );
}
```

## Step 4 — a filter, kept separate from the data

The filter is **view state**: which subset of the list to show. It is _not_ part of the todo data, so it gets its own key. Crucially, keeping it separate is what lets the history in Step 7 record only the data and ignore the view.

Add a `filter` field and a derived `visible` getter that applies it. Getters recompute on every read, so `visible` can never drift out of sync with `todos` or `filter`.

```ts twoslash
import { Cubit } from '@blac/core';

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

type Filter = 'all' | 'active' | 'done';

interface TodoState {
  todos: Todo[];
  filter: Filter;
}

export class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({ todos: [], filter: 'all' });
  }

  setFilter = (filter: Filter) => this.patch({ filter });

  // Derived on every read — never stored, never stale.
  get visible(): Todo[] {
    const { todos, filter } = this.state;
    if (filter === 'active') return todos.filter((t) => !t.done);
    if (filter === 'done') return todos.filter((t) => t.done);
    return todos;
  }

  get remaining(): number {
    return this.state.todos.filter((t) => !t.done).length;
  }
}
```

One subtlety carried over from [Quick Start](/guide/getting-started) and spelled out in [Dependency Tracking](/react/dependency-tracking): auto-tracking records reads on the `state` proxy, **not** on getters read off the bloc instance. A component that renders `todo.visible` but never touches `state` won't be subscribed to anything. The fix is to depend on the getter explicitly with `select`:

```tsx
function List() {
  // Re-render whenever the computed `visible` list changes.
  const [, todo] = useBloc(TodoCubit, {
    select: (_, bloc) => [bloc.visible],
  });
  return (
    <ul>
      {todo.visible.map((t) => (
        <TodoRow key={t.id} {...t} />
      ))}
    </ul>
  );
}
```

`select` returns an array; the component re-renders when any entry changes by identity. Because `visible` returns a fresh array only when `todos` or `filter` actually change, this wakes the list at the right moments and no more.

### Checkpoint — it works

That is a complete, usable todo app: add, toggle, remove, filter, and a live "items left" count. Try it. Add a few items, toggle some, switch filters.

:::note[Interactive demo]
A live, editable example will be embedded here once interactive demos are wired up.
:::

Open `/TodoCubit.ts` in the sandbox — that one class is the entire app's logic. The components are thin: each calls `useBloc`, reads its slice, and renders. No reducers, no actions object, no provider.

## Step 5 — seed it from somewhere (async)

Real apps load their initial todos. An async action is just a method that `await`s and emits as it goes — BlaC has no special async primitive. We model the load lifecycle as state so the view can render "loading" and "error" instead of guessing.

We will track the load status alongside the todos. A request-id guard makes a slow response unable to clobber a newer one — the full reasoning is in the [Async guide](/guide/async); here is the shape applied to our Cubit:

```ts twoslash
import { Cubit } from '@blac/core';

interface Todo {
  id: string;
  text: string;
  done: boolean;
}
type Filter = 'all' | 'active' | 'done';

declare const api: { fetchTodos(): Promise<Todo[]> };
// ---cut---
type LoadStatus = 'idle' | 'loading' | 'error';

interface TodoState {
  todos: Todo[];
  filter: Filter;
  status: LoadStatus;
}

export class TodoCubit extends Cubit<TodoState> {
  private requestId = 0;

  constructor() {
    super({ todos: [], filter: 'all', status: 'idle' });
  }

  load = async () => {
    const reqId = ++this.requestId; // claim the latest slot
    this.patch({ status: 'loading' });
    try {
      const todos = await api.fetchTodos();
      if (reqId !== this.requestId) return; // a newer call won; bail
      this.patch({ todos, status: 'idle' });
    } catch {
      if (reqId !== this.requestId) return;
      this.patch({ status: 'error' });
    }
  };
}
```

Kick the load off when the view appears using the `onMount` option — it fires after the bloc is acquired:

```tsx
function App() {
  const [state, todo] = useBloc(TodoCubit, {
    onMount: (bloc) => bloc.load(),
  });

  if (state.status === 'loading') return <p>Loading…</p>;
  if (state.status === 'error') {
    return <button onClick={todo.load}>Retry</button>;
  }
  return <TodoList />;
}
```

There is no Suspense boundary here, by design — the loading branch of this `if` _is_ the fallback, written by hand and fully type-checked. The [Async guide](/guide/async#suspense) explains why BlaC models loading as explicit state rather than throwing promises.

:::tip[Loading-status state is also "view" state]
Like `filter`, the transient `status` describes how to render, not the durable todo data. When we add history next, we will record only the todos — not `status`, not `filter` — so an undo never accidentally rewinds you into a stale "loading" screen.
:::

## Step 6 — route every mutation through one funnel

Before we can add history, every change to the todo list must flow through a single place. Right now `add`, `toggle`, and `remove` each call `patch({ todos: … })` directly. Refactor them to compute the next list and hand it to one private `commit` helper.

This is a pure refactor — behavior is identical — but it gives us the one chokepoint history will hook into.

```ts twoslash
import { Cubit } from '@blac/core';

interface Todo {
  id: string;
  text: string;
  done: boolean;
}
type Filter = 'all' | 'active' | 'done';

interface TodoState {
  todos: Todo[];
  filter: Filter;
}
// ---cut---
export class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({ todos: [], filter: 'all' });
  }

  // The single funnel: takes the next todo list and commits it.
  private commit = (next: Todo[]) => this.patch({ todos: next });

  add = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.commit([
      ...this.state.todos,
      { id: crypto.randomUUID(), text: trimmed, done: false },
    ]);
  };

  toggle = (id: string) => {
    this.commit(
      this.state.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  };

  remove = (id: string) => {
    this.commit(this.state.todos.filter((t) => t.id !== id));
  };

  setFilter = (filter: Filter) => this.patch({ filter });
}
```

Note `setFilter` does **not** go through `commit` — switching filters should not create an undo entry. That separation we set up in Step 4 is paying off already.

## Step 7 — time travel

Now the finale. Instead of storing a single `todos` array, store an array of _every_ list we have ever committed — a `past` stack — plus a `cursor` pointing at the one currently shown. `commit` appends; `undo`/`redo` just move the cursor; `jumpTo` sets it anywhere.

Because BlaC state is plain immutable values, **a list of past values is already a complete undo history**. There is no diffing, no command pattern, no special engine — the snapshots are the values you were emitting all along.

```ts twoslash
import { Cubit } from '@blac/core';

interface Todo {
  id: string;
  text: string;
  done: boolean;
}
type Filter = 'all' | 'active' | 'done';
// ---cut---
interface TodoState {
  // Every committed snapshot of the todo list, oldest first.
  past: Todo[][];
  // Index into `past` of the snapshot we are showing.
  cursor: number;
  // Filter stays OUTSIDE history — switching it is not undoable.
  filter: Filter;
}

const EMPTY: Todo[] = [];

export class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({ past: [EMPTY], cursor: 0, filter: 'all' });
  }

  // Drop any "future" we had undone past, append the new snapshot,
  // and point the cursor at it.
  private commit = (next: Todo[]) => {
    const { past, cursor } = this.state;
    const kept = past.slice(0, cursor + 1);
    this.patch({ past: [...kept, next], cursor: kept.length });
  };

  // The list everything else reads: whatever the cursor points at.
  get todos(): Todo[] {
    return this.state.past[this.state.cursor];
  }

  add = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.commit([
      ...this.todos,
      { id: crypto.randomUUID(), text: trimmed, done: false },
    ]);
  };

  toggle = (id: string) => {
    this.commit(
      this.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  };

  remove = (id: string) => {
    this.commit(this.todos.filter((t) => t.id !== id));
  };

  setFilter = (filter: Filter) => this.patch({ filter });

  // Time travel: just move the cursor. No todo data is mutated.
  undo = () => {
    if (this.canUndo) this.patch({ cursor: this.state.cursor - 1 });
  };
  redo = () => {
    if (this.canRedo) this.patch({ cursor: this.state.cursor + 1 });
  };
  jumpTo = (index: number) => this.patch({ cursor: index });

  get canUndo(): boolean {
    return this.state.cursor > 0;
  }
  get canRedo(): boolean {
    return this.state.cursor < this.state.past.length - 1;
  }

  get visible(): Todo[] {
    const { filter } = this.state;
    if (filter === 'active') return this.todos.filter((t) => !t.done);
    if (filter === 'done') return this.todos.filter((t) => t.done);
    return this.todos;
  }

  get remaining(): number {
    return this.todos.filter((t) => !t.done).length;
  }
}
```

What changed, and what did not:

- **`todos` became a getter** over `past[cursor]`. Every action and getter that used to read `this.state.todos` now reads `this.todos` instead — a one-word change at each call site.
- **`add` / `toggle` / `remove` are untouched** apart from that. They still compute a next list and call `commit`. The funnel from Step 6 is the only thing that needed to learn about history.
- **`undo` / `redo` / `jumpTo` mutate nothing but the cursor.** Going back in time is not a destructive operation; the future snapshots are still there until you commit a new change over them.
- **`filter` is still outside the stack**, so switching filters or rewinding history are completely independent.

The undo/redo buttons drive `undo`/`redo`; a row of dots renders one button per snapshot and calls `jumpTo`:

```tsx
function HistoryBar() {
  const [, todo] = useBloc(TodoCubit, {
    select: (_, bloc) => [bloc.canUndo, bloc.canRedo],
  });
  return (
    <div>
      <button disabled={!todo.canUndo} onClick={todo.undo}>
        Undo
      </button>
      <button disabled={!todo.canRedo} onClick={todo.redo}>
        Redo
      </button>
    </div>
  );
}

function Timeline() {
  const [state, todo] = useBloc(TodoCubit, {
    select: (_, bloc) => [bloc.state.cursor, bloc.state.past.length],
  });
  return (
    <div>
      {state.past.map((_, i) => (
        <button
          key={i}
          className={i === state.cursor ? 'current' : ''}
          onClick={() => todo.jumpTo(i)}
        />
      ))}
    </div>
  );
}
```

### Checkpoint — time travel

Add several todos, toggle a few, then hit **Undo** repeatedly and watch the list rewind one change at a time. **Redo** walks forward again. Click any dot in the history row to jump straight to that point. Switch filters at any cursor position — the filter never disturbs the timeline.

:::note[Interactive demo]
A live, editable example will be embedded here once interactive demos are wired up.
:::

Open `/TodoCubit.ts` and compare it with the Step 4 version. The diff that bought you a full undo system is small: a `past`/`cursor` pair instead of a bare `todos` array, a slightly smarter `commit`, three cursor-moving methods, and two boolean getters. Everything else — the actions, the components, the filter — barely moved.

## What you learned

- **One Cubit, many thin consumers.** Each component reads only its slice via `useBloc`; action-only components read nothing and never re-render.
- **`patch` for the data path; the replace-vs-merge rule from [Quick Start](/guide/getting-started).** State is always handed over as a fresh immutable value, never mutated in place.
- **Derived getters over stored duplicates.** `visible`, `remaining`, `canUndo` recompute on read and cannot drift; `select` subscribes a component to a getter.
- **View state lives apart from durable data.** `filter` and load `status` describe rendering, so they stay out of the history that records the todos.
- **A single mutation funnel makes cross-cutting features cheap.** Once every change flowed through `commit`, undo/redo/time-travel was an afternoon, not a rewrite.
- **Async is just methods that emit.** A request-id guard and an explicit status union replace Suspense — see the [Async guide](/guide/async).

## Where to go next

- [Mental Model](/guide/mental-model) — _why_ the per-consumer tracking and immutable-state model work the way they do.
- [Dependency Tracking](/react/dependency-tracking) — the full rules behind auto-tracking and `select`.
- [Async](/guide/async) — the loadable surface, cancellation, and the Suspense rationale in depth.
- [Patterns & Recipes](/guide/patterns) — cross-bloc communication, persistence, and more.
- [Persistence](/plugins/persistence) — make your todos (or their history) survive a reload.
