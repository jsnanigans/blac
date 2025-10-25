# React Quick Start

Get started with `@blac/react` to integrate BlaC state management in your React applications.

## Installation

```bash
pnpm add @blac/core @blac/react
```

## Basic Usage

### 1. Create a Cubit

```typescript
// counter-cubit.ts
import { Cubit } from '@blac/core';

export class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };
}
```

### 2. Use in React Component

```tsx
// Counter.tsx
import { useBloc } from '@blac/react';
import { CounterCubit } from './counter-cubit';

export function Counter() {
  const [count, cubit] = useBloc(CounterCubit);

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={cubit.increment}>Increment</button>
      <button onClick={cubit.decrement}>Decrement</button>
    </div>
  );
}
```

## With Selectors

Optimize re-renders with selectors:

```tsx
import { useBloc } from '@blac/react';
import { UserBloc } from './user-bloc';

function UserProfile() {
  // Only re-renders when user.name changes
  const [userName, userBloc] = useBloc(UserBloc, {
    selector: (state) => state.user?.name,
  });

  return <div>Hello, {userName}!</div>;
}
```

## Multiple State Selections

Select multiple fields:

```tsx
function UserCard() {
  const [userData, userBloc] = useBloc(UserBloc, {
    selector: (state) => ({
      name: state.user?.name,
      avatar: state.user?.avatar,
      email: state.user?.email,
    }),
  });

  return (
    <div>
      <img src={userData.avatar} alt={userData.name} />
      <h2>{userData.name}</h2>
      <p>{userData.email}</p>
    </div>
  );
}
```

## Lifecycle Callbacks

Run code when the component mounts or unmounts:

```tsx
function DataLoader() {
  const [data, dataBloc] = useBloc(DataBloc, {
    onMount: (bloc) => {
      bloc.fetchData();
    },
    onUnmount: (bloc) => {
      bloc.cleanup();
    },
  });

  if (!data) return <div>Loading...</div>;

  return <div>{data.title}</div>;
}
```

## Event-Driven Blocs

Using Blocs with events:

```typescript
// user-bloc.ts
import { Bloc } from '@blac/core';

export class UserEvent {}

export class LoginRequested extends UserEvent {
  constructor(public email: string, public password: string) {}
}

export class LogoutRequested extends UserEvent {}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export class UserBloc extends Bloc<UserState, UserEvent> {
  constructor(private authService: AuthService) {
    super({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    this.on(LoginRequested, async (event, emit) => {
      emit({ ...this.state, isLoading: true });

      try {
        const user = await this.authService.login(event.email, event.password);
        emit({ user, isAuthenticated: true, isLoading: false });
      } catch (error) {
        emit({ ...this.state, isLoading: false });
      }
    });

    this.on(LogoutRequested, async (event, emit) => {
      await this.authService.logout();
      emit({ user: null, isAuthenticated: false, isLoading: false });
    });
  }

  login = (email: string, password: string) => {
    this.add(new LoginRequested(email, password));
  };

  logout = () => {
    this.add(new LogoutRequested());
  };
}
```

```tsx
// LoginForm.tsx
import { useBloc } from '@blac/react';
import { UserBloc } from './user-bloc';

export function LoginForm() {
  const [state, userBloc] = useBloc(UserBloc);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    userBloc.login(email, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button disabled={state.isLoading}>
        {state.isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

## Shared State

By default, Blocs/Cubits are shared across components:

```tsx
// Both components share the same CounterCubit instance
function ComponentA() {
  const [count] = useBloc(CounterCubit);
  return <div>A: {count}</div>;
}

function ComponentB() {
  const [count] = useBloc(CounterCubit);
  return <div>B: {count}</div>; // Same count as ComponentA
}
```

## Isolated Instances

Each component gets its own instance:

```typescript
class IsolatedCounter extends Cubit<number> {
  static isolated = true; // Enable isolated mode

  constructor() {
    super(0);
  }

  increment = () => this.emit(this.state + 1);
}
```

```tsx
// Each component has its own counter
function ComponentA() {
  const [count] = useBloc(IsolatedCounter);
  return <div>A: {count}</div>;
}

function ComponentB() {
  const [count] = useBloc(IsolatedCounter);
  return <div>B: {count}</div>; // Different count from ComponentA
}
```

## Props-Based Blocs

Pass props to Bloc constructors:

```typescript
class UserProfileBloc extends Cubit<UserProfile> {
  constructor(private userId: string) {
    super(null);
    this._name = `UserProfileBloc_${userId}`;
  }

  loadProfile = async () => {
    const profile = await api.fetchUser(this.userId);
    this.emit(profile);
  };
}
```

```tsx
function UserProfile({ userId }: { userId: string }) {
  const [profile, bloc] = useBloc(UserProfileBloc, {
    props: { userId },
    onMount: (bloc) => bloc.loadProfile(),
  });

  if (!profile) return <div>Loading...</div>;

  return <div>{profile.name}</div>;
}
```

## Loading States

Handle loading, success, and error states:

```typescript
interface DataState<T> {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: T | null;
  error: Error | null;
}

class DataCubit<T> extends Cubit<DataState<T>> {
  constructor() {
    super({ status: 'idle', data: null, error: null });
  }

  load = async (fetcher: () => Promise<T>) => {
    this.emit({ status: 'loading', data: null, error: null });

    try {
      const data = await fetcher();
      this.emit({ status: 'success', data, error: null });
    } catch (error) {
      this.emit({ status: 'error', data: null, error });
    }
  };
}
```

```tsx
function DataDisplay() {
  const [state, cubit] = useBloc(DataCubit<User>, {
    onMount: (cubit) => cubit.load(() => api.fetchUser()),
  });

  if (state.status === 'loading') return <div>Loading...</div>;
  if (state.status === 'error') return <div>Error: {state.error.message}</div>;
  if (state.status === 'success') return <div>{state.data.name}</div>;

  return <div>Idle</div>;
}
```

## Next Steps

- Learn about [useBloc Hook](/react/use-bloc) in detail
- Explore [Selectors](/react/selectors) for optimization
- Understand [Lifecycle Callbacks](/react/lifecycle)
- Review [Performance Best Practices](/react/performance)
