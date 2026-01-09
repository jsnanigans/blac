---
outline: [2, 3]
---

# @blac/core

Core state management primitives

## API Sections

| Section | Description |
|---------|-------------|
| [Registry](./registry.md) | Instance management and lifecycle |
| [Plugins](./plugins.md) | Plugin system for extending BlaC |
| [Framework Adapter](./adapter.md) | React integration and dependency tracking |
| [Logging](./logging.md) | Logging utilities for debugging |
| [Utilities](./utilities.md) | Helper functions, ID generation, and type utilities |

## Classes

### Cubit

> **Abstract class**

Simple state container with direct state emission. Extends StateContainer with public methods for emitting and updating state.

```typescript
export declare abstract class Cubit<S extends object = any, P = undefined> extends StateContainer<S, P>
```

**Type Parameters:**

- `S`
- `P`

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
export declare abstract class StateContainer<S extends object = any, P = any>
```

**Type Parameters:**

- `S`
- `P`

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
| `onSystemEvent` | `<E extends SystemEvent>(event: E, handler: SystemEventHandler<S, P, E>) => (() => void)` | Subscribe to system lifecycle events. |
| `props` *(readonly)*  | `P \| undefined` | Current props value passed to this container |
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

#### `updateProps`

Update the props for this container. Emits the 'propsUpdated' system event.

```typescript
updateProps(newProps: P): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `newProps` | `P` | The new props value |

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

### Vertex

> **Abstract class**

Event-driven state container using discriminated union events. Extends StateContainer with event-based state transitions and compile-time exhaustive checking for event handlers.

```typescript
export declare abstract class Vertex<S extends object = object, E extends DiscriminatedEvent = DiscriminatedEvent, P = undefined> extends StateContainer<S, P>
```

**Type Parameters:**

- `S`
- `E`
- `P`

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
| `add` | `(event: E) => void` | Dispatch an event for processing. Events are processed synchronously; if called during processing, the event is queued and processed after the current event completes. |

**Methods:**

#### `createHandlers` *(protected)*

Register all event handlers with exhaustive type checking. TypeScript will error if any event type from the union is missing.

```typescript
protected createHandlers(handlers: EventHandlerMap<E, S>): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `handlers` | `EventHandlerMap<E, S>` | Map of event type to handler function |

#### `onEventError` *(protected)*

Called when an error occurs during event processing. Override to implement custom error handling.

```typescript
protected onEventError(_event: EventWithMetadata<E>, _error: Error): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `_event` | `EventWithMetadata<E>` | The event that caused the error |
| `_error` | `Error` | The error that occurred |

**Examples:**


```typescript
type CounterEvent =
  | { type: 'increment'; amount: number }
  | { type: 'decrement' }
  | { type: 'reset' };

class CounterVertex extends Vertex<{ count: number }, CounterEvent> {
  constructor() {
    super({ count: 0 });
    this.createHandlers({
      increment: (event, emit) => {
        emit({ count: this.state.count + event.amount });
      },
      decrement: (_, emit) => {
        emit({ count: this.state.count - 1 });
      },
      reset: (_, emit) => {
        emit({ count: 0 });
      },
    });
  }

  increment = (amount = 1) => this.add({ type: 'increment', amount });
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

Payload types for each system event  @template S - State type  @template P - Props type

```typescript
export interface SystemEventPayloads<S, P>
```

| Property | Type | Description |
|----------|------|-------------|
| `dispose` | `void` | Emitted when the instance is disposed |
| `propsUpdated` | `P` | Emitted when props are updated via updateProps() |
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

### ExtractProps

Extract the props type from a StateContainer  @template T - The StateContainer type

```typescript
export type ExtractProps<T> = T extends StateContainerConstructor<any, infer P> ? P : undefined;
```

### ExtractState

Extract the state type from a StateContainer  @template T - The StateContainer type

```typescript
export type ExtractState<T> = T extends StateContainerConstructor<infer S, any> ? Readonly<S> : never;
```

### SystemEvent

System events emitted by StateContainer lifecycle

```typescript
export type SystemEvent = 'propsUpdated' | 'stateChanged' | 'dispose';
```
