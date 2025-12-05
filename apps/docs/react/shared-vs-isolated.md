# Shared vs Isolated Instances

BlaC supports two instance modes: shared (default) and isolated.

## Shared Instances (Default)

All components using the same class share one instance:

```tsx
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.patch({ count: this.state.count + 1 });
}

function DisplayA() {
  const [state] = useBloc(CounterCubit);
  return <div>A: {state.count}</div>;
}

function DisplayB() {
  const [state] = useBloc(CounterCubit);
  return <div>B: {state.count}</div>; // Same count as A
}

function IncrementButton() {
  const [, cubit] = useBloc(CounterCubit);
  return <button onClick={cubit.increment}>+</button>;
  // Clicking updates both DisplayA and DisplayB
}
```

### Reference Counting

Shared instances use reference counting:

- Each `useBloc` increments ref count
- Component unmount decrements ref count
- Instance disposed when ref count reaches 0
- Next `useBloc` creates fresh instance

## Isolated Instances

Each component gets its own instance:

```tsx
import { blac, Cubit } from '@blac/core';

@blac({ isolated: true })
class FormCubit extends Cubit<{ value: string }> {
  constructor() {
    super({ value: '' });
  }
  setValue = (value: string) => this.patch({ value });
}

function FormA() {
  const [state, form] = useBloc(FormCubit);
  return (
    <input
      value={state.value}
      onChange={(e) => form.setValue(e.target.value)}
    />
  );
}

function FormB() {
  const [state, form] = useBloc(FormCubit);
  return (
    <input
      value={state.value}
      onChange={(e) => form.setValue(e.target.value)}
    />
  );
  // Completely independent from FormA
}
```

Isolated instances are disposed when their component unmounts.

## Named Shared Instances

Use `instanceId` for multiple shared instances:

```tsx
// Same instanceId = same instance
function EditorA() {
  const [state] = useBloc(DocumentCubit, { instanceId: 'doc-1' });
  return <div>{state.content}</div>;
}

function EditorB() {
  const [state] = useBloc(DocumentCubit, { instanceId: 'doc-1' });
  return <div>{state.content}</div>; // Same as EditorA
}

// Different instanceId = different instance
function EditorC() {
  const [state] = useBloc(DocumentCubit, { instanceId: 'doc-2' });
  return <div>{state.content}</div>; // Different content
}
```

## Keep Alive

Persist instances even without consumers:

```tsx
@blac({ keepAlive: true })
class AuthCubit extends Cubit<AuthState> {
  constructor() {
    super({ user: null });
  }
}

// Instance created on first use
// Instance persists after all components unmount
// Next useBloc gets same instance with preserved state
```

## When to Use Each

### Use Shared (default) for:

- **Global state**: Auth, theme, settings
- **Cross-component communication**: Multiple components need same data
- **Singleton services**: Analytics, logging

```tsx
// Theme shared across app
class ThemeCubit extends Cubit<{ mode: 'light' | 'dark' }> {
  constructor() {
    super({ mode: 'light' });
  }
}

function Header() {
  const [theme] = useBloc(ThemeCubit);
  return <header className={theme.mode}>...</header>;
}

function ThemeToggle() {
  const [theme, cubit] = useBloc(ThemeCubit);
  return <button onClick={cubit.toggle}>{theme.mode}</button>;
}
```

### Use Isolated for:

- **Form state**: Each form independent
- **Local UI state**: Modals, dropdowns, accordions
- **List items**: Each item has own state
- **Component-specific state**: Shouldn't leak

```tsx
@blac({ isolated: true })
class DropdownCubit extends Cubit<{ isOpen: boolean }> {
  constructor() { super({ isOpen: false }); }
  toggle = () => this.patch({ isOpen: !this.state.isOpen });
}

function Dropdown({ children }) {
  const [state, cubit] = useBloc(DropdownCubit);
  return (
    <div>
      <button onClick={cubit.toggle}>Toggle</button>
      {state.isOpen && children}
    </div>
  );
}

// Each Dropdown has its own state
<Dropdown>Menu 1</Dropdown>
<Dropdown>Menu 2</Dropdown>
```

### Use Keep Alive for:

- **Persistent singletons**: Must survive navigation
- **Expensive initialization**: Don't want to recreate
- **Background services**: Run regardless of UI

```tsx
@blac({ keepAlive: true })
class WebSocketCubit extends Cubit<SocketState> {
  constructor() {
    super({ connected: false });
    this.connect();
  }
}
```

## Comparison

|               | Shared        | Isolated           | Keep Alive          |
| ------------- | ------------- | ------------------ | ------------------- |
| Instance per  | Class         | Component          | Class               |
| Ref counted   | Yes           | No                 | No                  |
| Disposed when | Ref count = 0 | Component unmounts | Manual only         |
| Use for       | Global state  | Local state        | Persistent services |

## See Also

- [Configuration](/core/configuration) - `@blac()` decorator options
- [Instance Management](/core/instance-management) - Static methods
- [Bloc Communication](/react/bloc-communication) - Cross-bloc patterns
