# Shared vs Isolated Instances

BlaC supports three instance modes that control how state container instances are created and shared between components.

## Shared (default)

Every `useBloc(CounterCubit)` call returns the **same instance**. State is shared across all components that use the same class.

```tsx
function Display() {
  const [state] = useBloc(CounterCubit);
  return <p>{state.count}</p>;
}

function Controls() {
  const [, counter] = useBloc(CounterCubit);
  return <button onClick={counter.increment}>+</button>;
}

// Display and Controls share the same CounterCubit instance
```

The instance is created on the first `useBloc` call and disposed when the last component using it unmounts.

**Use for:** App-wide state — auth, theme, cart, notifications.

## Isolated

With `@blac({ isolated: true })`, each `useBloc` call creates a **new, independent instance**. The instance is disposed when the component unmounts.

```ts
import { Cubit, blac } from '@blac/core';

@blac({ isolated: true })
class FormCubit extends Cubit<{ name: string; email: string }> {
  constructor() {
    super({ name: '', email: '' });
  }

  setName = (name: string) => this.patch({ name });
  setEmail = (email: string) => this.patch({ email });
}
```

```tsx
function ContactForm() {
  const [state, form] = useBloc(FormCubit);
  // this instance belongs only to this component
  return (
    <form>
      <input value={state.name} onChange={(e) => form.setName(e.target.value)} />
      <input value={state.email} onChange={(e) => form.setEmail(e.target.value)} />
    </form>
  );
}
```

**Use for:** Per-component state — forms, modals, editors, list item state.

::: warning
Isolated means per-`useBloc`-call, not per-component-subtree. If a parent and child both call `useBloc(FormCubit)` on an isolated cubit, they get **two different instances**. If siblings need to share state, use named instances instead.
:::

## Named instances

Pass `instanceId` to create instances that are shared within a specific key. Different keys get different instances.

```tsx
function Editor({ docId }: { docId: string }) {
  const [state, editor] = useBloc(EditorCubit, { instanceId: docId });
  return <textarea value={state.content} />;
}

// Same docId = same instance, different docId = different instance
<Editor docId="doc-42" />
<Editor docId="doc-42" />  {/* shares instance with above */}
<Editor docId="doc-99" />  {/* different instance */}
```

**Use for:** Per-entity state — document editors, user profiles, chat threads.

## Keep alive

With `@blac({ keepAlive: true })`, the instance is **never disposed** when its ref count reaches zero. It persists for the lifetime of the application.

```ts
@blac({ keepAlive: true })
class AuthCubit extends Cubit<AuthState> { ... }
```

Without `keepAlive`, a shared instance is disposed when the last component using it unmounts. With `keepAlive`, the instance survives and retains its state for when a component uses it again.

**Use for:** Global persistent state — auth sessions, user preferences, feature flags.

## Decision guide

| Question | Mode |
|----------|------|
| Should all components see the same state? | **Shared** (default) |
| Does each component need its own state? | **Isolated** |
| Should groups of components share state by key? | **Named** (`instanceId`) |
| Should the instance survive when no component uses it? | **Keep alive** |

## Lifecycle summary

| Mode | Created when | Disposed when |
|------|-------------|---------------|
| Shared | First `useBloc` call | Last component unmounts (ref count = 0) |
| Shared + keepAlive | First `useBloc` call | Never (or manual `clear()`) |
| Isolated | Each `useBloc` call | Component unmounts |
| Named | First `useBloc` with that key | Last component with that key unmounts |

See also: [Configuration](/core/configuration), [Instance Management](/core/instance-management)
