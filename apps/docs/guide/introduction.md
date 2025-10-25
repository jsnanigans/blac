# What is BlaC?

BlaC (Business Logic Component) is a sophisticated TypeScript state management library that implements the BLoC pattern with modern innovations for JavaScript and TypeScript applications.

## Overview

BlaC provides a predictable and testable way to manage application state through:

- **Cubits**: Simple state containers with direct state emission
- **Blocs**: Event-driven state containers with class-based event handlers
- **Fine-grained reactivity**: Selector-based subscriptions for optimal performance
- **Plugin system**: Extensible architecture for custom functionality
- **Type safety**: Built with TypeScript for excellent type inference

## The BLoC Pattern

The Business Logic Component (BLoC) pattern separates business logic from presentation logic, making your code:

- **Testable**: Business logic is isolated and easy to unit test
- **Reusable**: Blocs can be shared across different UI frameworks
- **Predictable**: State changes follow a clear, unidirectional flow
- **Maintainable**: Clean separation of concerns

## Key Features

### Type-Safe State Management

Built with TypeScript from the ground up, BlaC provides excellent type inference:

```typescript
class UserCubit extends Cubit<User | null> {
  constructor() {
    super(null);
  }

  login = (user: User) => {
    this.emit(user); // Type-safe!
  };
}
```

### Event-Driven Architecture

Handle complex business logic with class-based events:

```typescript
class UserEvent {}
class LoginRequested extends UserEvent {
  constructor(public email: string, public password: string) {}
}

class UserBloc extends Bloc<UserState, UserEvent> {
  constructor(private authService: AuthService) {
    super(initialState);

    this.on(LoginRequested, async (event, emit) => {
      const user = await this.authService.login(event.email, event.password);
      emit({ user, isAuthenticated: true });
    });
  }
}
```

### React Integration

```typescript
function Counter() {
  const [state, bloc] = useBloc(CounterBloc);

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={bloc.increment}>+</button>
    </div>
  );
}
```

## V2 Architecture

BlaC v2 introduces significant improvements:

- **Adapter Pattern**: Clean separation between React lifecycle and BlaC state management
- **Selector-based reactivity**: Fine-grained subscriptions for optimal re-render control
- **Version-based change detection**: Better performance than deep comparisons
- **Generation Counter Pattern**: Eliminates memory leaks in React Strict Mode
- **Reference counting**: Proper lifecycle management
- **Automatic dependency tracking**: Via Proxies for optimized React re-renders
- **Plugin system**: Extensible architecture for custom functionality

See [Core Concepts](/guide/core-concepts) to learn more.
