---
title: Coming from Redux (Toolkit)
description: How each Redux Toolkit primitive maps onto BlaC, with a full side-by-side todo-list port and notes on when to stay with Redux.
---

Redux and BlaC share the same design principle: a single source of truth per concern, immutable state
updates, and first-party DevTools support. The difference is in the mechanism. Redux routes every mutation
through a dispatcher and a reducer; BlaC routes it through a method on a class. The result is less
indirection, less boilerplate, and auto-tracked re-renders — but the tradeoff is giving up Redux's strict,
serializable action log.

If you use Redux Toolkit today, this page maps each RTK primitive to its BlaC equivalent and walks
through a full side-by-side port.

## Concept mapping

| Redux / RTK term                | BlaC term                                                       | Notes                                                                       |
| ------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `createSlice({ name, ... })`    | `class MyCubit extends Cubit<S>`                                | The class is the slice: state type, initial state, and mutations in one     |
| `initialState`                  | `super(initialState)` in the constructor                        | Passed to the parent class                                                  |
| `reducers: { action: fn }`      | Method on the class                                             | `action(payload)` is the combined action-creator + reducer                  |
| `createAsyncThunk`              | `async` method on the class                                     | No thunk factory; just `async method = async () => { ... }`                 |
| `extraReducers` / `builder`     | Additional methods or `onSystemEvent`                           | No separate builder step; add more methods to the class                     |
| `dispatch(action())`            | `cubit.method(args)` / `bloc.method(args)`                      | Call the method directly; no dispatcher                                     |
| `useSelector((s) => s.slice.x)` | `useBloc(MyCubit)` reading `state.x`                            | No selector written; the read during render _is_ the subscription           |
| `useDispatch()`                 | Second element of `useBloc` tuple                               | `const [state, cubit] = useBloc(MyCubit); cubit.method()`                   |
| `configureStore({ reducer })`   | Registry (automatic)                                            | No store setup; instances live in the global ref-counted registry           |
| `Provider` wrapping the app     | Nothing — registry is implicit                                  | No provider needed                                                          |
| `createEntityAdapter`           | Class with typed state + methods                                | Model a collection as `items: Record<id, T>` in the state object            |
| `RTK Query`                     | Async method + status union                                     | BlaC does not ship a query layer; see [Async](/guide/async) for the pattern |
| Redux DevTools                  | `@blac/devtools-connect` plugin                                 | First-party; inspects every Cubit, time-travel, state diff                  |
| Middleware                      | Plugins (`@blac/devtools-connect`, `@blac/plugin-persist`, ...) | Installed once globally; observe all Cubits                                 |

## The dispatch/reducer indirection does not exist in BlaC

RTK's slice defines reducers keyed by action type; `dispatch` routes incoming action objects to the
matching reducer. BlaC removes the intermediary. The action name _is_ the method name; the reducer _is_
the method body; and calling the method _is_ the dispatch. One step instead of three.

```ts
// RTK — three artifacts per mutation
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => {
      state.value += 1;
    }, // reducer
    incrementByAmount: (state, action) => {
      state.value += action.payload; // reducer + payload type
    },
  },
});
export const { increment, incrementByAmount } = counterSlice.actions; // action creators
export default counterSlice.reducer;
```

```ts twoslash
import { Cubit } from '@blac/core';
// ---cut---
// BlaC — one artifact
class CounterCubit extends Cubit<{ value: number }> {
  constructor() {
    super({ value: 0 });
  }
  increment = () => this.emit({ value: this.state.value + 1 });
  incrementByAmount = (amount: number) =>
    this.emit({ value: this.state.value + amount });
}
```

No separate file for actions. No `export const { ... }`. No `reducer` export to wire into a store.

## Immutable updates: Immer vs BlaC

RTK ships Immer so reducers can write `state.value += 1` (mutable syntax compiled to immutable
updates). BlaC state is always immutable: `emit(next)` and `update(fn)` replace the whole state
object, and `patch(partial)` deep-merges a partial. You never mutate `this.state` in place:

```ts twoslash
import { Cubit } from '@blac/core';

interface Item {
  id: string;
  name: string;
}
// ---cut---
// RTK would let you write: state.items.push(item)
// BlaC — always return a new value
class ListCubit extends Cubit<{ items: Item[] }> {
  constructor() {
    super({ items: [] });
  }

  add = (item: Item) => this.patch({ items: [...this.state.items, item] });

  remove = (id: string) =>
    this.patch({ items: this.state.items.filter((i) => i.id !== id) });
}
```

`patch` deep-merges, so you only mention the key you are changing. `emit` and `update` replace the
whole state — list every key, or spread the previous state.

## Side-by-side port: a todo list

**Redux Toolkit**

```ts
// slice
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}
interface TodoState {
  items: TodoItem[];
  nextId: number;
}

const todoSlice = createSlice({
  name: 'todos',
  initialState: { items: [], nextId: 1 } as TodoState,
  reducers: {
    addTodo: (state, action: PayloadAction<string>) => {
      state.items.push({
        id: state.nextId++,
        text: action.payload,
        completed: false,
      });
    },
    toggleTodo: (state, action: PayloadAction<number>) => {
      const todo = state.items.find((t) => t.id === action.payload);
      if (todo) todo.completed = !todo.completed;
    },
    removeTodo: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((t) => t.id !== action.payload);
    },
  },
});

export const { addTodo, toggleTodo, removeTodo } = todoSlice.actions;
export default todoSlice.reducer;
```

```tsx
// component
import { useSelector, useDispatch } from 'react-redux';

function TodoList() {
  const items = useSelector((s: RootState) => s.todos.items);
  const dispatch = useDispatch();
  return (
    <ul>
      {items.map((t) => (
        <li key={t.id}>
          <input
            type="checkbox"
            checked={t.completed}
            onChange={() => dispatch(toggleTodo(t.id))}
          />
          {t.text}
          <button onClick={() => dispatch(removeTodo(t.id))}>x</button>
        </li>
      ))}
    </ul>
  );
}
```

**BlaC**

```ts twoslash
import { Cubit } from '@blac/core';
// ---cut---
interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

class TodoCubit extends Cubit<{ items: TodoItem[]; nextId: number }> {
  constructor() {
    super({ items: [], nextId: 1 });
  }

  addTodo = (text: string) => {
    const { items, nextId } = this.state;
    this.emit({
      items: [...items, { id: nextId, text, completed: false }],
      nextId: nextId + 1,
    });
  };

  toggleTodo = (id: number) =>
    this.patch({
      items: this.state.items.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t,
      ),
    });

  removeTodo = (id: number) =>
    this.patch({ items: this.state.items.filter((t) => t.id !== id) });
}
```

```tsx
import { useBloc } from '@blac/react';

function TodoList() {
  const [state, todos] = useBloc(TodoCubit);
  return (
    <ul>
      {state.items.map((t) => (
        <li key={t.id}>
          <input
            type="checkbox"
            checked={t.completed}
            onChange={() => todos.toggleTodo(t.id)}
          />
          {t.text}
          <button onClick={() => todos.removeTodo(t.id)}>x</button>
        </li>
      ))}
    </ul>
  );
}
```

What changed:

- No `createSlice`, no `PayloadAction`, no action-creator exports.
- No `configureStore`, no `Provider`, no `RootState` type.
- `useSelector` + `useDispatch` collapse into a single `useBloc` call.
- Re-renders are auto-tracked: `TodoList` wakes only when `items` changes (not when `nextId` does).

## Async: `createAsyncThunk` → async method

RTK's thunk factory adds a lifecycle (`pending` / `fulfilled` / `rejected`) dispatched as separate
action objects. BlaC async is a plain `async` method that calls `emit` as it goes:

```ts
// RTK
export const fetchUser = createAsyncThunk('user/fetch', async (id: string) => {
  const response = await api.fetchUser(id);
  return response.data;
});

const userSlice = createSlice({
  name: 'user',
  initialState: { status: 'idle', user: null, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.status = 'success';
        state.user = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message ?? null;
      });
  },
});
```

```ts twoslash
import { Cubit } from '@blac/core';

interface User {
  id: string;
  name: string;
}
declare const api: { fetchUser(id: string): Promise<User> };
// ---cut---
type UserState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; user: User }
  | { status: 'error'; message: string };

class UserCubit extends Cubit<UserState> {
  private requestId = 0;

  constructor() {
    super({ status: 'idle' });
  }

  fetchUser = async (id: string) => {
    const reqId = ++this.requestId;
    this.emit({ status: 'loading' });
    try {
      const user = await api.fetchUser(id);
      if (reqId !== this.requestId) return;
      this.emit({ status: 'success', user });
    } catch (e) {
      if (reqId !== this.requestId) return;
      this.emit({ status: 'error', message: String(e) });
    }
  };
}
```

The `requestId` guard replaces RTK's thunk cancellation — a newer call wins and the older one drops
its result. No `AbortController` needed for this pattern, though BlaC supports it too.

## Selectors → auto-tracked reads

RTK encourages `createSelector` (Reselect) to derive and memoize values from the store:

```ts
// RTK + Reselect
export const selectTotal = createSelector(
  (s: RootState) => s.cart.items,
  (items) => items.reduce((sum, i) => sum + i.price * i.qty, 0),
);
```

BlaC derives values in a getter on the class. Auto-tracking records the getter's underlying reads, so
a component that reaches `state.items` stays subscribed without a separate selector:

```ts twoslash
import { Cubit } from '@blac/core';

interface CartItem {
  id: string;
  price: number;
  qty: number;
}
// ---cut---
class CartCubit extends Cubit<{ items: CartItem[] }> {
  constructor() {
    super({ items: [] });
  }

  get total() {
    return this.state.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }
}
```

A component that reads `state.items` re-renders when `items` changes; the getter recomputes the total
on that same render — no memoization layer, no Reselect import.

## DevTools

Redux DevTools is the standard time-travel inspector for Redux and RTK. BlaC ships `@blac/devtools-connect`
as a first-party plugin:

```ts
import { getPluginManager } from '@blac/core';
import { createDevToolsBrowserPlugin } from '@blac/devtools-connect';

getPluginManager().install(createDevToolsBrowserPlugin(), {
  environment: 'development',
});
```

The plugin shows every Cubit's state changes, diffs, and method calls in the same Redux DevTools panel.
State is diffed at the field level; you can step forward and backward through mutations.

## Store setup: `configureStore` → nothing

RTK requires a `configureStore` call to wire reducers, and a `Provider` at the tree root:

```tsx
// RTK setup
const store = configureStore({
  reducer: { counter: counterSlice.reducer, todos: todoSlice.reducer },
});

function App() {
  return (
    <Provider store={store}>
      <Counter />
      <TodoList />
    </Provider>
  );
}
```

BlaC has no equivalent. The registry is global, implicit, and automatic. Components call `useBloc` and
the registry creates instances on first use, shares them, and disposes them when the last consumer
unmounts. No bootstrap, no provider tree.

## When to stay with Redux

Redux's strict serializable action log is a genuine architectural choice, not just boilerplate. Reach
for it when:

- Your team needs a comprehensive audit trail of every state transition (e.g. regulated industries,
  complex undo/redo flows over many slices).
- You have large-team conventions and tooling already built around RTK (code generators, lint rules,
  saga/observable middleware).
- RTK Query is doing meaningful work for you (caching, deduplication, polling).

For most product apps where "I need shared, testable state logic" is the driver, BlaC removes the
ceremony without removing the testability or the DevTools story.

## Mental-model shift

| Redux / RTK                          | BlaC                                                     |
| ------------------------------------ | -------------------------------------------------------- |
| `createSlice` + `configureStore`     | `class MyCubit extends Cubit<S>` (no setup step)         |
| `dispatch(action(payload))`          | `cubit.method(payload)` — direct call                    |
| Reducer handles one action type      | Method _is_ the reducer                                  |
| `useSelector((s) => ...)` per hook   | Auto-tracked read during render — no selector written    |
| `useDispatch()` + action-creator     | Second element of `useBloc` tuple                        |
| `Provider` wraps the app             | No provider — registry is implicit                       |
| `createAsyncThunk` + `extraReducers` | `async method` with inline `emit` calls                  |
| Reselect / `createSelector`          | Getter on the class; no memoization layer needed         |
| Middleware chain                     | Plugin list installed once globally                      |
| Single global store                  | Many independent Cubits; each ref-counted, auto-disposed |

## See also

- [Comparison](/guide/comparison) — BlaC vs Zustand vs Jotai, with Redux in the honest-comparisons table
- [Core Concepts](/guide/concepts) — state containers, registry, dependency tracking
- [useBloc](/react/use-bloc) — full hook reference with `args`, `select`, `onMount`
- [Async](/guide/async) — async methods, status unions, cancellation, and why BlaC skips Suspense
- [DevTools](/plugins/devtools) — first-party BlaC DevTools plugin
