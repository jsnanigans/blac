# Coming from flutter_bloc

BlaC is a direct descendant of flutter*bloc. The name is not a coincidence: \_Business Logic Components*
is the Flutter pattern, and BlaC carries the same core idea — a class owns a slice of logic and emits
state — from Dart into TypeScript. If you have shipped flutter_bloc apps, most of the mental model
travels straight across. What changes is idiomatic Dart vs idiomatic TypeScript, and the React binding
layer.

## Concept mapping

| flutter_bloc term    | BlaC term                                           | Notes                                                                 |
| -------------------- | --------------------------------------------------- | --------------------------------------------------------------------- |
| `Cubit<S>`           | `Cubit<S>`                                          | Same name, same idea: extend, set initial state, expose methods       |
| `Bloc<E, S>`         | `Cubit<S>` (no event class)                         | BlaC drops the `Bloc` event layer; methods _are_ the events           |
| `emit(state)`        | `this.emit(state)` / `this.patch` / `this.update`   | Same concept; BlaC adds `patch` (deep-merge) and `update` (derive)    |
| `BlocProvider`       | Registry (automatic)                                | No provider tree — instances are shared via a ref-counted registry    |
| `BlocBuilder`        | `useBloc` hook                                      | Returns `[state, bloc]`; re-renders are auto-tracked, not `buildWhen` |
| `BlocListener`       | `useBloc` + `onMount` / `watch`                     | Side-effects in an effect or a `watch` subscription outside React     |
| `BlocConsumer`       | `useBloc` (both roles in one hook)                  | State read + method call in the same component                        |
| `MultiBlocProvider`  | Nothing — just call multiple `useBloc` calls        | No setup needed; each hook acquires its own instance                  |
| `context.read<T>()`  | `useBloc(T)` (or `borrow` / `ensure` outside React) | Registry lookup by class, not Flutter `BuildContext`                  |
| `context.watch<T>()` | `useBloc(T)` (auto-tracks what you read)            | Every `useBloc` is implicitly a "watch"                               |
| `buildWhen`          | `select` option on `useBloc`                        | `select: (s, b) => [s.field]` — re-render only when array changes     |
| `RepositoryProvider` | `Cubit` with `@blac({ keepAlive: true })`           | Or pass a service as a constructor arg; no separate "repository" type |
| `HydratedBloc`       | Persistence plugin (`@blac/plugin-persist`)         | Uses IndexedDB by default; swap adapter for React Native / other      |

## The `Bloc` event layer does not exist in BlaC

flutter_bloc ships two classes: `Cubit` (methods you call) and `Bloc` (events you dispatch, handlers you
register). BlaC only has `Cubit`. If you used flutter's `Bloc` class, translate each `on<Event>` handler
to a method:

```dart
// flutter_bloc — Bloc variant
class CounterBloc extends Bloc<CounterEvent, int> {
  CounterBloc() : super(0) {
    on<IncrementEvent>((event, emit) => emit(state + 1));
    on<DecrementEvent>((event, emit) => emit(state - 1));
  }
}
```

```ts twoslash
import { Cubit } from '@blac/core';
// ---cut---
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.emit({ count: this.state.count - 1 });
}
```

The method _is_ the event. There is no event class, no dispatch, no `add()`. You call the method directly.
This is identical to flutter_bloc's `Cubit` half.

## Side-by-side port: a counter app

**flutter_bloc**

```dart
// cubit
class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);
  void increment() => emit(state + 1);
  void decrement() => emit(state - 1);
}

// widget tree
class CounterPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => CounterCubit(),
      child: const CounterView(),
    );
  }
}

class CounterView extends StatelessWidget {
  const CounterView({super.key});

  @override
  Widget build(BuildContext context) {
    final count = context.watch<CounterCubit>().state;
    return Column(
      children: [
        Text('$count'),
        ElevatedButton(
          onPressed: () => context.read<CounterCubit>().increment(),
          child: const Text('+'),
        ),
        ElevatedButton(
          onPressed: () => context.read<CounterCubit>().decrement(),
          child: const Text('-'),
        ),
      ],
    );
  }
}
```

**BlaC**

```ts twoslash
import { Cubit } from '@blac/core';
// ---cut---
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.emit({ count: this.state.count - 1 });
}
```

```tsx
import { useBloc } from '@blac/react';

function Counter() {
  const [state, counter] = useBloc(CounterCubit);
  return (
    <div>
      <p>{state.count}</p>
      <button onClick={counter.increment}>+</button>
      <button onClick={counter.decrement}>-</button>
    </div>
  );
}
```

What changed:

- No `BlocProvider` wrapping the tree — the registry handles instance sharing.
- No `context.watch` / `context.read` split — `useBloc` is both.
- State is an object, not a raw int (TypeScript patterns favour typed objects).
- `buildWhen` is not needed; BlaC auto-tracks which fields the component reads.

## Provider tree → registry

In flutter_bloc you place a `BlocProvider` in the widget tree so descendants can look up the Cubit via
`context`. BlaC has no equivalent provider. The registry is a global singleton keyed on the class itself.
Two calls to `useBloc(CounterCubit)` always return the same instance, regardless of where in the React
tree they sit.

For scoped instances — an editor with a per-document state — pass `instanceId` instead of a wrapping
provider:

```tsx
function Editor({ docId }: { docId: string }) {
  const [state, editor] = useBloc(EditorCubit, { instanceId: docId });
  // ...
}
```

Each `docId` gets an independent `EditorCubit`. When all components using that `instanceId` unmount,
the instance is disposed automatically (same ref-counting lifecycle as flutter_bloc's `BlocProvider`
`create` + `close`).

## `BlocBuilder` → `useBloc`

flutter_bloc's `BlocBuilder` drives a rebuild with `buildWhen`; `BlocConsumer` adds a `listener` for
side effects. BlaC rolls both into one hook:

```dart
// flutter_bloc
BlocConsumer<WeatherCubit, WeatherState>(
  listenWhen: (prev, curr) => prev.status != curr.status,
  listener: (context, state) {
    if (state.status == WeatherStatus.failure) {
      ScaffoldMessenger.of(context).showSnackBar(/*...*/);
    }
  },
  buildWhen: (prev, curr) => prev.temperature != curr.temperature,
  builder: (context, state) => Text('${state.temperature}°'),
)
```

```tsx
import { useBloc } from '@blac/react';
import { useEffect } from 'react';

function WeatherDisplay() {
  const [state] = useBloc(WeatherCubit, {
    // re-render only when temperature changes
    select: (s) => [s.temperature],
    onMount: (bloc) => {
      // side effects on mount
    },
  });

  useEffect(() => {
    if (state.status === 'failure') {
      showSnackBar('Weather load failed');
    }
  }, [state.status]);

  return <p>{state.temperature}°</p>;
}
```

The `select` option replaces `buildWhen` (re-render when the returned array changes). Status side-effects
go in a plain `useEffect`. For global, non-React listeners, use `watch`:

```ts twoslash
import { Cubit } from '@blac/core';
import { watch } from '@blac/core';

class WeatherCubit extends Cubit<{ status: string; temperature: number }> {
  constructor() {
    super({ status: 'idle', temperature: 0 });
  }
}
// ---cut---
const unwatch = watch(WeatherCubit, (bloc) => {
  console.log('new temp:', bloc.state.temperature);
});
// call unwatch() to stop
```

## State shape: primitives vs objects

flutter_bloc commonly uses plain Dart primitives as state (`Cubit<int>`, `Cubit<bool>`) or sealed
classes. BlaC state is always an object literal in practice — TypeScript works best with typed record
shapes, and `patch` only makes sense on an object:

```ts twoslash
import { Cubit } from '@blac/core';
// ---cut---
// Prefer a typed object over a raw primitive
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.emit({ count: this.state.count + 1 });
}
```

For discriminated-union state (the Dart sealed-class pattern), use a TypeScript union type. The view
switches on `state.status` and TypeScript narrows each branch — same ergonomics as Dart `when`:

```ts twoslash
import { Cubit } from '@blac/core';

declare const api: {
  fetchUser(id: string): Promise<{ id: string; name: string }>;
};
// ---cut---
type UserState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; user: { id: string; name: string } }
  | { status: 'error'; message: string };

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({ status: 'idle' });
  }

  load = async (id: string) => {
    this.emit({ status: 'loading' });
    try {
      const user = await api.fetchUser(id);
      this.emit({ status: 'success', user });
    } catch (e) {
      this.emit({ status: 'error', message: String(e) });
    }
  };
}
```

## Persistence: `HydratedBloc` → persist plugin

flutter_bloc ships `HydratedBloc`/`HydratedCubit` for local persistence. BlaC has a first-party plugin:

```ts
import { createIndexedDbPersistPlugin } from '@blac/plugin-persist';
import { getPluginManager } from '@blac/core';

const persist = createIndexedDbPersistPlugin();
getPluginManager().install(persist);
```

The persist plugin saves and restores state via IndexedDB. For React Native, swap the storage adapter
(the plugin ships an interface; pass an AsyncStorage-backed adapter). See [Persistence](/plugins/persistence).

## Mental-model shift

| flutter_bloc                           | BlaC                                                     |
| -------------------------------------- | -------------------------------------------------------- |
| Tree = provider scoping mechanism      | Registry = global, class-keyed, ref-counted              |
| `context` carries bloc references      | Import the class; the registry finds the instance        |
| `BlocBuilder` re-builds on `buildWhen` | `useBloc` re-renders on auto-tracked read paths          |
| `BlocListener` for side effects        | `useEffect` on state values, or `watch` outside React    |
| `close()` called by `BlocProvider`     | `release()` / ref-count-zero triggers automatic disposal |
| Event objects for `Bloc` class         | Method calls — no dispatch, no `add()`                   |

If you used `Cubit` in Flutter (not the full `Bloc` event layer), migrating to BlaC is mostly syntax
translation. If you used `Bloc` events, collapse each `on<Event>` handler into a method.

## See also

- [Core Concepts](/guide/concepts) — state containers, registry, dependency tracking
- [Comparison](/guide/comparison) — BlaC vs Zustand vs Jotai, including the flutter_bloc lineage
- [useBloc](/react/use-bloc) — full hook reference with `select`, `onMount`, `instanceId`
- [Async](/guide/async) — async methods, status unions, cancellation
- [Persistence](/plugins/persistence) — the persist plugin and storage adapters
