# React Hooks

Blac provides several React hooks to connect your components to state containers.

## useBloc

The primary hook for connecting a component to a Bloc/Cubit.

### Signature

```tsx
function useBloc<B extends BlocClass<any, any>>(
  blocClass: B,
  options?: {
    props?: any;
    isolated?: boolean;
    dependencySelector?: (state: BlocState<B>) => any[];
  }
): [BlocState<B>, BlocInstance<B>]
```

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `blocClass` | `B extends BlocClass<any, any>` | Yes | The Bloc/Cubit class to use |
| `options.props` | `any` | No | Props to pass to the Bloc/Cubit constructor |
| `options.isolated` | `boolean` | No | When true, creates a new instance for this component |
| `options.dependencySelector` | `(state: BlocState<B>) => any[]` | No | Function to select which state properties should trigger rerenders |

### Returns

An array containing:
1. The current state of the Bloc/Cubit
2. The Bloc/Cubit instance with methods

### Example

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

function IsolatedCounter() {
  // Using isolated instance
  const [state, bloc] = useBloc(CounterBloc, { isolated: true });
  
  return (
    <div>
      <h1>Isolated Count: {state.count}</h1>
      <button onClick={bloc.increment}>Increment</button>
    </div>
  );
}

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

### Parameters

Same as `useBloc`

### Returns

The current state of the Bloc/Cubit

### Example

```tsx
function CountDisplay() {
  // Only get the state, not the bloc instance
  const [state] = useBloc(CounterBloc);
  
  return <div>Current count: {state.count}</div>;
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