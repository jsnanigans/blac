# State Management Patterns

Blac provides three powerful state management patterns to fit different scenarios in your application. Each pattern offers different tradeoffs in terms of state sharing, isolation, and persistence.

## 1. Shared State (Default)

By default, Blac creates a single instance of a Bloc/Cubit class that is shared across all components that use it. This is perfect for global state or state that needs to be synchronized across multiple components.

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

**Best for:**
- Global application state (user info, theme, etc.)
- State that needs to be synchronized between components
- Features where multiple components need to interact with the same data

## 2. Isolated State

When you need each component to have its own independent state, you can set the `isolated` static property on the Bloc/Cubit class. This creates a new instance of the Bloc/Cubit for each component that uses it.

```tsx
// Component A
class CounterBloc extends Cubit<{ count: number }> {
  static isolated = true; // This makes the instance isolated

  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}

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

**Best for:**
- Components that need their own independent state
- Multiple instances of the same component on a page
- When you want to avoid state conflicts between components

## 3. Persistent State

Sometimes you need state to persist even when no components are using it. This is useful for background tasks, caching, or maintaining state during navigation. You can achieve this by setting the `keepAlive` static property on your Bloc/Cubit class.

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

**Best for:**
- State that needs to persist during navigation
- Background tasks and data fetching
- Application-wide settings that is not always used by components
- Caching data across component mount/unmount cycles

## Choosing the Right State Management Pattern

When deciding which state management pattern to use, consider the following:

1. **Shared State**: 
   - **What it is**: A single instance of state shared across multiple components.
   - **When to use**: Use this when you have data that needs to be accessed or modified by several components, like user information or theme settings. It's great for global state.

2. **Isolated State**: 
   - **What it is**: Each component has its own independent state.
   - **When to use**: Choose this when you want each instance of a component to manage its own state without affecting others. This is useful for components that can appear multiple times on a page, like counters or forms.

3. **Persistent State**: 
   - **What it is**: State that remains even when no components are using it.
   - **When to use**: Use this for data that should be kept around, like user preferences or background tasks. It's helpful for settings that need to persist across different parts of your application.

By understanding these patterns, you can choose the right one based on how your components need to interact with state.