---
outline: [2, 3]
---

# @blac/core

Core state management primitives

## API Sections

| Section | Description |
|---------|-------------|
| [Registry](./core/registry.md) | Instance management and lifecycle |
| [Plugins](./core/plugins.md) | Plugin system for extending BlaC |
| [Framework Adapter](./core/adapter.md) | React integration and dependency tracking |
| [Logging](./core/logging.md) | Logging utilities for debugging |
| [Utilities](./core/utilities.md) | Helper functions, ID generation, and type utilities |

## Classes

### Cubit

> **Abstract class**

Simple state container with direct state emission. Extends StateContainer with public methods for emitting and updating state.

```typescript
export declare abstract class Cubit<S extends object = any> extends StateContainer<S>
```

**Type Parameters:**

- `S`

**Constructor:**

```typescript
constructor(initialState: S);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `initialState` | `S` |  |

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `patch` | `S extends object ? (partial: Partial<S>) => void : never` | Merge partial state changes into current state (only for object states) |

**Methods:**

#### `emit`

Replace state with a new value and notify all listeners

```typescript
emit(newState: S): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `newState` | `S` | The new state value |

#### `update`

Transform current state using an updater function and emit the new state

```typescript
update(updater: (current: S) => S): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `updater` | `(current: S) => S` | Function that receives current state and returns new state |

---

### StateContainer

> **Abstract class**

Abstract base class for all state containers in BlaC. Provides lifecycle management, subscription handling, ref counting, and integration with the global registry.

```typescript
export declare abstract class StateContainer<S extends object = any>
```

**Type Parameters:**

- `S`

**Constructor:**

```typescript
constructor(initialState: S);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `initialState` | `S` |  |

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `__excludeFromDevTools` *(static)*  | `boolean` |  |
| `createdAt` | `number` | Timestamp when this instance was created |
| `debug` | `boolean` | Whether debug logging is enabled |
| `enableStackTrace` *(static)*  | `boolean` |  |
| `instanceId` | `string` | Unique identifier for this instance |
| `isDisposed` *(readonly)*  | `boolean` | Whether this instance has been disposed |
| `lastUpdateTimestamp` | `number` | Timestamp of the last state update |
| `name` | `string` | Display name for this instance |
| `onSystemEvent` | `<E extends SystemEvent>(event: E, handler: SystemEventHandler<S, E>) => (() => void)` | Subscribe to system lifecycle events. |
| `state` *(readonly)*  | `Readonly<S>` | Current state value |

**Methods:**

#### `dispose`

Dispose this instance and clean up resources. Clears all listeners and emits the 'dispose' system event.

```typescript
dispose(): void;
```

#### `emit` *(protected)*

Emit a new state value and notify all listeners.

```typescript
protected emit(newState: S): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `newState` | `S` | The new state value |

#### `initConfig`

Initialize configuration for this instance. Called by the registry after construction.

```typescript
initConfig(config: StateContainerConfig): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `StateContainerConfig` | Configuration options |

#### `subscribe`

Subscribe to state changes

```typescript
subscribe(listener: StateListener<S>): () => void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `listener` | `StateListener<S>` | Function called when state changes |

**Returns:** Unsubscribe function

#### `update` *(protected)*

Update state using a transform function.

```typescript
protected update(updater: (current: S) => S): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `updater` | `(current: S) => S` | Function that receives current state and returns new state |

**Examples:**


```ts
class CounterBloc extends StateContainer<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment() {
    this.emit({ count: this.state.count + 1 });
  }
}
```

---

## Interfaces

### StateContainerConfig

Configuration options for initializing a StateContainer instance

```typescript
export interface StateContainerConfig
```

| Property | Type | Description |
|----------|------|-------------|
| `debug` *(optional)* | `boolean` | Enable debug logging for this instance |
| `instanceId` *(optional)* | `string` | Custom instance identifier |
| `name` *(optional)* | `string` | Display name for the instance (defaults to class name) |

---

### SystemEventPayloads

Payload types for each system event  @template S - State type

```typescript
export interface SystemEventPayloads<S>
```

| Property | Type | Description |
|----------|------|-------------|
| `dispose` | `void` | Emitted when the instance is disposed |
| `stateChanged` | `S` | Emitted when state changes via emit() or update() |

---

## Functions

### blac

Decorator to configure StateContainer classes.

```typescript
export declare function blac(options: BlacOptions): <T extends new (...args: any[]) => any>(target: T, _context?: ClassDecoratorContext) => T;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `BlacOptions` |  |

**Examples:**

**Decorator syntax (requires experimentalDecorators or TC39 decorators)**

```ts
@blac({ isolated: true })
class FormBloc extends Cubit<FormState> {}

@blac({ keepAlive: true })
class AuthBloc extends Cubit<AuthState> {}

@blac({ excludeFromDevTools: true })
class InternalBloc extends Cubit<InternalState> {}
```

**Function syntax (no decorator support needed)**

```ts
const FormBloc = blac({ isolated: true })(
  class extends Cubit<FormState> {}
);
```

---

## Types

### ExtractConstructorArgs

Extract constructor argument types from a class  @template T - The class type

```typescript
export type ExtractConstructorArgs<T> = T extends new (...args: infer P) => any ? P : never[];
```

### ExtractState

Extract the state type from a StateContainer  @template T - The StateContainer type

```typescript
export type ExtractState<T> = T extends StateContainerConstructor<infer S> ? Readonly<S> : never;
```

### SystemEvent

System events emitted by StateContainer lifecycle

```typescript
export type SystemEvent = 'stateChanged' | 'dispose';
```

