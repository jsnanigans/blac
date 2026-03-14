# Core Concepts

This page explains the mental model behind BlaC. Understanding these concepts will help you make good decisions about how to structure your state.

## State Containers

A state container is a class that holds a typed state value and notifies listeners when it changes. All state containers in BlaC extend `StateContainer<S>`, where `S` is the state type (must be an object).

**Cubit** is the concrete class you'll extend. It exposes public methods (`emit`, `update`, `patch`) to change state. You add your own methods for business logic.

```ts
class AuthCubit extends Cubit<{ user: User | null; loading: boolean }> {
  constructor() {
    super({ user: null, loading: false });
  }

  login = async (credentials: Credentials) => {
    this.patch({ loading: true });
    const user = await api.login(credentials);
    this.emit({ user, loading: false });
  };
}
```

State containers are framework-agnostic — they work without React, making them easy to test.

## Registry

The registry is a global singleton that manages state container instances. It maps each class (and optional instance key) to a single instance with a ref count.

```
Registry
├── CounterCubit (default)  →  instance, refCount: 2
├── AuthCubit (default)     →  instance, refCount: 1
└── EditorCubit ("doc-42")  →  instance, refCount: 3
```

### Registry functions

| Function | Creates? | Ref count | Use when |
|----------|----------|-----------|----------|
| `acquire(Class)` | Yes | +1 | You own this reference (must `release` later) |
| `ensure(Class)` | Yes | No change | You need the instance but don't own a reference |
| `borrow(Class)` | No | No change | Instance must already exist (throws if not) |
| `borrowSafe(Class)` | No | No change | Like `borrow` but returns `{ error, instance }` |
| `release(Class)` | No | -1 | Done with your reference |

In React, `useBloc` calls `acquire` on mount and `release` on unmount automatically. You rarely need these functions directly.

### Ref counting

Each `acquire` increments the ref count. Each `release` decrements it. When it reaches zero, the instance is disposed (unless `keepAlive` is set). This ensures instances are cleaned up when no component needs them.

## Instance Modes

### Shared (default)

All calls to `useBloc(CounterCubit)` return the same instance. This is the common case for app-wide state like auth, theme, or cart.

### Isolated

With `@blac({ isolated: true })`, each `useBloc` call creates a **new instance** that is disposed when the component unmounts. Use this for per-component state like forms or modals.

```ts
@blac({ isolated: true })
class FormCubit extends Cubit<FormState> { ... }
```

::: warning
Isolated means per-`useBloc`-call, not per-component-subtree. If three sibling components each call `useBloc(FormCubit)` on an isolated cubit, they get three different instances.
:::

### Named

Pass `instanceId` to share an instance within a specific key. Different keys get different instances.

```tsx
useBloc(EditorCubit, { instanceId: 'doc-42' });
```

### Keep alive

With `@blac({ keepAlive: true })`, the instance survives even when all components using it unmount. It persists for the lifetime of the app.

## Dependency Tracking

When you call `useBloc`, the returned `state` object is wrapped in a Proxy that records which properties your component reads during render. On subsequent state changes, the component only re-renders if one of those tracked properties changed.

```tsx
function UserName() {
  const [state] = useBloc(UserCubit);
  return <span>{state.name}</span>; // only tracks 'name'
}
```

If `state.email` changes but `state.name` doesn't, this component won't re-render.

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
| **Isolated** | One instance per `useBloc` call, disposed on unmount |
| **Keep alive** | Instance persists even when ref count reaches zero |
| **Auto-tracking** | Proxy-based detection of which state properties a component reads |
| **Plugin** | Observer that hooks into state container lifecycle events |
