# Global Configuration

Configure global defaults for `@blac/core` using `configureBlac()`.

## Usage

```typescript
import { configureBlac, LogLevel } from '@blac/core';

configureBlac({
  devMode: true,
  logger: {
    enabled: true,
    level: LogLevel.DEBUG,
  },
});
```

## Options

```typescript
interface BlacConfig {
  devMode: boolean; // Enable development mode (default: NODE_ENV !== 'production')
  logger: Partial<LogConfig>; // Logger configuration
}
```

### devMode

When enabled, provides additional warnings and checks during development.

```typescript
configureBlac({ devMode: true });
```

### logger

Configure the built-in logger. See [Logging](./logging.md) for details.

```typescript
configureBlac({
  logger: {
    enabled: true,
    level: LogLevel.DEBUG,
  },
});
```

## Helper Functions

### isDevMode()

Check if development mode is enabled:

```typescript
import { isDevMode } from '@blac/core';

if (isDevMode()) {
  console.log('Running in dev mode');
}
```

## Defaults

| Option           | Default                                 |
| ---------------- | --------------------------------------- |
| `devMode`        | `process.env.NODE_ENV !== 'production'` |
| `logger.enabled` | `false`                                 |
| `logger.level`   | `LogLevel.INFO`                         |
