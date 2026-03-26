# Core Concepts

This page explains the mental model behind BlaC. Understanding these concepts will help you make good decisions about how to structure your state.

## State Containers

A state container is a class that holds a typed state value and notifies listeners when it changes.

Think of it like a mini-store scoped to one concern. An `AuthCubit` holds auth state. A `CartCubit` holds cart state. Each is a self-contained unit with its own state type, methods, and lifecycle.

**Cubit** is the concrete class you'll extend. It gives you three ways to change state:

```ts
class AuthCubit extends Cubit<{ user: User | null; loading: boolean }> {
  constructor() {
    super({ user: null, loading: false }); // initial state
  }

  login = async (credentials: Credentials) => {
    this.patch({ loading: true });           // merge partial changes
    const user = await api.login(credentials);
    this.emit({ user, loading: false });     // replace entire state
  };

  logout = () => {
    this.update((s) => ({ ...s, user: null })); // derive from current
  };
}
```

State containers are framework-agnostic — they work without React. You can instantiate them in a test, call methods, and assert on `state` directly. No DOM, no hooks, no providers needed.

## Registry

The registry is a global singleton that manages state container instances. When you call `useBloc(CounterCubit)` in two different components, they both get the **same** `CounterCubit` instance. The registry makes this happen.

It maps each class (and optional instance key) to a single instance, plus a ref count tracking how many consumers are using it:

```
Registry
├── CounterCubit (default)  →  instance, refCount: 2   ← two components
├── AuthCubit (default)     →  instance, refCount: 1
└── EditorCubit ("doc-42")  →  instance, refCount: 3
```

### Ref counting

Every `useBloc` call increments the ref count on mount and decrements it on unmount. When the count hits zero, the instance is **automatically disposed** — its resources are cleaned up and it's removed from the registry. This means you don't need to worry about memory leaks from forgotten state containers.

If you want an instance to survive even when nothing is using it, mark it with `@blac({ keepAlive: true })`.

### Registry functions

In React, `useBloc` handles the registry for you. Outside React (tests, scripts, server-side), you interact with the registry directly:

| Function | Creates? | Ref count | Use when |
|----------|----------|-----------|----------|
| `acquire(Class)` | Yes | +1 | You own this reference (must `release` later) |
| `ensure(Class)` | Yes | No change | You need the instance but don't own a reference |
| `borrow(Class)` | No | No change | Instance must already exist (throws if not) |
| `borrowSafe(Class)` | No | No change | Like `borrow` but returns `{ error, instance }` |
| `release(Class)` | No | -1 | Done with your reference |

## Instance Modes

### Shared (default)

All calls to `useBloc(CounterCubit)` return the same instance. This is the common case for app-wide state like auth, theme, or cart.

### Named

Pass `instanceId` to share an instance within a specific key. Different keys get different instances.

```tsx
useBloc(EditorCubit, { instanceId: 'doc-42' });
```

### Keep alive

With `@blac({ keepAlive: true })`, the instance survives even when all components using it unmount. It persists for the lifetime of the app.

## Dependency Tracking

This is BlaC's key performance feature. When you call `useBloc`, the returned `state` is wrapped in a Proxy that records which properties your component actually reads during render:

```tsx
function UserName() {
  const [state] = useBloc(UserCubit);
  return <span>{state.name}</span>; // only 'name' is tracked
}
```

If `state.email` changes but `state.name` doesn't, this component **won't re-render**. This happens automatically — no selectors, no `useMemo`, no `React.memo`.

The tracking also works for:
- Nested properties: `state.user.profile.name`
- Array access: `state.items.length`, `state.items[0]`
- Getters on the bloc instance: `bloc.total`, `bloc.isEmpty`

Three tracking modes are available:

| Mode | How | Best for |
|------|-----|----------|
| **Auto-tracking** (default) | Proxy records property access | Most components |
| **Manual dependencies** | You provide a dependency array | Complex conditions, computed values |
| **No tracking** | Re-renders on every state change | Action-only components, debugging |

See [Dependency Tracking](/react/dependency-tracking) for details.

## Plugins

Plugins observe lifecycle events across all state containers. They receive callbacks for instance creation, state changes, and disposal.

```ts
const plugin: BlacPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  onStateChanged(instance, prev, next) { ... },
};

getPluginManager().install(plugin);
```

Official plugins: [Logging](/plugins/logging), [DevTools](/plugins/devtools), [Persistence](/plugins/persistence).

## Glossary

| Term | Meaning |
|------|---------|
| **StateContainer** | Abstract base class for all state containers |
| **Cubit** | Concrete state container with public `emit`, `update`, `patch` |
| **Registry** | Global singleton managing instance creation, sharing, and disposal |
| **acquire / release** | Increment / decrement an instance's ref count |
| **Ref count** | Number of active references to an instance; disposed at zero |
| **Named instance** | An instance keyed by a string, allowing multiple instances of the same class |
| **Keep alive** | Instance persists even when ref count reaches zero |
| **Auto-tracking** | Proxy-based detection of which state properties a component reads |
| **Plugin** | Observer that hooks into state container lifecycle events |
| **Hydration** | Restoring persisted state into a state container on startup |
| **depend()** | Declare a cross-bloc dependency; returns a lazy getter |

## What's next?

- [Patterns & Recipes](/guide/patterns) — Common patterns for structuring your app
- [Cubit](/core/cubit) — Full Cubit API reference
- [useBloc](/react/use-bloc) — Hook options and tracking modes
- [DevTools](/plugins/devtools) — Inspect and debug your state
