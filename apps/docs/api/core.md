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
export declare abstract class Cubit<S, P = undefined> extends StateContainer<S, P>
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
export declare abstract class StateContainer<S, P = undefined>
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
| `createdAt` | `number` | Timestamp when this instance was created |
| `debug` | `boolean` | Whether debug logging is enabled |
| `enableStackTrace` *(static)*  | `boolean` | Whether to capture stack traces on state changes (disabled in production) |
| `instanceId` | `string` | Unique identifier for this instance |
| `isDisposed` *(readonly)*  | `boolean` | Whether this instance has been disposed |
| `lastUpdateTimestamp` | `number` | Timestamp of the last state update |
| `name` | `string` | Display name for this instance |
| `onSystemEvent` | `<E extends SystemEvent>(event: E, handler: SystemEventHandler<S, P, E>) => (() => void)` | Subscribe to system lifecycle events. |
| `props` *(readonly)*  | `P \| undefined` | Current props value passed to this container |
| `state` *(readonly)*  | `S` | Current state value |

**Methods:**

#### `clear` *(static)*

Clear all instances of this class (disposes them)

```typescript
static clear<T extends StateContainer<any>>(this: new (...args: any[]) => T): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |

#### `clearAllInstances` *(static)*

Clear all instances from all registered types

```typescript
static clearAllInstances(): void;
```

#### `connect` *(static)*

Connect to an instance for bloc-to-bloc communication (borrowing semantics). Gets or creates instance without incrementing ref count.

```typescript
static connect<T extends StateContainer<any>>(this: new (...args: any[]) => T, instanceKey?: string, constructorArgs?: any): T;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |
| `instanceKey` | `string` | Optional instance key (defaults to 'default') |
| `constructorArgs` | `any` | Arguments to pass to constructor if creating new instance |

**Returns:** The state container instance

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

#### `forEach` *(static)*

Iterate over all instances of this class

```typescript
static forEach<T extends StateContainer<any>>(this: new (...args: any[]) => T, callback: (instance: T) => void): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |
| `callback` | `(instance: T) => void` | Function to call for each instance |

#### `get` *(static)*

Get an existing instance without incrementing ref count (borrowing semantics).

```typescript
static get<T extends StateContainer<any>>(this: new (...args: any[]) => T, instanceKey?: string): T;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |
| `instanceKey` | `string` | Optional instance key (defaults to 'default') |

**Returns:** The state container instance

#### `getAll` *(static)*

Get all instances of this class

```typescript
static getAll<T extends StateContainer<any>>(this: new (...args: any[]) => T): T[];
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |

**Returns:** Array of all instances

#### `getRefCount` *(static)*

Get reference count for an instance

```typescript
static getRefCount<T extends StateContainer<any>>(this: new (...args: any[]) => T, instanceKey?: string): number;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |
| `instanceKey` | `string` | Optional instance key (defaults to 'default') |

**Returns:** Current ref count (0 if instance doesn't exist)

#### `getRegistry` *(static)*

Get the global StateContainerRegistry

```typescript
static getRegistry(): StateContainerRegistry;
```

**Returns:** The registry managing all state container instances

#### `getSafe` *(static)*

Safely get an existing instance with error handling.

```typescript
static getSafe<T extends StateContainer<any>>(this: new (...args: any[]) => T, instanceKey?: string): {
        error: Error;
        instance: null;
    } | {
        error: null;
        instance: T;
    };
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |
| `instanceKey` | `string` | Optional instance key (defaults to 'default') |

**Returns:** Discriminated union with either the instance or an error

#### `getStats` *(static)*

Get registry statistics for debugging

```typescript
static getStats(): {
        registeredTypes: number;
        totalInstances: number;
        typeBreakdown: Record<string, number>;
    };
```

**Returns:** Object with registeredTypes, totalInstances, and typeBreakdown

#### `hasInstance` *(static)*

Check if an instance exists

```typescript
static hasInstance<T extends StateContainer<any>>(this: new (...args: any[]) => T, instanceKey?: string): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |
| `instanceKey` | `string` | Optional instance key (defaults to 'default') |

**Returns:** true if instance exists

#### `initConfig`

Initialize configuration for this instance. Called by the registry after construction.

```typescript
initConfig(config: StateContainerConfig): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `StateContainerConfig` | Configuration options |

#### `register` *(static)*

Register this class with the global registry

```typescript
static register<T extends StateContainer<any>>(this: new (...args: any[]) => T, isolated?: boolean): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |
| `isolated` | `boolean` | Whether instances should be isolated (component-scoped) |

#### `release` *(static)*

Release a reference to an instance. Decrements ref count and disposes when it reaches 0 (unless keepAlive).

```typescript
static release<T extends StateContainer<any>>(this: new (...args: any[]) => T, instanceKey?: string, forceDispose?: boolean): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |
| `instanceKey` | `string` | Optional instance key (defaults to 'default') |
| `forceDispose` | `boolean` | Force immediate disposal regardless of ref count |

#### `resolve` *(static)*

Resolve an instance with ref counting (ownership semantics). Creates a new instance if one doesn't exist, or returns existing and increments ref count.

```typescript
static resolve<T extends StateContainer<any>>(this: new (...args: any[]) => T, instanceKey?: string, constructorArgs?: any): T;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |
| `instanceKey` | `string` | Optional instance key (defaults to 'default') |
| `constructorArgs` | `any` | Arguments to pass to constructor if creating new instance |

**Returns:** The state container instance

#### `setRegistry` *(static)*

Replace the global registry (clears existing instances)

```typescript
static setRegistry(registry: StateContainerRegistry): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `registry` | `StateContainerRegistry` | The new registry to use |

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
class CounterBloc extends StateContainer<number> {
  constructor() {
    super(0);
  }
  increment() {
    this.emit(this.state + 1);
  }
}
```

---

### Vertex

> **Abstract class**

Event-driven state container that processes events to update state. Use with event handlers registered via the on() method.

```typescript
export declare abstract class Vertex<S, E extends BaseEvent = BaseEvent, P = undefined> extends StateContainer<S, P>
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
| `add` | `(event: E) => void` | Add an event to the event stream for processing |
| `on` | `<T extends E>(EventClass: EventConstructor<T>, handler: EventHandler<T, S>) => void` | Register a handler for a specific event type |

**Methods:**

#### `onEventError` *(protected)*

Handle errors that occur during event processing. Override this method to implement custom error handling.

```typescript
protected onEventError(_event: E, _error: Error): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `_event` | `E` | The event that caused the error |
| `_error` | `Error` | The error that occurred |

---

## Interfaces

### BaseEvent

Base event interface Used by Vertex for event-driven state management

```typescript
export interface BaseEvent
```

| Property | Type | Description |
|----------|------|-------------|
| `source` *(optional)* | `string` | Optional source identifier for debugging |
| `timestamp` | `number` | Unix timestamp when the event was created |
| `type` | `string` | Event type identifier (typically the class name) |

---

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
export type ExtractProps<T> = T extends StateContainer<any, infer P> ? P : undefined;
```

### ExtractState

Extract the state type from a StateContainer  @template T - The StateContainer type

```typescript
export type ExtractState<T> = T extends StateContainer<infer S, any> ? S : never;
```

### SystemEvent

System events emitted by StateContainer lifecycle

```typescript
export type SystemEvent = 'propsUpdated' | 'stateChanged' | 'dispose';
```

