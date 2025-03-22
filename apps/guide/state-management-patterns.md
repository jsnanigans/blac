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