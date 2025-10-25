# Quick Start

Get started with `@blac/core` in just a few steps.

## Basic Cubit

The simplest way to manage state in BlaC is with a Cubit:

```typescript
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<number> {
  constructor() {
    super(0); // Initial state
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };

  reset = () => {
    this.emit(0);
  };
}
```

## Using a Cubit

```typescript
// Create an instance
const counter = new CounterCubit();

// Subscribe to state changes
const subscription = counter.stream.listen((state) => {
  console.log('Count:', state);
});

// Update state
counter.increment(); // Console: "Count: 1"
counter.increment(); // Console: "Count: 2"
counter.decrement(); // Console: "Count: 1"

// Clean up
subscription.cancel();
counter.close();
```

## Event-Driven Bloc

For more complex logic, use a Bloc with events:

```typescript
import { Bloc } from '@blac/core';

// Define events
class CounterEvent {}

class IncrementEvent extends CounterEvent {
  constructor(public readonly amount: number = 1) {}
}

class DecrementEvent extends CounterEvent {
  constructor(public readonly amount: number = 1) {}
}

class ResetEvent extends CounterEvent {}

// Define Bloc
class CounterBloc extends Bloc<number, CounterEvent> {
  constructor() {
    super(0);

    this.on(IncrementEvent, (event, emit) => {
      emit(this.state + event.amount);
    });

    this.on(DecrementEvent, (event, emit) => {
      emit(this.state - event.amount);
    });

    this.on(ResetEvent, (event, emit) => {
      emit(0);
    });
  }

  // Public API methods
  increment = (amount = 1) => {
    this.add(new IncrementEvent(amount));
  };

  decrement = (amount = 1) => {
    this.add(new DecrementEvent(amount));
  };

  reset = () => {
    this.add(new ResetEvent());
  };
}
```

## Complex State Example

Managing complex state with typed interfaces:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({
      user: null,
      isLoading: false,
      error: null,
    });
  }

  fetchUser = async (userId: string) => {
    // Set loading state
    this.emit({
      ...this.state,
      isLoading: true,
      error: null,
    });

    try {
      const response = await fetch(`/api/users/${userId}`);
      const user = await response.json();

      this.emit({
        user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      this.emit({
        user: null,
        isLoading: false,
        error: error.message,
      });
    }
  };

  clearUser = () => {
    this.emit({
      user: null,
      isLoading: false,
      error: null,
    });
  };
}
```

## Async Operations

Handling asynchronous operations in Blocs:

```typescript
class DataEvent {}
class FetchDataEvent extends DataEvent {
  constructor(public readonly params: Params) {}
}

interface DataState {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: Data | null;
  error: Error | null;
}

class DataBloc extends Bloc<DataState, DataEvent> {
  constructor(private api: ApiClient) {
    super({ status: 'idle', data: null, error: null });

    this.on(FetchDataEvent, async (event, emit) => {
      emit({ status: 'loading', data: null, error: null });

      try {
        const data = await this.api.fetch(event.params);
        emit({ status: 'success', data, error: null });
      } catch (error) {
        emit({ status: 'error', data: null, error });
      }
    });
  }

  fetchData = (params: Params) => {
    this.add(new FetchDataEvent(params));
  };
}
```

## Subscribing to State Changes

Multiple ways to subscribe to state changes:

```typescript
const cubit = new CounterCubit();

// Method 1: Stream listener
const subscription = cubit.stream.listen((state) => {
  console.log('New state:', state);
});

// Method 2: Observer
cubit.addObserver({
  onStateChange: (state) => {
    console.log('State changed to:', state);
  },
});

// Don't forget to clean up
subscription.cancel();
cubit.close();
```

## Next Steps

- Learn about [Cubit](/core/cubit) in detail
- Explore [Bloc](/core/bloc) event patterns
- Understand [State Management](/core/state-management) best practices
- Configure [Global Settings](/core/configuration)
