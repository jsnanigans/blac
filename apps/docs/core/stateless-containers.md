# Stateless Containers

Stateless containers are blocs that don't manage state. Use them for action-only logic like analytics, logging, or API calls.

## StatelessCubit

A Cubit without state management. Has no `emit()`, `update()`, `patch()`, or accessible `state`.

```typescript
import { StatelessCubit } from '@blac/core';

class AnalyticsService extends StatelessCubit {
  trackPageView(page: string) {
    analytics.track('page_view', { page });
  }

  trackClick(element: string) {
    analytics.track('click', { element });
  }
}
```

## StatelessVertex

An event-driven container without state. Handlers receive only the event (no `emit` function).

```typescript
import { StatelessVertex } from '@blac/core';

type LogEvent =
  | { type: 'info'; message: string }
  | { type: 'error'; message: string; error: Error }
  | { type: 'warn'; message: string };

class LoggingVertex extends StatelessVertex<LogEvent> {
  constructor() {
    super();
    this.createHandlers({
      info: (event) => console.log('[INFO]', event.message),
      error: (event) => console.error('[ERROR]', event.message, event.error),
      warn: (event) => console.warn('[WARN]', event.message),
    });
  }

  info = (message: string) => this.add({ type: 'info', message });
  error = (message: string, error: Error) =>
    this.add({ type: 'error', message, error });
  warn = (message: string) => this.add({ type: 'warn', message });
}
```

## React Usage

Use `useBlocActions` instead of `useBloc` for stateless containers:

```tsx
import { useBlocActions } from '@blac/react';

function MyComponent() {
  const analytics = useBlocActions(AnalyticsService);
  const logger = useBlocActions(LoggingVertex);

  return (
    <button
      onClick={() => {
        analytics.trackClick('submit-button');
        logger.info('Button clicked');
      }}
    >
      Submit
    </button>
  );
}
```

::: warning
Using `useBloc` with a stateless container will throw an error. Always use `useBlocActions`.
:::

## Key Differences

| Feature               | Cubit/Vertex | StatelessCubit/StatelessVertex |
| --------------------- | ------------ | ------------------------------ |
| State management      | Yes          | No                             |
| `emit()` / `update()` | Yes          | Throws error                   |
| `state` property      | Yes          | Throws error                   |
| Subscriptions         | Yes          | Throws error                   |
| React hook            | `useBloc`    | `useBlocActions`               |
