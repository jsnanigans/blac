# Cubit

A Cubit is a state container that holds a typed state value and exposes methods to change it. It extends `StateContainer` with public mutation methods.

## Creating a Cubit

Define your state type as a generic parameter and pass the initial state to `super()`.

```ts
import { Cubit } from '@blac/core';

interface TodoState {
  items: string[];
  filter: 'all' | 'active' | 'done';
}

class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({ items: [], filter: 'all' });
  }

  addItem = (text: string) => {
    this.update((s) => ({ ...s, items: [...s.items, text] }));
  };

  setFilter = (filter: TodoState['filter']) => {
    this.patch({ filter });
  };
}
```

State must be an object type (`S extends object`). Primitives like `number` or `string` are not supported as state.

## Mutation Methods

### `emit(newState)`

Replace the entire state. Use when you have the full new state ready.

```ts
this.emit({ count: 0, label: 'reset' });
```

### `update(fn)`

Derive new state from the current state. Use when you need to read the current state to compute the next one.

```ts
this.update((current) => ({ ...current, count: current.count + 1 }));
```

### `patch(partial)`

Shallow-merge partial changes into the current state. Use when you want to update some fields without touching others.

```ts
this.patch({ loading: true });
```

`patch` skips the update if all provided values are identical to current state (using `Object.is`).

### Choosing a method

| Scenario                   | Method   |
| -------------------------- | -------- |
| Full state replacement     | `emit`   |
| Derived from current state | `update` |
| Update a few fields        | `patch`  |
| Toggle a boolean           | `update` |
| Reset to initial state     | `emit`   |

## Getters

Define getters for computed values. They are tracked automatically by the proxy system — components that read a getter only re-render when its underlying data changes.

```ts
class CartCubit extends Cubit<{ items: CartItem[] }> {
  constructor() {
    super({ items: [] });
  }

  get total() {
    return this.state.items.reduce((sum, item) => sum + item.price, 0);
  }

  get isEmpty() {
    return this.state.items.length === 0;
  }

  addItem = (item: CartItem) => {
    this.update((s) => ({ items: [...s.items, item] }));
  };
}
```

```tsx
function CartSummary() {
  const [, cart] = useBloc(CartCubit);
  // only re-renders when total changes, not on every state change
  return <span>Total: ${cart.total}</span>;
}
```

## Protected APIs

These are available inside your Cubit class but not from the outside:

- `this.state` — read the current state
- `this.onSystemEvent(event, handler)` — listen to lifecycle events (see [System Events](/core/system-events))
- `this.depend(OtherClass)` — declare a dependency on another state container (see [Bloc Communication](/core/bloc-communication))

## Public properties

| Property          | Type              | Description                            |
| ----------------- | ----------------- | -------------------------------------- |
| `state`           | `Readonly<S>`     | Current state value                    |
| `isDisposed`      | `boolean`         | Whether the instance has been disposed |
| `name`            | `string`          | Display name (defaults to class name)  |
| `instanceId`      | `string`          | Unique instance identifier             |
| `createdAt`       | `number`          | Creation timestamp                     |
| `hydrationStatus` | `HydrationStatus` | Current hydration phase                |

## Async methods

Cubits handle async operations naturally. Model loading/error state explicitly and guard against stale responses:

```ts
interface ArticleState {
  articles: Article[];
  status: 'idle' | 'loading' | 'error' | 'success';
  error: string | null;
}

class ArticleCubit extends Cubit<ArticleState> {
  private requestId = 0;

  constructor() {
    super({ articles: [], status: 'idle', error: null });
  }

  load = async (category: string) => {
    const id = ++this.requestId;
    this.patch({ status: 'loading', error: null });

    try {
      const articles = await api.fetchArticles(category);
      if (id !== this.requestId) return; // stale response
      this.emit({ articles, status: 'success', error: null });
    } catch (e) {
      if (id !== this.requestId) return;
      this.patch({ status: 'error', error: String(e) });
    }
  };
}
```

The `requestId` pattern discards responses from superseded requests. Each new `load()` call increments the ID, and callbacks from previous calls see a mismatch and bail out.

::: tip Form validation pattern
Cubits work well for form state. Use `patch` for field updates and getters for validation:

```ts
class FormCubit extends Cubit<{ email: string; password: string }> {
  constructor() {
    super({ email: '', password: '' });
  }

  setEmail = (email: string) => this.patch({ email });
  setPassword = (password: string) => this.patch({ password });

  get errors() {
    const errors: Record<string, string> = {};
    if (!this.state.email.includes('@')) errors.email = 'Invalid email';
    if (this.state.password.length < 8) errors.password = 'Too short';
    return errors;
  }

  get isValid() {
    return Object.keys(this.errors).length === 0;
  }
}
```

:::

See also: [Patterns & Recipes](/guide/patterns), [Instance Management](/core/instance-management)
