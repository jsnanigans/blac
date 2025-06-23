# @blac/react

A powerful React integration for the Blac state management library, providing seamless integration between React components and Blac's reactive state management system.

## Features

- 🔄 Automatic re-rendering when relevant state changes
- 🎯 Fine-grained dependency tracking
- 🔍 Property access tracking for optimized updates
- 🎨 TypeScript support with full type inference
- ⚡️ Efficient state management with minimal boilerplate
- 🔄 Support for isolated and shared bloc instances
- 🎯 Custom dependency selectors with access to state, previous state, and instance
- 🚀 Optimized re-rendering with intelligent snapshot comparison

## Important: Arrow Functions Required

All methods in Bloc or Cubit classes must use arrow function syntax (`method = () => {}`) instead of the traditional method syntax (`method() {}`). This is because arrow functions automatically bind `this` to the class instance. Without this binding, methods called from React components would lose their context and could not access instance properties like `this.state` or `this.emit()`.

```tsx
// Correct way to define methods in your Bloc/Cubit classes
class CounterBloc extends Cubit<CounterState> {
  increment = () => {
    this.emit({ ...this.state, count: this.state.count + 1 });
  }

  decrement = () => {
    this.emit({ ...this.state, count: this.state.count - 1 });
  }
}

// Incorrect way (will cause issues when called from React):
class CounterBloc extends Cubit<CounterState> {
  increment() { // ❌ Will lose 'this' context when called from components
    this.emit({ ...this.state, count: this.state.count + 1 });
  }
}
```

## Installation

```bash
npm install @blac/react
# or
yarn add @blac/react
# or
pnpm add @blac/react
```

## Quick Start

```tsx
import { useBloc } from '@blac/react';
import { CounterBloc } from './CounterBloc';

function Counter() {
  const [state, counterBloc] = useBloc(CounterBloc);

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => counterBloc.increment()}>Increment</button>
    </div>
  );
}
```

## Usage

### Basic Usage

The `useBloc` hook provides a simple way to connect your React components to Blac's state management system:

```tsx
const [state, bloc] = useBloc(YourBloc);
```

### Advanced Configuration

The hook accepts configuration options for more control:

```tsx
const [state, bloc] = useBloc(YourBloc, {
  id: 'custom-id', // Optional: Custom identifier for the bloc
  props: { /* ... */ }, // Optional: Props to pass to the bloc
  onMount: (bloc) => { /* ... */ }, // Optional: Callback when bloc is mounted (similar to useEffect(<>, []))
  selector: (currentState, previousState, instance) => [/* ... */], // Optional: Custom dependency tracking
});
```

### Automatic Dependency Tracking

The hook automatically tracks which state properties and bloc instance properties are accessed in your component and only triggers re-renders when those specific values change:

```tsx
function UserProfile() {
  const [state, userBloc] = useBloc(UserBloc);

  // Only re-renders when state.name changes
  return <h1>{state.name}</h1>;
}
```

This also works for getters and computed properties on the Bloc or Cubit class:

```tsx
function UserProfile() {
  const [state, userBloc] = useBloc(UserBloc);

  // Only re-renders when:
  // - state.firstName changes, OR
  // - state.lastName changes (because the getter accesses these properties)
  return <h1>{userBloc.fullName}</h1>; // Assuming fullName is a getter
}
```

#### How It Works

The dependency tracking system uses JavaScript Proxies to monitor property access during component renders:

1. **State Properties**: When you access `state.propertyName`, it's automatically tracked
2. **Instance Properties**: When you access `bloc.computedValue`, it's automatically tracked  
3. **Intelligent Comparison**: The system separately tracks state dependencies and instance dependencies to handle edge cases where properties are dynamically added/removed
4. **Optimized Updates**: Components only re-render when tracked dependencies actually change their values

### Custom Dependency Selector

For more control over when your component re-renders, you can provide a custom dependency selector. The selector function receives the current state, previous state, and bloc instance, and should return an array of values to track:

```tsx
const [state, bloc] = useBloc(YourBloc, {
  selector: (currentState, previousState, instance) => [
    currentState.specificField,
    currentState.anotherField,
    instance.computedValue // You can also track computed properties from the bloc instance
  ]
});
```

The component will only re-render when any of the values in the returned array change (using `Object.is` comparison, similar to React's `useEffect` dependency array).

#### Examples of Custom Selectors

**Track only specific state properties:**
```tsx
const [state, userBloc] = useBloc(UserBloc, {
  selector: (currentState) => [
    currentState.name,
    currentState.email
  ] // Only re-render when name or email changes, ignore other properties
});
```

**Track computed values:**
```tsx
const [state, shoppingCartBloc] = useBloc(ShoppingCartBloc, {
  selector: (currentState, previousState, instance) => [
    instance.totalPrice, // Computed getter
    currentState.items.length // Number of items
  ] // Only re-render when total price or item count changes
});
```

**Compare with previous state:**
```tsx
const [state, chatBloc] = useBloc(ChatBloc, {
  selector: (currentState, previousState) => [
    currentState.messages.length > (previousState?.messages.length || 0) ? 'new-message' : 'no-change'
  ] // Only re-render when new messages are added, not when existing messages change
});
```

## API Reference

### useBloc Hook

```typescript
function useBloc<B extends BlocConstructor<BlocGeneric>>(
  bloc: B,
  options?: BlocHookOptions<InstanceType<B>>
): [BlocState<InstanceType<B>>, InstanceType<B>]
```

#### Options

- `id?: string` - Custom identifier for the bloc instance
- `props?: InferPropsFromGeneric<B>` - Props to pass to the bloc
- `onMount?: (bloc: B) => void` - Callback function invoked when the react component (the consumer) is connected to the bloc instance
- `selector?: (currentState: BlocState<InstanceType<B>>, previousState: BlocState<InstanceType<B>> | undefined, instance: InstanceType<B>) => unknown[]` - Function to select dependencies for re-renders

## Best Practices

1. **Use Isolated Blocs**: When you need component-specific state, use isolated blocs:
   ```tsx
   class MyIsolatedBloc extends BlocBase {
     static isolated = true;
     // ... rest of your bloc implementation
   }
   ```

2. **Use Custom Identifiers**: When you need multiple independent instances of the same Bloc type, use custom identifiers to manage different state contexts:
   ```tsx
   // In a chat application with multiple chat rooms
   function ChatRoom({ roomId }: { roomId: string }) {
     const [state, chatBloc] = useBloc(ChatBloc, {
       id: `chat-${roomId}`, // Each room gets its own instance
       props: { roomId }
     });

     return (
       <div>
         <h2>Room: {roomId}</h2>
         {state.messages.map(msg => (
           <Message key={msg.id} message={msg} />
         ))}
       </div>
     );
   }

   // Usage:
   function ChatApp() {
     return (
       <div>
         <ChatRoom roomId="general" />
         <ChatRoom roomId="support" />
       </div>
     );
   }
   ```

3. **Choose the Right Dependency Strategy**: 
   - **Use automatic tracking** (default) for most cases - it's efficient and requires no setup
   - **Use custom selectors** when you need complex logic, computed comparisons, or want to ignore certain property changes
   - **Avoid custom selectors** for simple property access - automatic tracking is more efficient

4. **Type Safety**: Take advantage of TypeScript's type inference for better development experience and catch errors early.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
