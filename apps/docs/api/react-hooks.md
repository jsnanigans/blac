# React Hooks

Blac provides React hooks to connect your components to state containers.

## useBloc

The primary hook for connecting a component to a Bloc/Cubit.

### Signature

```tsx
function useBloc<
  B extends BlocConstructor<BlocGeneric>,
  O extends BlocHookOptions<InstanceType<B>>
>(
  blocClass: B,
  options?: O
): [BlocState<InstanceType<B>>, InstanceType<B>]
```

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `blocClass` | `BlocConstructor<BlocGeneric>` | Yes | The Bloc/Cubit class to use |
| `options.id` | `string` | No | Optional identifier for the Bloc/Cubit instance |
| `options.props` | `InferPropsFromGeneric<B>` | No | Props to pass to the Bloc/Cubit constructor |
| `options.dependencySelector` | `BlocHookDependencyArrayFn<InstanceType<B>>` | No | Function to select which state properties should trigger re-renders |
| `options.onMount` | `(bloc: InstanceType<B>) => void` | No | Callback function invoked when the Bloc is mounted |

### Returns

An array containing:
`[state, bloc]` where:
1. `state` is the current state of the Bloc/Cubit.
2. `bloc` is the Bloc/Cubit instance with methods.

### Examples

#### Basic Usage
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

#### Automatic Property Tracking

A major advantage of useBloc is its automatic tracking of property access. The hook intelligently monitors which state properties your component actually uses and only triggers re-renders when those specific properties change:

```tsx
function UserProfile() {
  const [state, bloc] = useBloc(UserProfileBloc);
  
  // This component will only re-render when state.name changes,
  // even if other properties in the state object change
  return <h1>Welcome, {state.name}!</h1>;
}
```

In the example above, the component only accesses `state.name`, so changes to other properties like `state.email` or `state.settings` won't cause a re-render.

---

#### Custom ID for Instance Management
If you want to share the same state between multiple components but need different instances of the Bloc/Cubit, you can define a custom ID.

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
With this approach, you can have multiple independent instances of state that share the same business logic.

---
#### Custom Dependency Selector
While property access is automatically tracked, in some cases you might want more control over when a component re-renders:

```tsx
function OptimizedTodoList() {
  // Using dependency selector for optimization
  const [state, bloc] = useBloc(TodoBloc, {
    dependencySelector: (newState, oldState) => [
      newState.todos.length,
      newState.filter
    ]
  });
  
  // Component will only re-render when the length of todos or the filter changes
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

Pass configuration to blocs during initialization.

```tsx
// Bloc with props
class ThemeCubit extends Cubit<ThemeState, ThemeProps> {
  constructor(props: ThemeProps) {
    super({ theme: props.defaultTheme });
  }
}

// In component
function ThemeToggle() {
  const [state, bloc] = useBloc(ThemeCubit, { 
    props: { defaultTheme: 'dark' } 
  });
  
  return (
    <button onClick={bloc.toggleTheme}>
      {state.theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
``` 
If a prop changes, it will be updated in the Bloc/Cubit instance. This is useful for seamless integration with React components that use props to configure the Bloc/Cubit.
```tsx
function ThemeToggle(props: ThemeProps) {
  const [state, bloc] = useBloc(ThemeCubit, { props });
  // ...
}

<ThemeToggle defaultTheme="dark" />
```

### Initialization with onMount

The `onMount` option provides a way to execute logic when a Bloc is mounted, allowing you to initialize or configure the Bloc without modifying its constructor:

```tsx
function UserProfile({ userId }: { userId: string }) {
  const [state, bloc] = useBloc(UserProfileBloc, {
    onMount: (bloc) => {
      // Load user data when the component mounts
      bloc.fetchUserData(userId);
    }
  });
  
  return (
    <div>
      {state.isLoading ? (
        <p>Loading...</p>
      ) : (
        <>
          <h1>{state.name}</h1>
          <p>{state.email}</p>
        </>
      )}
    </div>
  );
}
```

The `onMount` callback runs once after the Bloc instance is created and the component is mounted. This is especially useful for:

- Triggering data loading operations
- Setting up subscriptions or event listeners
- Initializing the Bloc with component-specific data
- Avoiding prop conflicts when multiple components use the same Bloc

:::warning
Make sure to only use the `props` option in the `useBloc` hook in a single place for each Bloc/Cubit. If there are multiple places that try to set the props, they might conflict with each other and cause unexpected behavior.
:::

```tsx
function ThemeToggle() {
  const [state, bloc] = useBloc(ThemeCubit, { 
    props: { defaultTheme: 'dark' }
  });
  // ...
}

function UseThemeToggle() {
  const [state, bloc] = useBloc(ThemeCubit, { 
    props: { name: 'John' }// [!code error]
  });
  // ...
}
```

:::tip
If you need to pass props to a Bloc/Cubit that is not known at the time of initialization, you can use the `onMount` option.
:::

```tsx{10-12}
function ThemeToggle() {
  const [state, bloc] = useBloc(ThemeCubit, { 
    props: { defaultTheme: 'dark' }
  });
  // ...
}

function UseThemeToggle() {
  const [state, bloc] = useBloc(ThemeCubit, { 
    onMount: (bloc) => {
      bloc.setName('John');
    }
  });
  // ...
}
```
