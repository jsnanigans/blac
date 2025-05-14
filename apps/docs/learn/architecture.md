# Blac Architecture

Understanding the architecture of Blac helps in leveraging its full potential for state management in your React applications.

## Why Classes are Used in Blac

Blac deliberately uses ES6 classes for defining `Bloc` and `Cubit` state containers. This approach offers several advantages in the context of state management and aligns well with TypeScript:

-   **Identifier for Instances**: The class definition itself (e.g., `UserBloc` or `CounterCubit`) acts as a primary, human-readable key for Blac's internal instance manager. This allows Blac to uniquely identify, retrieve, and manage shared or isolated instances of state containers.

-   **Clear Structure and Encapsulation**: Classes provide a natural and well-understood way to:
    *   Define the shape of the state using generic type parameters (e.g., `Cubit<MyState>`).
    *   Initialize the state within the `constructor`.
    *   Encapsulate related business logic as methods within the same unit.

-   **TypeScript Benefits**: The class-based approach integrates seamlessly with TypeScript, enabling:
    *   Strong typing for state, constructor props, and methods, enhancing code reliability and maintainability.
    *   Correct `this` context binding when instance methods are defined as arrow functions (e.g., `increment = () => ...`), which is crucial for their use as event handlers or when passed as callbacks.
    *   Visibility modifiers (`public`, `private`, `protected`) if needed, though often not strictly necessary for typical Blac usage.

-   **Static Properties for Configuration**: Classes allow the use of `static` properties to declaratively configure the behavior of `Bloc`s and `Cubit`s. This includes:
    *   `static isolated = true;`: To mark a Bloc/Cubit for isolated instance management.
    *   `static keepAlive = true;`: To prevent a shared instance from being disposed of when it has no active listeners.
    *   `static addons = [/* ... */];`: To attach addons like `Persist` for enhanced functionality.

-   **Extensibility and Reusability**: Standard Object-Oriented Programming (OOP) patterns like inheritance can be used if desired, allowing for the creation of base Blocs/Cubits with common functionality that can be extended by more specialized ones. However, composition using addons is often a more flexible approach for adding features.

-   **Testability**: State containers defined as classes have a clear public API (constructor, methods). This makes them straightforward to instantiate, interact with, and assert against in unit tests, independent of the UI.

While functional approaches to state management are popular, the class-based design in Blac provides a robust, type-safe, and extensible foundation for organizing and managing application state, particularly as complexity grows.

## Bloc/Cubit Lifecycle

Blac uses classes for its state containers (`Bloc` and `Cubit`) primarily to define state structure and business logic without immediate initialization. This design also inherently supports multiple instances of the same state container if needed.

```typescript
// A Cubit definition (Blocs are similar)
class MyCounterCubit extends Cubit<number> {
  constructor() { super(0); }
  increment = () => this.emit(this.state + 1);
}
```

A defined `Bloc` or `Cubit` class remains dormant until it's actively used. Initialization (running the constructor and setting the initial state) occurs only when the first consumer requests an instance, typically via the `useBloc` hook in React.

```tsx
// In a React Component
function MyComponent() {
  // MyCounterCubit is initialized here if it's the first request for this (shared) instance.
  const [count, counterCubit] = useBloc(MyCounterCubit);

  // When MyComponent unmounts, if it was the last component using this shared
  // MyCounterCubit instance (and keepAlive is false), the instance will be disposed of.
  return <button onClick={counterCubit.increment}>{count}</button>;
}
```

When the last consumer of a shared `Bloc`/`Cubit` instance unregisters (e.g., its component unmounts), the instance is typically disposed of to free up resources. This behavior can be overridden:

-   **`static keepAlive = true;`**: If set on the `Bloc`/`Cubit` class, the shared instance will persist in memory even if no components are currently listening to it. See [State Management Patterns](/learn/state-management-patterns#3-in-memory-persistence-keepalive) for more.
-   **`static isolated = true;`**: If set, each `useBloc(MyIsolatedBloc)` call creates a new, independent instance of the `Bloc`/`Cubit`. This instance is then tied to the lifecycle of the component that created it and will be disposed of when that component unmounts (unless `keepAlive` is also true for that isolated class, which is a more advanced scenario).

::: tip Default: Shared State
By default, all components that use the same `Bloc`/`Cubit` class (e.g., `useBloc(MyCounterCubit)`) will share a single instance of that `Bloc`/`Cubit`.
:::

::: tip Isolated State Explained
A `Bloc`/`Cubit` with `static isolated = true` behaves much like component-local state (e.g., `useState`). Each component instance gets its own private `Bloc`/`Cubit` instance.
:::

## Controlled Sharing Groups with Custom IDs

For more granular control over sharing, you can provide a custom `id` string in the `options` argument of the `useBloc` hook. Components that use the same `Bloc`/`Cubit` class **and the same `id`** will share an instance. This allows you to create specific sharing groups independent of the default class-name-based sharing or full isolation.

```tsx
// ComponentA and ComponentB share one instance of ChatBloc for 'thread-alpha'
function ComponentA() {
  const [chatState, chatBloc] = useBloc(ChatBloc, { id: 'thread-alpha' });
  // ...
}

function ComponentB() {
  const [chatState, chatBloc] = useBloc(ChatBloc, { id: 'thread-alpha' });
  // ...
}

// ComponentC uses a *different* instance of ChatBloc for 'thread-beta'
function ComponentC() {
  const [chatState, chatBloc] = useBloc(ChatBloc, { id: 'thread-beta' });
  // ...
}

// AnotherComponent will have its own unique instance of ChatBloc if ChatBloc is
// defined with `static isolated = true`, OR if no id is provided and it's not isolated,
// it might get the default shared ChatBloc (if one exists and is different from 'thread-alpha' or 'thread-beta').
function AnotherComponent() {
  const [chatState, chatBloc] = useBloc(ChatBloc); // Behavior depends on ChatBloc definition and other usages
  // ...
}
```

This is powerful for scenarios like managing state for multiple instances of a feature (e.g., different chat conversation windows, multiple editable data records on a page).

## Separation of Concerns (Inspired by BLoC Pattern)

Blac is heavily inspired by the BLoC (Business Logic Component) pattern, which advocates for moving all business logic out of your UI components and into dedicated `Bloc` or `Cubit` classes. These state containers then become the single source of truth for their respective slice of application state.

::: tip Flexibility of Blac
While inspired by the BLoC pattern, Blac does not strictly enforce all its original tenets. It adapts these principles for a pragmatic and flexible experience within the JavaScript/React ecosystem, allowing you to structure your application to best suit your project's needs.
:::

This typically leads to a layered architecture:

-   **Presentation Layer (UI)**: Renders the UI based on state and forwards user events/intentions to the Business Logic Layer.
-   **Business Logic Layer (State Containers)**: Contains `Bloc`s/`Cubit`s that hold application state, manage state mutations in response to events, and interact with the Data Layer.
-   **Data Layer**: Handles data fetching, persistence, and communication with external services or APIs.

```mermaid
flowchart LR
    UI[Presentation Layer (React Components)] -->|User Events / Method Calls| BLC[Business Logic Layer (Blocs/Cubits)]
    BLC -->|State Updates| UI
    BLC -->|Data Requests| DL[Data Layer (Services, API Clients)]
    DL -->|Data Responses| BLC
```

### Presentation Layer (UI)

This is what your users see and interact with. In Blac, React components subscribe to state from `Bloc`s or `Cubit`s using the `useBloc` hook and dispatch intentions by calling methods on the state container instance.

```tsx
// Example: A React component in the Presentation Layer
import { useBloc } from '@blac/react';
import { UserProfileBloc } from '../blocs/UserProfileBloc';

function UserProfileDisplay() {
  const [userState, userProfileBloc] = useBloc(UserProfileBloc);

  if (userState.isLoading) return <p>Loading profile...</p>;
  if (userState.error) return <p>Error: {userState.error}</p>;

  return (
    <div>
      <h1>{userState.name}</h1>
      <button onClick={() => userProfileBloc.fetchProfile()}>Refresh Profile</button>
    </div>
  );
}
```

### Business Logic Layer (Blocs/Cubits)

This layer contains your `Bloc` and `Cubit` classes. They encapsulate specific pieces of business logic and state. They receive events/method calls from the UI, process them (potentially interacting with the Data Layer), and produce new state.

#### Bloc-to-Bloc Communication

For shared, non-isolated `Bloc`s/`Cubit`s, one state container can access another's state or call its methods using `Blac.getBloc(OtherBlocClass)`. This should be used judiciously to avoid tight coupling.

```typescript
// Inside MyBloc.ts
import { Blac, Cubit } from '@blac/core';
import { OtherBloc } from './OtherBloc'; // Assuming OtherBloc is shared and initialized

class MyBloc extends Cubit<MyStateType> {
  // ...
  performActionRequiringOtherData = () => {
    try {
      const otherBloc = Blac.getBloc(OtherBloc);
      if (otherBloc) {
        const otherData = otherBloc.state.someProperty;
        // Use otherData to update MyBloc's state
        // otherBloc.someMethod(); // Can also call methods if appropriate
      }
    } catch (error) {
      // Handle cases where OtherBloc might not be found (e.g., not yet initialized)
      console.warn('OtherBloc not available', error);
    }
  };
}
```
Ensure the target `Bloc` (`OtherBloc` in this example) is indeed shared (not `static isolated = true`) and has been initialized (i.e., `useBloc(OtherBloc)` has been called elsewhere or it's `keepAlive`).
