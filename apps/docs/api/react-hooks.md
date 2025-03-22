# React Hooks

Blac provides several React hooks to connect your components to state containers.

## useBloc

The primary hook for connecting a component to a Bloc/Cubit.

### Signature

```tsx
function useBloc<B extends BlocClass<any, any>>(
  blocClass: B,
  options?: {
    id?: string;
    props?: any;
    dependencySelector?: (newState: BlocState<B>, oldState: BlocState<B> | null) => any[];
    onMount?: (bloc: BlocInstance<B>) => void;
  }
): [BlocState<B>, BlocInstance<B>]
```

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `blocClass` | `ClassConstructor` | Yes | The Bloc/Cubit class to use |
| `options.props` | `any` | No | Props to pass to the Bloc/Cubit constructor |
| `options.id` | `string` | No | Optional identifier for the Bloc/Cubit instance |
| `options.dependencySelector` | `Selector<State>` | No | Function to select which state properties should trigger rerenders |

### Returns

An array containing:
`[state, bloc]` where:
1. `state` is the current state of the Bloc/Cubit
2. `bloc` is the Bloc/Cubit instance with methods

### Examples

#### Basic Counter
```tsx
function Counter() {
  // Basic usage
  const [state, bloc] = useBloc(CounterBloc);
  
  return (
    <div>
      <h1>Count: {state.count}</h1>
      <button onClick={bloc.increment}>Increment</button>
    </div>
  );
}
```
---

#### Defining a custom ID
If you want to share the same state between multiple components, but need different instances of the Bloc/Cubit, you can define a custom ID.

:::info
By default, each Bloc/Cubit uses its class name as an identifier.
:::

```tsx
const [state, bloc] = useBloc(ChatThreadBloc, { id: 'thread-123' });
```
On its own, this is not very useful, but it becomes very powerful when the ID is dynamic.

```tsx
function ChatThread({ conversationId }: { conversationId: string }) {
  const [state, bloc] = useBloc(ChatThreadBloc, { 
    id: `thread-${conversationId}`
  });

  return (
    <div>
      <h1>Chat Thread: {state.title}</h1>
    </div>
  );
}
```
With this approach, you can have multiple independent instances of state, that have the same business logic.

---
#### Custom Dependency Selector
Bloc/Cubit state is automatically tracked for changes, in most cases you don't need to provide a custom dependency selector.

:::warning
This is an advanced feature and should be used sparingly.
:::

```tsx
function OptimizedTodoList() {
  // Using dependency selector for optimization
  const [state, bloc] = useBloc(TodoBloc, {
    dependencySelector: (state) => [
      state.todos.length,
      state.filter
    ]
  });
  
  // Component will only rerender when the length of todos or the filter changes
  return (
    <div>
      <h1>Todos ({state.todos.length})</h1>
      {/* ... */}
    </div>
  );
}
```

## Advanced Usage

### Props & Dependency Injection

Pass configuration to blocs during initialization:

```tsx
// Bloc with props
class ThemeCubit extends Cubit<ThemeState, ThemeProps> {
  constructor(props: ThemeProps) {
    super({ theme: props.defaultTheme });
  }
  
  toggleTheme = () => {
    this.emit({ theme: this.state.theme === 'light' ? 'dark' : 'light' });
  };
}

// In component
function ThemeToggle() {
  const [state, bloc] = useBloc(ThemeCubit, {
    props: { defaultTheme: 'dark' }
  });
  
  return (
    <button onClick={bloc.toggleTheme}>
      {state.theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
``` 