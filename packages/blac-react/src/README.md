# @blac/react

A powerful React integration for the Blac state management library, providing seamless integration between React components and Blac's reactive state management system.

## Features

- 🔄 Automatic re-rendering when relevant state changes
- 🎯 Fine-grained dependency tracking
- 🔍 Property access tracking for optimized updates
- 🎨 TypeScript support with full type inference
- ⚡️ Efficient state management with minimal boilerplate
- 🔄 Support for isolated and shared bloc instances
- 🎯 Custom dependency selectors for precise control

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
  dependencySelector: (newState, oldState) => [/* ... */], // Optional: Custom dependency tracking
});
```

### Dependency Tracking

The hook automatically tracks which state properties are accessed in your component and only triggers re-renders when those specific properties change:

```tsx
function UserProfile() {
  const [state, userBloc] = useBloc(UserBloc);

  // Only re-renders when state.name changes
  return <h1>{state.name}</h1>;
}
```

This also works for getters on the Bloc or Cubit class:

```tsx
function UserProfile() {
  const [, userBloc] = useBloc(UserBloc);

  // Only re-renders when the return value from the getter formattedName changes
  return <h1>{userBloc.formattedName}</h1>;
}
```

### Custom Dependency Selector

For more control over when your component re-renders, you can provide a custom dependency selector:

```tsx
const [state, bloc] = useBloc(YourBloc, {
  dependencySelector: (newState, oldState) => [
    newState.specificField,
    newState.anotherField
  ]
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
- `dependencySelector?: BlocHookDependencyArrayFn<B>` - Function to select dependencies for re-renders

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

3. **Optimize Re-renders**: Let the hook track dependencies automatically unless you have a specific need for custom dependency tracking.

4. **Type Safety**: Take advantage of TypeScript's type inference for better development experience and catch errors early.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
