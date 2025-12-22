# waitUntil

Wait for a bloc's state to meet a condition. Automatically tracks dependencies accessed in the predicate.

## Basic Usage

Wait for a condition on the bloc, returns the bloc instance:

```typescript
import { waitUntil } from '@blac/core';

const userBloc = await waitUntil(
  UserBloc,
  (bloc) => bloc.state.isAuthenticated,
);
// userBloc is now authenticated
```

## With Selector

Wait for a condition on a selected value, returns the selected value:

```typescript
const layout = await waitUntil(
  LayoutBloc,
  (bloc) => bloc.state.currentLayout, // selector
  (layout) => layout !== null, // predicate
);
// layout is the non-null currentLayout value
```

## With Getters

Works with computed getters too:

```typescript
const userBloc = await waitUntil(UserBloc, (bloc) => bloc.isReady);
const user = await waitUntil(
  UserBloc,
  (bloc) => bloc.currentUser,
  (user) => user !== null,
);
```

## Options

```typescript
interface WaitUntilOptions {
  instanceId?: string; // Target a specific instance (default: shared)
  timeout?: number; // Timeout in milliseconds
  signal?: AbortSignal; // Abort signal for cancellation
}
```

### Timeout

```typescript
try {
  const bloc = await waitUntil(UserBloc, (bloc) => bloc.state.isReady, {
    timeout: 5000,
  });
} catch (error) {
  if (error instanceof WaitUntilTimeoutError) {
    console.log('Timed out waiting for user');
  }
}
```

### Abort Signal

```typescript
const controller = new AbortController();

const promise = waitUntil(UserBloc, (bloc) => bloc.state.isReady, {
  signal: controller.signal,
});

// Cancel later
controller.abort();
```

### Specific Instance

```typescript
const bloc = await waitUntil(UserBloc, (bloc) => bloc.state.isReady, {
  instanceId: 'user-123',
});
```

## Error Types

| Error                    | When                        |
| ------------------------ | --------------------------- |
| `WaitUntilTimeoutError`  | Timeout exceeded            |
| `WaitUntilAbortedError`  | AbortSignal triggered       |
| `WaitUntilDisposedError` | Bloc disposed while waiting |
