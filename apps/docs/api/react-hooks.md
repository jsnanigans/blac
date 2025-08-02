# React Hooks

Blac provides React hooks to connect your components to state containers.

## useBloc

The primary hook for connecting a component to a Bloc/Cubit.

### Signature

```tsx
function useBloc<
  B extends BlocConstructor<BlocGeneric>,
  O extends BlocHookOptions<InstanceType<B>>,
>(blocClass: B, options?: O): [BlocState<InstanceType<B>>, InstanceType<B>];
```

### Parameters

| Name                  | Type                                                                                                                                         | Required | Description                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------- |
| `blocClass`           | `BlocConstructor<BlocGeneric>`                                                                                                               | Yes      | The Bloc/Cubit class to use                                    |
| `options.instanceId`  | `string`                                                                                                                                     | No       | Optional identifier for the Bloc/Cubit instance                |
| `options.staticProps` | `ConstructorParameters<B>[0]`                                                                                                                | No       | Static props to pass to the Bloc/Cubit constructor             |
| `options.selector`    | `(currentState: BlocState<InstanceType<B>>, previousState: BlocState<InstanceType<B>> \| undefined, instance: InstanceType<B>) => unknown[]` | No       | Function to select dependencies that should trigger re-renders |
| `options.onMount`     | `(bloc: InstanceType<B>) => void`                                                                                                            | No       | Callback function invoked when the Bloc is mounted             |

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

:::info Proxy Dependency Tracking
This automatic property tracking is enabled by default through BlaC's proxy-based dependency tracking system. You can disable it globally if needed:

```tsx
import { Blac } from '@blac/core';

// Disable automatic tracking globally
Blac.setConfig({ proxyDependencyTracking: false });

// Now components will re-render on ANY state change
```

See the [Configuration](/api/configuration) page for more details.
:::

---

#### Conditional Rendering and Getters with Automatic Tracking

Blac's `useBloc` hook is smart enough to update its dependencies if the properties accessed in your component change due to conditional rendering or the use of getters.

Let's consider a `UserProfileCubit` with a getter for a derived piece of information:

```tsx
// cubits/UserProfileCubit.ts
import { Cubit } from '@blac/core';

interface UserProfileState {
  firstName: string;
  lastName: string;
  age: number;
  showFullName: boolean;
  accessCount: number; // To demonstrate updates not affecting UI initially
}

export class UserProfileCubit extends Cubit<UserProfileState> {
  constructor() {
    super({
      firstName: 'Jane',
      lastName: 'Doe',
      age: 30,
      showFullName: true,
      accessCount: 0,
    });
  }

  // Getter for full name
  get fullName(): string {
    this.patch({ accessCount: this.state.accessCount + 1 }); // Side-effect for demo
    return `${this.state.firstName} ${this.state.lastName}`;
  }

  toggleShowFullName = () =>
    this.patch({ showFullName: !this.state.showFullName });
  setFirstName = (firstName: string) => this.patch({ firstName });
  setLastName = (lastName: string) => this.patch({ lastName });
  incrementAge = () => this.patch({ age: this.state.age + 1 });
  // Method to update a non-rendered property
  incrementAccessCount = () =>
    this.patch({ accessCount: this.state.accessCount + 1 });
}
```

Now, a component that uses this `UserProfileCubit` and conditionally renders information:

```tsx
// components/UserProfileDemo.tsx
import React from 'react';
import { useBloc } from '@blac/react';
import { UserProfileCubit } from '../cubits/UserProfileCubit'; // Adjust path

function UserProfileDemo() {
  const [state, cubit] = useBloc(UserProfileCubit);

  console.log('UserProfileDemo re-rendered. Access count:', state.accessCount);

  return (
    <div>
      <h2>User Profile</h2>
      {state.showFullName ? (
        <p>Name: {cubit.fullName}</p> // Accesses getter, which depends on firstName and lastName
      ) : (
        <p>First Name: {state.firstName}</p> // Only accesses firstName
      )}
      <p>Age: {state.age}</p>

      <button onClick={cubit.toggleShowFullName}>
        Toggle Full Name Display
      </button>
      <button onClick={() => cubit.setFirstName('John')}>
        Set First Name to John
      </button>
      <button onClick={() => cubit.setLastName('Smith')}>
        Set Last Name to Smith
      </button>
      <button onClick={cubit.incrementAge}>Increment Age</button>
      <button onClick={cubit.incrementAccessCount}>
        Increment Access Count (No Re-render Expected Initially)
      </button>
    </div>
  );
}

export default UserProfileDemo;
```

**Behavior Explanation:**

1.  **Initial Render (`showFullName` is `true`):**
    - The component accesses `state.showFullName`, `cubit.fullName` (which in turn accesses `state.firstName` and `state.lastName` via the getter), and `state.age`.
    - `useBloc` tracks these dependencies: `showFullName`, `firstName`, `lastName`, `age`.
    - Changing `state.accessCount` via `cubit.incrementAccessCount()` will _not_ cause a re-render because `accessCount` is not directly used in the JSX.

2.  **Click "Toggle Full Name Display" (`showFullName` becomes `false`):**
    - The component re-renders because `state.showFullName` changed.
    - Now, the JSX accesses `state.showFullName`, `state.firstName`, and `state.age`. The `cubit.fullName` getter is no longer called.
    - `useBloc` updates its dependency tracking. The new dependencies are: `showFullName`, `firstName`, `age`.
    - **Crucially, `state.lastName` is no longer a dependency.**

3.  **After Toggling ( `showFullName` is `false`):**
    - If you click "Set Last Name to Smith" (changing `state.lastName`), the component **will not re-render** because `state.lastName` is not currently an active dependency in the rendered output.
    - If you click "Set First Name to John" (changing `state.firstName`), the component **will re-render** because `state.firstName` is an active dependency.
    - If you click "Increment Age" (changing `state.age`), the component **will re-render**.

4.  **Toggle Back (`showFullName` becomes `true` again):**
    - The component re-renders due to `state.showFullName` changing.
    - The JSX now accesses `cubit.fullName` again.
    - `useBloc` re-establishes `firstName` and `lastName` (via the getter) as dependencies, along with `showFullName` and `age`.
    - Now, changing `state.lastName` will cause a re-render.

This dynamic dependency tracking ensures optimal performance by only re-rendering your component when the state it _currently_ relies on for rendering actually changes. The use of getters is also seamlessly handled, with dependencies being tracked through the getter's own state access.

---

#### Custom Instance ID for Instance Management

If you want to share the same state between multiple components but need different instances of the Bloc/Cubit, you can define a custom instance ID.

:::info
By default, each Bloc/Cubit uses its class name as an identifier.
:::

```tsx
const [state, bloc] = useBloc(ChatThreadBloc, { instanceId: 'thread-123' });
```

On its own, this is not very useful, but it becomes very powerful when the ID is dynamic.

```tsx
function ChatThread({ conversationId }: { conversationId: string }) {
  const [state, bloc] = useBloc(ChatThreadBloc, {
    instanceId: `thread-${conversationId}`,
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

While property access is automatically tracked, in some cases you might want more control over when a component re-renders. The custom selector receives the current state, previous state, and bloc instance:

:::tip Manual Dependencies Override Global Config
When you provide a custom selector (dependencies), it always takes precedence over the global `proxyDependencyTracking` setting. This allows you to have fine-grained control on a per-component basis regardless of global configuration.
:::

```tsx
function OptimizedTodoList() {
  // Using custom selector for optimization
  const [state, bloc] = useBloc(TodoBloc, {
    selector: (currentState, previousState, instance) => [
      currentState.todos.length, // Only track todo count
      currentState.filter, // Track filter changes
      instance.hasUnsavedChanges, // Track computed property from bloc
    ],
  });

  // Component will only re-render when tracked dependencies change
  return (
    <div>
      <h1>Todos ({state.todos.length})</h1>
      <p>Filter: {state.filter}</p>
      {/* ... */}
    </div>
  );
}
```

#### Advanced Custom Selector Examples

**Track only specific computed values:**

```tsx
const [state, shoppingCart] = useBloc(ShoppingCartBloc, {
  selector: (currentState, previousState, instance) => [
    instance.totalPrice, // Computed getter
    instance.itemCount, // Another computed getter
    currentState.couponCode, // Specific state property
  ],
});
```

**Conditional dependency tracking:**

```tsx
const [state, userBloc] = useBloc(UserBloc, {
  selector: (currentState, previousState, instance) => {
    const deps = [currentState.isLoggedIn];

    // Only track user details when logged in
    if (currentState.isLoggedIn) {
      deps.push(currentState.username, currentState.email);
    }

    return deps;
  },
});
```

**Compare with previous state:**

```tsx
const [state, chatBloc] = useBloc(ChatBloc, {
  selector: (currentState, previousState) => [
    // Only re-render when new messages are added, not when existing ones change
    currentState.messages.length > (previousState?.messages.length || 0)
      ? currentState.messages.length
      : 'no-new-messages',
  ],
});
```

## Advanced Usage

### Static Props

Pass configuration to blocs during initialization using `staticProps`:

```tsx
// Bloc with constructor parameters
class ThemeCubit extends Cubit<ThemeState> {
  constructor(private config: { defaultTheme: string }) {
    super({ theme: config.defaultTheme });
  }
}

// In component
function ThemeToggle() {
  const [state, bloc] = useBloc(ThemeCubit, {
    staticProps: { defaultTheme: 'dark' },
  });

  return (
    <button onClick={bloc.toggleTheme}>
      {state.theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
```

**Note**: Static props are passed once during bloc creation and don't update if changed.

### Initialization with onMount

The `onMount` option provides a way to execute logic when a Bloc is mounted, allowing you to initialize or configure the Bloc without modifying its constructor:

```tsx
function UserProfile({ userId }: { userId: string }) {
  const [state, bloc] = useBloc(UserProfileBloc, {
    onMount: (bloc) => {
      // Load user data when the component mounts
      bloc.fetchUserData(userId);
    },
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

:::tip
Use `onMount` when you need to initialize a bloc with component-specific data or trigger initial data loading.
:::
