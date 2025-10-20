# Logging Quick Start

## Enable Logging

```typescript
import { Blac } from '@blac/core';

// Enable logging for lifecycle and state
Blac.setConfig({
  logging: {
    level: 'log',
    topics: ['lifecycle', 'state'],
  }
});
```

## View Logs

Open browser DevTools console:

```
[lifecycle] Bloc created { isolated: false, ... }
[state] State emitted { previousState: 0, newState: 1 }
```

## Filter by Bloc

```typescript
// Only log CounterBloc and related
Blac.setConfig({
  logging: {
    level: 'log',
    topics: 'all',
    namespaces: 'Counter*',  // Wildcard matching
  }
});
```

## Runtime Control

```typescript
// Enable/disable at runtime
Blac.logging.setLevel('log');
Blac.logging.enableTopic('subscriptions');
Blac.logging.disableTopic('state');
Blac.logging.setNamespaces(['UserBloc', 'AuthBloc']);
```

## Topics

- **lifecycle**: Bloc creation, disposal, adapter mount/unmount
- **state**: State emissions with previous/next values
- **subscriptions**: Observer add/remove, notification cycles
- **performance**: Timing data (reserved for future)

## Backwards Compatibility

```typescript
// Old API still works
Blac.enableLog = true;  // → sets level: 'log'
Blac.logSpy = vi.fn();  // → still captures logs

// New API recommended
Blac.setConfig({ logging: { level: 'log', topics: 'all' } });
```

See [full documentation](./logging.md) for complete API reference and advanced usage.
