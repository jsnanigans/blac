---
outline: [2, 3]
---

# Logging

Logging utilities for debugging

<small>[← Back to @blac/core](./index.md)</small>

## Quick Reference

**Interfaces:** [`LogConfig`](#logconfig), [`LogEntry`](#logentry)

**Functions:** [`configureLogger`](#configurelogger), [`createLogger`](#createlogger), [`debug`](#debug), [`error`](#error), [`info`](#info), [`warn`](#warn)

**Enum:** [`LogLevel`](#loglevel)

## Interfaces

### LogConfig

Configuration for the logger

```typescript
export interface LogConfig
```

| Property  | Type                        | Description                           |
| --------- | --------------------------- | ------------------------------------- |
| `enabled` | `boolean`                   | Whether logging is enabled            |
| `level`   | `LogLevel`                  | Minimum log level to output           |
| `output`  | `(entry: LogEntry) => void` | Function called to output log entries |

---

### LogEntry

Structure of a log entry passed to output handlers

```typescript
export interface LogEntry
```

| Property            | Type     | Description                                             |
| ------------------- | -------- | ------------------------------------------------------- |
| `context`           | `string` | Context identifier (typically component or module name) |
| `data` _(optional)_ | `any`    | Optional structured data                                |
| `level`             | `string` | Log level as string (DEBUG, INFO, WARN, ERROR)          |
| `message`           | `string` | Log message                                             |
| `timestamp`         | `number` | Unix timestamp in milliseconds                          |

---

## Functions

### configureLogger

Configuration function that recreates the default logger

```typescript
export declare function configureLogger(opts: Partial<LogConfig>): void;
```

| Parameter | Type                 | Description                  |
| --------- | -------------------- | ---------------------------- |
| `opts`    | `Partial<LogConfig>` | Partial logger configuration |

**Examples:**

```ts
configureLogger({ enabled: true, level: LogLevel.DEBUG });
```

---

### createLogger

Creates a logger instance with given configuration

```typescript
export declare function createLogger(config: LogConfig): {
  debug: (context: string, message: string, data?: any) => void;
  info: (context: string, message: string, data?: any) => void;
  warn: (context: string, message: string, data?: any) => void;
  error: (context: string, message: string, data?: any) => void;
  configure: (opts: Partial<LogConfig>) => void;
};
```

| Parameter | Type        | Description          |
| --------- | ----------- | -------------------- |
| `config`  | `LogConfig` | Logger configuration |

**Returns:** Logger instance with debug, info, warn, error, and configure methods

**Examples:**

```ts
const logger = createLogger({
  enabled: true,
  level: LogLevel.DEBUG,
  output: (entry) => console.log(JSON.stringify(entry)),
});
logger.debug('MyComponent', 'Rendering', { props: { foo: 'bar' } });
```

---

### debug

Log a debug message (tree-shakeable export)

```typescript
debug: (context: string, message: string, data?: any) => void
```

| Parameter | Type     | Description                                   |
| --------- | -------- | --------------------------------------------- |
| `context` | `string` | Context identifier (module or component name) |
| `message` | `string` | Log message                                   |
| `data`    | `any`    | Optional structured data                      |

---

### error

Log an error message (tree-shakeable export)

```typescript
error: (context: string, message: string, data?: any) => void
```

| Parameter | Type     | Description                                   |
| --------- | -------- | --------------------------------------------- |
| `context` | `string` | Context identifier (module or component name) |
| `message` | `string` | Log message                                   |
| `data`    | `any`    | Optional structured data                      |

---

### info

Log an info message (tree-shakeable export)

```typescript
info: (context: string, message: string, data?: any) => void
```

| Parameter | Type     | Description                                   |
| --------- | -------- | --------------------------------------------- |
| `context` | `string` | Context identifier (module or component name) |
| `message` | `string` | Log message                                   |
| `data`    | `any`    | Optional structured data                      |

---

### warn

Log a warning message (tree-shakeable export)

```typescript
warn: (context: string, message: string, data?: any) => void
```

| Parameter | Type     | Description                                   |
| --------- | -------- | --------------------------------------------- |
| `context` | `string` | Context identifier (module or component name) |
| `message` | `string` | Log message                                   |
| `data`    | `any`    | Optional structured data                      |

---

## Enums

### LogLevel

Log severity levels (lower number = higher severity)

| Member  | Value | Description                                        |
| ------- | ----- | -------------------------------------------------- |
| `DEBUG` | `3`   | Detailed debugging information                     |
| `ERROR` | `0`   | Critical errors that may cause application failure |
| `INFO`  | `2`   | Informational messages about application state     |
| `WARN`  | `1`   | Warning conditions that should be addressed        |
