# Configuration

BlaC provides global configuration options to customize behavior.

## Global Configuration

Configure BlaC at the application level:

```typescript
import { Blac } from '@blac/core';

Blac.setConfig({
  proxyDependencyTracking: true, // Enable automatic dependency tracking
});
```

## Configuration Options

### Proxy Dependency Tracking

Enable or disable automatic dependency tracking with proxies:

```typescript
Blac.setConfig({
  proxyDependencyTracking: true, // Default: false
});
```

**When enabled:**
- Automatic dependency tracking for state access
- Proxy-wrapped state objects
- Fine-grained reactivity

**When disabled:**
- Manual subscription management
- Direct state access (better performance)
- Explicit dependency declarations

::: tip
For most use cases, **disable** proxy tracking and use selectors in React for better performance.
:::

## Logging Configuration

Configure the built-in logging system:

```typescript
import { BlacLogger, LogLevel } from '@blac/core';

BlacLogger.configure({
  enabled: true,
  level: LogLevel.DEBUG, // ERROR, WARN, INFO, or DEBUG
});
```

### Log Levels

- `LogLevel.ERROR` - Critical errors only
- `LogLevel.WARN` - Warnings and errors
- `LogLevel.INFO` - Important informational messages
- `LogLevel.DEBUG` - Detailed diagnostic information (default when enabled)

### Custom Logger Output

Provide a custom output function for logs:

```typescript
BlacLogger.configure({
  enabled: true,
  level: LogLevel.DEBUG,
  output: (entry) => {
    // Send to remote logging service
    myLoggingService.log(entry);

    // Or custom formatting
    console.log(`[${entry.level}] ${entry.category}: ${entry.message}`);
  },
});
```

### Environment-Based Configuration

Configure logging based on environment:

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

BlacLogger.configure({
  enabled: isDevelopment,
  level: isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR,
});
```

## Plugin System

Register global plugins to extend functionality:

```typescript
import { Blac, BlacPlugin, BlacLifecycleEvent } from '@blac/core';

class LoggerPlugin implements BlacPlugin {
  name = 'LoggerPlugin';

  onEvent(event: BlacLifecycleEvent, bloc: BlocBase, params?: any) {
    if (event === BlacLifecycleEvent.STATE_CHANGED) {
      console.log(`[${bloc._name}] State changed:`, params);
    }
  }
}

// Register plugin globally
Blac.addPlugin(new LoggerPlugin());
```

### Available Lifecycle Events

- `INITIALIZED` - Bloc/Cubit instance created
- `STATE_CHANGED` - State emission occurred
- `ERROR` - Error occurred during operation
- `DISPOSED` - Bloc/Cubit disposed

### Built-in Plugins

Install and configure official plugins:

```typescript
import { PersistencePlugin } from '@blac/plugin-persistence';
import { RenderLoggingPlugin } from '@blac/plugin-render-logging';

// Persistence plugin
Blac.addPlugin(
  new PersistencePlugin({
    storage: localStorage,
    key: 'blac-state',
  })
);

// Render logging plugin (development only)
if (process.env.NODE_ENV === 'development') {
  Blac.addPlugin(new RenderLoggingPlugin());
}
```

## Instance Configuration

Configure individual Bloc/Cubit instances:

### Static Properties

```typescript
class MyCubit extends Cubit<number> {
  // Keep instance alive even without consumers
  static keepAlive = true;

  // Each consumer gets its own instance
  static isolated = true;

  constructor() {
    super(0);
  }
}
```

### Instance Name

Override the default instance name for debugging:

```typescript
class UserCubit extends Cubit<UserState> {
  constructor(userId: string) {
    super(initialState);
    this._name = `UserCubit_${userId}`;
  }
}
```

## React-Specific Configuration

Configure React integration behavior:

```typescript
import { useBloc } from '@blac/react';

function MyComponent() {
  const [state, bloc] = useBloc(MyCubit, {
    // Selector for fine-grained reactivity
    selector: (state) => state.importantField,

    // Lifecycle callbacks
    onMount: (bloc) => {
      bloc.initialize();
    },
    onUnmount: (bloc) => {
      bloc.cleanup();
    },

    // Custom equality function
    equals: (a, b) => a.id === b.id,

    // Props for constructor
    props: { userId: '123' },
  });

  return <div>{state}</div>;
}
```

## Performance Tuning

### Disable Proxy Tracking

For best performance, disable proxy tracking and use selectors:

```typescript
Blac.setConfig({
  proxyDependencyTracking: false,
});
```

### Use Selectors

Fine-grained reactivity with selectors:

```typescript
const [userName, userBloc] = useBloc(UserBloc, {
  selector: (state) => state.user?.name,
});
```

### Memoize Selectors

For expensive computations, memoize selectors:

```typescript
import { useMemo } from 'react';

function MyComponent() {
  const selector = useMemo(
    () => (state: State) => ({
      total: state.items.reduce((sum, item) => sum + item.price, 0),
    }),
    []
  );

  const [total] = useBloc(CartBloc, { selector });
  return <div>Total: {total}</div>;
}
```

## Development vs Production

Configure differently for development and production:

```typescript
const isProduction = process.env.NODE_ENV === 'production';

Blac.setConfig({
  proxyDependencyTracking: !isProduction,
});

BlacLogger.configure({
  enabled: !isProduction,
  level: isProduction ? LogLevel.ERROR : LogLevel.DEBUG,
});

// Add development-only plugins
if (!isProduction) {
  Blac.addPlugin(new DevToolsPlugin());
  Blac.addPlugin(new RenderLoggingPlugin());
}
```

## Next Steps

- Learn about [Plugins](/core/plugins) in detail
- Explore [Logging](/core/logging) features
- Understand [Instance Management](/core/instance-management)
