# State Management Patterns

Blac provides three powerful state management patterns to fit different scenarios in your application. Each pattern offers different tradeoffs in terms of state sharing, isolation, and persistence.

## 1. Shared State (Default)

By default, Blac creates a single instance of a Bloc/Cubit class that is shared across all components that use it. This is perfect for global state or state that needs to be synchronized across multiple components.

### Implementation

```tsx
// No special configuration needed - this is the default behavior
class UserBloc extends Bloc<UserState, UserAction> {
  constructor() {
    super(initialUserState);
  }
  // ...
}
```

### Usage

```tsx
// Component A
function ComponentA() {
  const [state, bloc] = useBloc(UserBloc);
  // Uses the shared UserBloc instance
  // ...
}

// Component B
function ComponentB() {
  const [state, bloc] = useBloc(UserBloc);
  // Uses the same UserBloc instance as ComponentA
  // ...
}
```

### Best For

- Global application state (user info, theme, etc.)
- State that needs to be synchronized between components
- Features where multiple components need to interact with the same data

For more details on implementing shared state, see the [Core Classes API](/api/core-classes).

## 2. Isolated State

When you need each component to have its own independent state, you can set the `isolated` static property on the Bloc/Cubit class. This creates a new instance of the Bloc/Cubit for each component that uses it.

### Implementation

```tsx
class CounterBloc extends Cubit<{ count: number }> {
  // This makes each component get its own instance
  static isolated = true;

  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}
```

### Usage

```tsx
// Component A
function ComponentA() {
  const [state, bloc] = useBloc(CounterBloc);
  // Has its own isolated CounterBloc instance
  // ...
}

// Component B
function ComponentB() {
  const [state, bloc] = useBloc(CounterBloc);
  // Has a different isolated CounterBloc instance than ComponentA
  // ...
}
```

### Best For

- Components that need their own independent state
- Multiple instances of the same component on a page
- When you want to avoid state conflicts between components

To understand how isolation interacts with component lifecycle, check the [React Hooks API](/api/react-hooks).

## 3. Persistent State

Sometimes you need state to persist even when no components are using it. This is useful for background tasks, caching, or maintaining state during navigation. You can achieve this by setting the `keepAlive` static property on your Bloc/Cubit class.

### Implementation

```tsx
class ThemeCubit extends Cubit<{ theme: 'light' | 'dark' }> {
  // This makes the instance persist even when no components use it
  static keepAlive = true;
  
  constructor() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    super({ theme: savedTheme as 'light' | 'dark' });
  }

  toggleTheme = () => {
    const newTheme = this.state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    this.emit({ theme: newTheme });
  };
}
```

### Usage

```tsx
function ThemeToggle() {
  const [state, bloc] = useBloc(ThemeCubit);
  
  return (
    <button onClick={bloc.toggleTheme}>
      Switch to {state.theme === 'light' ? 'dark' : 'light'} mode
    </button>
  );
}
```

Even when the ThemeToggle component unmounts, the ThemeCubit instance will stay alive, preserving its state.

### Best For

- State that needs to persist during navigation
- Background tasks and data fetching
- Application-wide settings that are not always used by components
- Caching data across component mount/unmount cycles

For advanced persistent state patterns, see the [Best Practices](/learn/best-practices) guide.

## Combining Patterns

You can combine these patterns for more complex scenarios:

```tsx
class FeatureBloc extends Bloc<FeatureState, FeatureAction> {
  // Both isolated and persistent
  static isolated = true;
  static keepAlive = true;
  
  // ...
}
```

This creates isolated instances for each component, and each instance persists even when its component unmounts.

## Choosing the Right Pattern

When deciding which state management pattern to use, consider these questions:

1. **Do multiple components need to share the same state?**
   - If yes → Use **Shared State** (default)
   - If no → Consider **Isolated State**

2. **Does the state need to persist when no components are using it?**
   - If yes → Use **Persistent State**
   - If no → Use the default lifecycle

3. **Do you need unique instances for multiple copies of the same component?**
   - If yes → Use **Isolated State**
   - If no → Use **Shared State**

By understanding these patterns, you can choose the right one based on how your components need to interact with state. For more advanced state management techniques, see the [Best Practices](/learn/best-practices) guide.