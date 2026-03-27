# Core Testing API

All core testing utilities are imported from `@blac/core/testing`. They work with any test runner and have no framework-specific dependencies.

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
  flushBlocUpdates,
} from '@blac/core/testing';
```

## Registry isolation

### `blacTestSetup()`

Installs `beforeEach` / `afterEach` hooks that swap in a fresh registry for every test. Call it once at the top of a test file or inside a `describe` block.

```ts
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

### `withBlocState(BlocClass, state, instanceKey?)`

```ts
function withBlocState<T extends StateContainerConstructor>(
  BlocClass: T,
  state: Partial<ExtractState<T>>,
  instanceKey?: string,
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

For named instances, pass the `instanceKey`:

```ts
withBlocState(EditorCubit, { content: 'Hello' }, 'doc-1');
withBlocState(EditorCubit, { content: 'World' }, 'doc-2');
```

### `withBlocMethod(BlocClass, methodName, impl, instanceKey?)`

```ts
function withBlocMethod<T extends StateContainerConstructor>(
  BlocClass: T,
  methodName: keyof InstanceType<T>,
  impl: (...args: any[]) => any,
  instanceKey?: string,
): InstanceType<T>;
```

Ensures an instance exists and replaces a single method. Other methods remain fully functional.

```ts
import { vi } from 'vitest';

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

### `createCubitStub(BlocClass, options?)`

```ts
function createCubitStub<T extends StateContainerConstructor>(
  BlocClass: T,
  options?: {
    state?: Partial<ExtractState<T>>;
    methods?: Partial<Record<MethodKeys<InstanceType<T>>, Function>>;
  },
): InstanceType<T>;
```

Creates a real instance of the cubit with optional pre-set state and method overrides. The stub is a fully functional instance — subscriptions, `emit`, `patch`, and `dispose` all work normally. Only the explicitly overridden methods are replaced.

```ts
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

Stubs are commonly paired with `registerOverride` to inject them into the registry for use by dependent code or React components.

## Overrides

### `registerOverride(BlocClass, instance, instanceKey?)`

```ts
function registerOverride<T extends StateContainerConstructor>(
  BlocClass: T,
  instance: InstanceType<T>,
  instanceKey?: string,
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

### `overrideEnsure(BlocClass, instance, fn, instanceKey?)`

```ts
function overrideEnsure<T extends StateContainerConstructor, R>(
  BlocClass: T,
  instance: InstanceType<T>,
  fn: () => R,
  instanceKey?: string,
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

### `flushBlocUpdates()`

```ts
function flushBlocUpdates(): Promise<void>;
```

Flushes pending microtasks by awaiting a `setTimeout(0)`. Use this after triggering state changes that may propagate asynchronously.

```ts
it('propagates async state', async () => {
  const data = ensure(AsyncDataCubit);
  data.triggerUpdate();
  await flushBlocUpdates();
  expect(data.state.updated).toBe(true);
});
```

::: tip
`flushBlocUpdates` flushes the macrotask queue, not timers. If your code uses `setTimeout` or `setInterval` with a delay, use `vi.useFakeTimers()` and `vi.advanceTimersByTime()` instead.
:::

## Combining helpers

The real power of these utilities comes from combining them. Here's a complete example testing a cubit that depends on two others:

```ts
import { describe, it, expect, vi } from 'vitest';
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
  private getShipping = this.depend(ShippingCubit);

  get total() {
    return (
      this.state.items.reduce((s, i) => s + i.price, 0) +
      this.getShipping().state.rate
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

The stub is a real `ShippingCubit` instance, so `cart.getShipping()` works exactly as it would in production — no special mocking framework needed.

## Testing keyed instances

Use the `instanceKey` parameter on any helper to test named instances:

```ts
blacTestSetup();

it('manages independent editor instances', () => {
  withBlocState(EditorCubit, { content: 'Doc A' }, 'doc-a');
  withBlocState(EditorCubit, { content: 'Doc B' }, 'doc-b');

  const editorA = ensure(EditorCubit, 'doc-a');
  const editorB = ensure(EditorCubit, 'doc-b');

  expect(editorA.state.content).toBe('Doc A');
  expect(editorB.state.content).toBe('Doc B');
});
```

See also: [Testing Overview](/testing/overview), [React Testing](/testing/react), [Instance Management](/core/instance-management)
