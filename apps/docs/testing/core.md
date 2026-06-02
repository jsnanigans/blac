# Core Testing API

All core testing utilities are imported from `@blac/core/testing`. They work with any test runner and have no framework-specific dependencies — only the test globals (`describe`/`it`/`expect`/`vi`) come from your runner, which in this project is [`vite-plus`](/testing/overview#why-registry-isolation-matters).

```ts
import {
  blacTestSetup,
  createTestRegistry,
  withTestRegistry,
  registerOverride,
  overrideEnsure,
  createCubitStub,
  withBlocState,
  withBlocMethod,
  flush,
} from '@blac/core/testing';
```

::: tip Which helper do I reach for?
These tools overlap, so start from the question you are answering:

| Goal                                                         | Helper                                |
| ------------------------------------------------------------ | ------------------------------------- |
| Isolate **every** test in a file (the default)               | `blacTestSetup()`                     |
| Isolate **one block** of code, sync or async                 | `withTestRegistry(fn)`                |
| Use a **real** instance, just with starting state            | `withBlocState(Cubit, state)`         |
| Replace **one method** on a real instance                    | `withBlocMethod(Cubit, name, impl)`   |
| Build an instance with state, mocked methods, args, or deps  | `createCubitStub(Cubit, options)`     |
| Force the registry to return **your** instance (e.g. a stub) | `registerOverride(Cubit, instance)`   |
| Override the registry for a **single expression**            | `overrideEnsure(Cubit, instance, fn)` |

Rule of thumb: prefer real instances (`withBlocState`, `withBlocMethod`) so you exercise real logic; reach for stubs and overrides only to control a bloc's _dependencies_ or to intercept side effects.
:::

## Registry isolation

### `blacTestSetup()`

Installs `beforeEach` / `afterEach` hooks that swap in a fresh registry for every test. Call it once at the top of a test file or inside a `describe` block.

```ts
import { it, expect } from 'vite-plus/test';
import { blacTestSetup } from '@blac/core/testing';
import { ensure } from '@blac/core';

blacTestSetup();

it('test A — fresh registry', () => {
  const counter = ensure(CounterCubit);
  counter.increment();
  expect(counter.state.count).toBe(1);
});

it('test B — does not see test A state', () => {
  const counter = ensure(CounterCubit);
  expect(counter.state.count).toBe(0);
});
```

This is the recommended default for almost every test file. Use the lower-level helpers below only when you need more control.

### `createTestRegistry()`

Returns a new, empty `StateContainerRegistry`. Use this when you need to create a registry without installing it as the global one.

```ts
const registry = createTestRegistry();
```

### `withTestRegistry(fn)`

```ts
function withTestRegistry<T>(fn: (registry: StateContainerRegistry) => T): T;
```

Runs a callback with a temporary isolated registry, then restores the previous one. Works with both sync and async callbacks. The registry is always restored — even if the callback throws.

```ts
import { withTestRegistry } from '@blac/core/testing';
import { ensure } from '@blac/core';

const result = withTestRegistry(() => {
  const counter = ensure(CounterCubit);
  counter.increment();
  return counter.state.count;
});
expect(result).toBe(1);

// Outside the callback, the original registry is restored
```

Async example:

```ts
await withTestRegistry(async () => {
  const data = ensure(AsyncDataCubit);
  await data.fetchItems();
  expect(data.state.items).toHaveLength(3);
});
```

`withTestRegistry` can be nested. Each level gets its own isolated registry:

```ts
withTestRegistry(() => {
  ensure(CounterCubit).increment(); // count = 1

  withTestRegistry(() => {
    // Inner registry is independent
    expect(ensure(CounterCubit).state.count).toBe(0);
  });

  // Outer registry is restored
  expect(ensure(CounterCubit).state.count).toBe(1);
});
```

## Seeding state

### `withBlocState(BlocClass, state, args?)`

```ts
function withBlocState<T extends StateContainerConstructor>(
  BlocClass: T,
  state: Partial<ExtractState<T>>,
  args?: ExtractArgs<T>,
): InstanceType<T>;
```

Ensures an instance exists in the registry and seeds its state. For object-state cubits, the state is merged via `patch()` so you only need to provide the fields you care about. Returns the instance.

```ts
blacTestSetup();

it('filters active todos', () => {
  const todo = withBlocState(TodoCubit, {
    items: [
      { id: '1', text: 'Buy milk', done: false },
      { id: '2', text: 'Walk dog', done: true },
    ],
  });

  expect(todo.activeTodos).toHaveLength(1);
});
```

For named instances, pass the `args` that identify them (resolved via the class's `static key`/structural hash):

```ts
withBlocState(EditorCubit, { content: 'Hello' }, { docId: 'doc-1' });
withBlocState(EditorCubit, { content: 'World' }, { docId: 'doc-2' });
```

### `withBlocMethod(BlocClass, methodName, impl, args?)`

```ts
function withBlocMethod<T extends StateContainerConstructor>(
  BlocClass: T,
  methodName: keyof InstanceType<T>,
  impl: (...args: any[]) => any,
  args?: ExtractArgs<T>,
): InstanceType<T>;
```

Ensures an instance exists and replaces a single method. Other methods remain fully functional.

```ts
import { it, expect, vi } from 'vite-plus/test';

blacTestSetup();

it('calls save on submit', () => {
  const mockSave = vi.fn();
  withBlocMethod(FormCubit, 'save', mockSave);

  const form = ensure(FormCubit);
  form.save();
  expect(mockSave).toHaveBeenCalled();
});
```

This is useful when you want a real instance with real state management, but need to intercept a specific side-effecting method (API calls, navigation, etc.).

## Stubs

### `createCubitStub(BlocClass, options?)` {#create-cubit-stub}

```ts
function createCubitStub<T extends StateContainerConstructor>(
  BlocClass: T,
  options?: {
    state?: Partial<ExtractState<T>>;
    methods?: Partial<Record<MethodKeys<InstanceType<T>>, Function>>;
    args?: ExtractArgs<T>;
    deps?: Partial<ExtractDeps<T>>;
  },
): InstanceType<T>;
```

Creates a real instance of the cubit with optional pre-set state and method overrides. The stub is a fully functional instance — subscriptions, `emit`, `patch`, and `dispose` all work normally. Only the explicitly overridden methods are replaced.

| Option    | Effect                                                                                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `state`   | Seeds starting state. Merged via `patch()` for object state (provide only the fields you care about); replaced via `emit()` for non-object state.                                |
| `methods` | Replaces specific methods on the instance. Everything else stays real.                                                                                                           |
| `args`    | Runs the bloc's `init(args)` once via the same `initConfig` path the registry uses, so `init` and lifecycle hooks fire. Only allowed when the bloc declares a non-`void` `Args`. |
| `deps`    | Pre-wires a [`deps`](/guide/inputs) slice so `onDepsChanged` fires during the test.                                                                                              |

The options apply in source order: `args` runs `init` first, then `state` overrides on top, then `methods` are swapped, then `deps` are wired (which may itself emit via `onDepsChanged`).

```ts
import { it, expect, vi } from 'vite-plus/test';

blacTestSetup();

it('creates a stub with partial state', () => {
  const stub = createCubitStub(AuthCubit, {
    state: { loggedIn: true, userId: 'user-1' },
  });
  expect(stub.state.loggedIn).toBe(true);
  expect(stub.state.role).toBe('viewer'); // default preserved
});

it('creates a stub with mocked methods', () => {
  const mockLogout = vi.fn();
  const stub = createCubitStub(AuthCubit, {
    methods: { logout: mockLogout },
  });
  stub.logout();
  expect(mockLogout).toHaveBeenCalled();
  // login() and other methods still work normally
});
```

#### Stubbing blocs that take `args` or `deps`

If a bloc derives its initial state from `args` in `init()`, pass `args` so `init` actually runs:

```ts
it('seeds state from args via init()', () => {
  // class UserCubit extends Cubit<UserState, { userId: string }> {
  //   protected init(a) { this.emit({ id: a.userId }); }
  // }
  const stub = createCubitStub(UserCubit, { args: { userId: 'alice' } });
  expect(stub.state.id).toBe('alice');
});
```

For blocs that react to injected handles, pass `deps` to drive `onDepsChanged`:

```ts
it('reacts to a wired dependency', () => {
  const el = { id: 42 };
  const stub = createCubitStub(CanvasCubit, { deps: { el } });

  expect(stub.deps.el).toBe(el); // onDepsChanged fired with this slice
});
```

`args` and `deps` can be combined with `state` and `methods` in the same call.

::: tip
`createCubitStub` is the only place `deps` enter the testing API. The registry helpers (`withBlocState`, `withBlocMethod`, `registerOverride`, `overrideEnsure`) take an optional trailing `args` argument — it both keys the instance and seeds `init(args)` — but none of them accept `deps`. For a deps-wired instance, build it with `createCubitStub({ args, deps })` and inject it with `registerOverride`. See [Inputs](/guide/inputs) for the `args`/`deps` model.
:::

Stubs are commonly paired with `registerOverride` to inject them into the registry for use by dependent code or React components.

## Overrides

### `registerOverride(BlocClass, instance, args?)`

```ts
function registerOverride<T extends StateContainerConstructor>(
  BlocClass: T,
  instance: InstanceType<T>,
  args?: ExtractArgs<T>,
): void;
```

Injects a specific instance into the registry, replacing any existing one. The previous instance is disposed if it exists. Use this when you need full control over what instance the registry returns for a given class.

```ts
blacTestSetup();

it('uses the override when resolving dependencies', () => {
  const authStub = createCubitStub(AuthCubit, {
    state: { loggedIn: true, userId: 'test-user' },
  });
  registerOverride(AuthCubit, authStub);

  // DashboardCubit.depend(AuthCubit) will resolve to authStub
  const dashboard = ensure(DashboardCubit);
  expect(dashboard.summary).toContain('test-user');
});
```

### `overrideEnsure(BlocClass, instance, fn, args?)`

```ts
function overrideEnsure<T extends StateContainerConstructor, R>(
  BlocClass: T,
  instance: InstanceType<T>,
  fn: () => R,
  args?: ExtractArgs<T>,
): R;
```

Scoped override — registers the instance inside a temporary registry, runs the callback, then cleans up. Useful for one-off assertions without affecting other tests.

```ts
it('computes total with shipping', () => {
  const shipping = createCubitStub(ShippingCubit, { state: { rate: 9.99 } });

  const total = overrideEnsure(ShippingCubit, shipping, () => {
    const cart = ensure(CartCubit);
    return cart.total;
  });

  expect(total).toBe(9.99);
});
```

## Async helpers

### `flush()`

```ts
function flush(): Promise<void>;
```

BlaC coalesces state changes onto a microtask (the default `MicrotaskScheduler`), so a value set inside an action is not visible to subscribers, `onSystemEvent('stateChanged')` handlers, or plugin hooks until the channel flushes. `flush()` drains those pending microtasks — `await` it after triggering a change and before asserting on any side effect.

```ts
it('propagates async state', async () => {
  const data = ensure(AsyncDataCubit);
  data.triggerUpdate();
  await flush();
  expect(data.state.updated).toBe(true);
});
```

::: info Reading `state` directly does not need a flush
`flush()` is about _propagation_. The instance's own `state` getter is synchronous — `data.state` is up to date the instant `emit`/`patch` returns. You only need `await flush()` when asserting on something downstream of the channel flush (a `subscribe` listener, a `stateChanged` handler, a re-rendered component, a plugin).
:::

::: warning `flush()` drains microtasks, not timers
`flush()` awaits the microtask queue. If your code schedules work with `setTimeout`/`setInterval`, drive it with `vi.useFakeTimers()` + `vi.advanceTimersByTime()` instead — `flush()` will not advance real or fake timers. This is the mirror image of the once-per-flush batching described in [System Events](/core/system-events).
:::

::: details `flushBlocUpdates()` (deprecated alias)
`flushBlocUpdates()` is a deprecated alias of `flush()` kept for backwards compatibility. New tests should call `flush()`.

```ts
import { flush } from '@blac/core/testing';
```

:::

## Combining helpers

The real power of these utilities comes from combining them. Here's a complete example testing a cubit that depends on two others:

```ts
import { describe, it, expect, vi } from 'vite-plus/test';
import {
  blacTestSetup,
  createCubitStub,
  registerOverride,
  withBlocState,
} from '@blac/core/testing';
import { ensure } from '@blac/core';

blacTestSetup();

describe('DashboardCubit', () => {
  it('shows user greeting with cart count', () => {
    // Seed dependencies with known state
    registerOverride(
      AuthCubit,
      createCubitStub(AuthCubit, {
        state: { loggedIn: true, userId: 'u1', name: 'Alice' },
      }),
    );
    registerOverride(
      CartCubit,
      createCubitStub(CartCubit, {
        state: { items: [{ id: '1', price: 10 }] },
      }),
    );

    const dashboard = ensure(DashboardCubit);
    expect(dashboard.summary).toBe('Alice has 1 items');
  });

  it('shows guest greeting when logged out', () => {
    registerOverride(
      AuthCubit,
      createCubitStub(AuthCubit, {
        state: { loggedIn: false },
      }),
    );

    const dashboard = ensure(DashboardCubit);
    expect(dashboard.summary).toContain('Guest');
  });
});
```

## Testing cubits with `depend()`

When a cubit uses `this.depend()`, it resolves dependencies lazily from the registry. Use `registerOverride` to control what it gets:

```ts
class CartCubit extends Cubit<CartState> {
  private shipping = this.depend(ShippingCubit);

  get total() {
    return (
      this.state.items.reduce((s, i) => s + i.price, 0) +
      this.shipping.untracked().state.rate
    );
  }
}
```

```ts
blacTestSetup();

it('includes shipping in total', () => {
  registerOverride(
    ShippingCubit,
    createCubitStub(ShippingCubit, { state: { rate: 4.99 } }),
  );

  const cart = withBlocState(CartCubit, {
    items: [{ id: '1', price: 20 }],
  });

  expect(cart.total).toBe(24.99);
});
```

The stub is a real `ShippingCubit` instance, so `cart`'s `.shipping.untracked()` resolves it exactly as it would in production — no special mocking framework needed. (For the production-side picture of how `depend()` resolves from the registry, see [Bloc Communication](/core/bloc-communication).)

::: danger Common mistakes

- **Overriding a dependency _after_ the dependent bloc has already read it.** `depend()` resolves lazily on each call, but if your dependent bloc cached a value in `init()` from the dependency, register the override _before_ you `ensure` the dependent bloc.
- **Forgetting that `depend()` uses `ensure` (no ref).** Within a test the registry is isolated, so this rarely bites — but in app code a depended-on bloc can be disposed if nothing holds a ref. See [Bloc Communication](/core/bloc-communication).
  :::

## Testing keyed instances

Pass the `args` that identify each instance to any helper (the class's `static key`/structural hash resolves them to the registry key):

```ts
blacTestSetup();

it('manages independent editor instances', () => {
  withBlocState(EditorCubit, { content: 'Doc A' }, { docId: 'doc-a' });
  withBlocState(EditorCubit, { content: 'Doc B' }, { docId: 'doc-b' });

  const editorA = ensure(EditorCubit, { args: { docId: 'doc-a' } });
  const editorB = ensure(EditorCubit, { args: { docId: 'doc-b' } });

  expect(editorA.state.content).toBe('Doc A');
  expect(editorB.state.content).toBe('Doc B');
});
```

## See also

- [Testing Overview](/testing/overview) — why registry isolation matters and the import convention
- [React Testing](/testing/react) — `renderWithBloc` / `renderWithRegistry`, built on these primitives
- [Instance Management](/core/instance-management) — the registry, `ensure`, and ref counting these helpers isolate
- [Bloc Communication](/core/bloc-communication) — the canonical `depend()` / cross-bloc example
- [System Events](/core/system-events) — the once-per-flush batching that `flush()` drains
