# Quick Start: useBlocAdapter

Get started with the new adapter-based React integration in 5 minutes.

## Installation

The adapter is included in `@blac/react` (no additional installation needed):

```bash
npm install @blac/react @blac/core
# or
pnpm add @blac/react @blac/core
```

## Basic Example

```typescript
import { Cubit } from '@blac/core';
import { useBlocAdapter } from '@blac/react';

// 1. Create your Cubit
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => this.emit(this.state + 1);
  decrement = () => this.emit(this.state - 1);
}

// 2. Use in your component
function Counter() {
  const [count, cubit] = useBlocAdapter(CounterCubit);

  return (
    <div>
      <h1>{count}</h1>
      <button onClick={cubit.increment}>+</button>
      <button onClick={cubit.decrement}>-</button>
    </div>
  );
}
```

That's it! Your component will re-render when the state changes.

## With Selectors (Optimized)

For better performance, use selectors to subscribe only to what you need:

```typescript
interface AppState {
  user: { name: string; email: string };
  settings: { theme: 'light' | 'dark' };
  todos: Array<{ id: number; text: string }>;
}

class AppCubit extends Cubit<AppState> {
  // ... implementation
}

// Only re-renders when user.name changes
function UserGreeting() {
  const [name] = useBlocAdapter(AppCubit, {
    selector: (state) => state.user.name
  });

  return <h1>Hello, {name}!</h1>;
}

// Only re-renders when theme changes
function ThemeToggle() {
  const [theme, cubit] = useBlocAdapter(AppCubit, {
    selector: (state) => state.settings.theme
  });

  return <button onClick={cubit.toggleTheme}>{theme}</button>;
}

// Only re-renders when todo count changes
function TodoCount() {
  const [count] = useBlocAdapter(AppCubit, {
    selector: (state) => state.todos.length
  });

  return <p>{count} todos</p>;
}
```

## Common Patterns

### Lifecycle Hooks

```typescript
function DataLoader() {
  const [data, cubit] = useBlocAdapter(DataCubit, {
    onMount: (cubit) => cubit.loadData(),
    onUnmount: (cubit) => cubit.cleanup(),
  });

  return <div>{data}</div>;
}
```

### Async Loading with Suspense

```typescript
function AsyncData() {
  const [data] = useBlocAdapter(DataCubit, {
    suspense: true,
    loadAsync: (cubit) => cubit.loadData(),
    isLoading: (cubit) => cubit.state.loading,
    getLoadingPromise: (cubit) => cubit.loadingPromise,
  });

  return <div>{data}</div>;
}

// Wrap with Suspense
function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AsyncData />
    </Suspense>
  );
}
```

### Isolated Instances

```typescript
class FormCubit extends Cubit<FormState> {
  static isolated = true; // Each component gets its own instance

  constructor() {
    super({ name: '', email: '' });
  }

  updateName = (name: string) => this.emit({ ...this.state, name });
}

// Each UserForm has independent state
function UserForm() {
  const [form, cubit] = useBlocAdapter(FormCubit);
  return <input value={form.name} onChange={e => cubit.updateName(e.target.value)} />;
}
```

## Tips

1. **Use selectors** for better performance
2. **Keep selectors pure** - no side effects
3. **Return primitives** from selectors when possible
4. **Use TypeScript** for great type inference

## When to Use Which Hook

| Use `useBlocAdapter` when... | Use `useBloc` when... |
|------------------------------|----------------------|
| ✅ You need specific parts of state | ✅ You access many parts of state |
| ✅ You want explicit control | ✅ You want automatic tracking |
| ✅ Performance is critical | ✅ Simplicity is preferred |
| ✅ You have focused requirements | ✅ Dynamic access patterns |

## Next Steps

- Read the [USAGE_GUIDE.md](./USAGE_GUIDE.md) for detailed examples
- Check the [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for technical details
- Explore the playground app for interactive examples

## Need Help?

- Check the troubleshooting section in [USAGE_GUIDE.md](./USAGE_GUIDE.md#troubleshooting)
- Review examples in `/apps/playground`
- Open an issue on GitHub

---

Happy coding with BlaC! 🚀
