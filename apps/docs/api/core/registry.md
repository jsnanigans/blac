---
outline: [2, 3]
---

# Registry

Instance management and lifecycle

<small>[← Back to @blac/core](./index.md)</small>

## Quick Reference

**Class:** [`StateContainerRegistry`](#statecontainerregistry)

**Standalone Functions:** `acquire`, `borrow`, `borrowSafe`, `ensure`, `release`, `hasInstance`, `getRefCount`, `getAll`, `forEach`, `clear`, `clearAll`, `register`, `getRegistry`, `setRegistry`, `getStats`

**Interfaces:** [`InstanceEntry`](#instanceentry), [`InstanceMetadata`](#instancemetadata)

**Types:** [`BlocConstructor`](#blocconstructor), [`LifecycleEvent`](#lifecycleevent), [`LifecycleListener`](#lifecyclelistener)

## Standalone Functions

These functions operate on the global registry. They're convenient wrappers around `StateContainerRegistry` methods.

```typescript
import { acquire, release, ensure, borrow } from '@blac/core';

const counter = acquire(CounterCubit); // Create/get with ref counting
const other = ensure(OtherCubit); // Ensure exists, no ref count
const borrowed = borrow(CounterCubit); // Get existing, no ref count
release(CounterCubit); // Decrement ref count
```

See the [`StateContainerRegistry`](#statecontainerregistry) class methods below for detailed documentation.

## Classes

### StateContainerRegistry

Central registry for managing StateContainer instances. Handles instance lifecycle, ref counting, and lifecycle event emission.

```typescript
export declare class StateContainerRegistry
```

**Methods:**

#### `acquire`

Acquire an instance with ref counting (ownership semantics). Creates a new instance if one doesn't exist, or returns existing and increments ref count. You must call `release()` when done to decrement the ref count.

```typescript
acquire<T extends StateContainerConstructor = StateContainerConstructor>(Type: T, instanceKey?: string, options?: {
        canCreate?: boolean;
        countRef?: boolean;
        props?: ExtractProps<T>;
        trackExecutionContext?: boolean;
    }): InstanceType<T>;
```

| Parameter     | Type     | Description                          |
| ------------- | -------- | ------------------------------------ |
| `Type`        | `T`      | The StateContainer class constructor |
| `instanceKey` | `string` | Instance key (defaults to 'default') |
| `options`     | `{       |

        canCreate?: boolean;
        countRef?: boolean;
        props?: ExtractProps<T>;
        trackExecutionContext?: boolean;
    }` | Acquisition options |

**Returns:** The state container instance

#### `borrow`

Borrow an existing instance without incrementing ref count (borrowing semantics). Tracks cross-bloc dependency for reactive updates.

```typescript
borrow<T extends StateContainerConstructor = StateContainerConstructor>(Type: T, instanceKey?: string): InstanceType<T>;
```

| Parameter     | Type     | Description                          |
| ------------- | -------- | ------------------------------------ |
| `Type`        | `T`      | The StateContainer class constructor |
| `instanceKey` | `string` | Instance key (defaults to 'default') |

**Returns:** The state container instance

#### `borrowSafe`

Safely borrow an existing instance (borrowing semantics with error handling). Returns discriminated union for type-safe conditional access.

```typescript
borrowSafe<T extends StateContainerConstructor = StateContainerConstructor>(Type: T, instanceKey?: string): {
        error: Error;
        instance: null;
    } | {
        error: null;
        instance: InstanceType<T>;
    };
```

| Parameter     | Type     | Description                          |
| ------------- | -------- | ------------------------------------ |
| `Type`        | `T`      | The StateContainer class constructor |
| `instanceKey` | `string` | Instance key (defaults to 'default') |

**Returns:** Discriminated union with either the instance or an error

#### `clear`

Clear all instances of a specific type (disposes them).

```typescript
clear<T extends StateContainerConstructor>(Type: T): void;
```

| Parameter | Type | Description                          |
| --------- | ---- | ------------------------------------ |
| `Type`    | `T`  | The StateContainer class constructor |

#### `clearAll`

Clear all instances from all types (for testing)

Iterates all registered types and clears their instances. Also clears type tracking to reset the registry state.

```typescript
clearAll(): void;
```

#### `ensure`

Ensure an instance exists without taking ownership (for bloc-to-bloc communication). Gets existing instance OR creates it if it doesn't exist, without incrementing ref count. Tracks cross-bloc dependency for reactive updates.

Use this in bloc-to-bloc communication when you need to ensure an instance exists but don't want to claim ownership (no ref count increment).

```typescript
ensure<T extends StateContainerConstructor = StateContainerConstructor>(Type: T, instanceKey?: string): InstanceType<T>;
```

| Parameter     | Type     | Description                          |
| ------------- | -------- | ------------------------------------ |
| `Type`        | `T`      | The StateContainer class constructor |
| `instanceKey` | `string` | Instance key (defaults to 'default') |

**Returns:** The state container instance

#### `forEach`

Safely iterate over all instances of a type. Skips disposed instances and catches callback errors.

```typescript
forEach<T extends StateContainerConstructor>(Type: T, callback: (instance: InstanceReadonlyState<T>) => void): void;
```

| Parameter  | Type                                           | Description                          |
| ---------- | ---------------------------------------------- | ------------------------------------ |
| `Type`     | `T`                                            | The StateContainer class constructor |
| `callback` | `(instance: InstanceReadonlyState<T>) => void` | Function to call for each instance   |

#### `getAll`

Get all instances of a specific type.

```typescript
getAll<T extends StateContainerConstructor>(Type: T): InstanceReadonlyState<T>[];
```

| Parameter | Type | Description                          |
| --------- | ---- | ------------------------------------ |
| `Type`    | `T`  | The StateContainer class constructor |

**Returns:** Array of all instances

#### `getInstancesMap`

Get the instances Map for a specific class (public API for stats/debugging)

```typescript
getInstancesMap<T extends StateContainerConstructor>(Type: T): Map<string, InstanceEntry>;
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `Type`    | `T`  |             |

#### `getRefCount`

Get reference count for an instance.

```typescript
getRefCount<T extends StateContainerConstructor>(Type: T, instanceKey?: string): number;
```

| Parameter     | Type     | Description                          |
| ------------- | -------- | ------------------------------------ |
| `Type`        | `T`      | The StateContainer class constructor |
| `instanceKey` | `string` | Instance key (defaults to 'default') |

**Returns:** Current ref count (0 if instance doesn't exist)

#### `getStats`

Get registry statistics for debugging.

```typescript
getStats(): {
        registeredTypes: number;
        totalInstances: number;
        typeBreakdown: Record<string, number>;
    };
```

**Returns:** Object with registeredTypes, totalInstances, and typeBreakdown

#### `getTypes`

Get all registered types (for plugin system).

```typescript
getTypes(): StateContainerConstructor[];
```

**Returns:** Array of all registered StateContainer class constructors

#### `hasInstance`

Check if an instance exists.

```typescript
hasInstance<T extends StateContainerConstructor>(Type: T, instanceKey?: string): boolean;
```

| Parameter     | Type     | Description                          |
| ------------- | -------- | ------------------------------------ |
| `Type`        | `T`      | The StateContainer class constructor |
| `instanceKey` | `string` | Instance key (defaults to 'default') |

**Returns:** true if instance exists

#### `on`

Subscribe to lifecycle events

```typescript
on<E extends LifecycleEvent>(event: E, listener: LifecycleListener<E>): () => void;
```

| Parameter  | Type                   | Description                                         |
| ---------- | ---------------------- | --------------------------------------------------- |
| `event`    | `E`                    | The lifecycle event to listen for                   |
| `listener` | `LifecycleListener<E>` | The listener function to call when the event occurs |

**Returns:** Unsubscribe function

#### `register`

Register a StateContainer class with configuration

```typescript
register<T extends StateContainerConstructor>(constructor: T, isolated?: boolean): void;
```

| Parameter     | Type      | Description                                             |
| ------------- | --------- | ------------------------------------------------------- |
| `constructor` | `T`       | The StateContainer class constructor                    |
| `isolated`    | `boolean` | Whether instances should be isolated (component-scoped) |

#### `registerType`

Register a type for lifecycle event tracking

```typescript
registerType<T extends StateContainerConstructor>(constructor: T): void;
```

| Parameter     | Type | Description                          |
| ------------- | ---- | ------------------------------------ |
| `constructor` | `T`  | The StateContainer class constructor |

#### `release`

Release a reference to an instance. Decrements ref count and disposes when it reaches 0 (unless keepAlive).

```typescript
release<T extends StateContainerConstructor>(Type: T, instanceKey?: string, forceDispose?: boolean): void;
```

| Parameter      | Type      | Description                                      |
| -------------- | --------- | ------------------------------------------------ |
| `Type`         | `T`       | The StateContainer class constructor             |
| `instanceKey`  | `string`  | Instance key (defaults to 'default')             |
| `forceDispose` | `boolean` | Force immediate disposal regardless of ref count |

**Examples:**

```ts
const registry = new StateContainerRegistry();
const instance = registry.acquire(MyBloc); // ownership, must release
const other = registry.ensure(OtherBloc); // no ownership, bloc-to-bloc
registry.on('stateChanged', (container, prev, next) => {
  console.log('State changed:', prev, '->', next);
});
```

---

## Interfaces

### InstanceEntry

Entry in the instance registry, tracking the instance and its reference count @template T - Instance type

```typescript
export interface InstanceEntry<T = any>
```

| Property   | Type     | Description                                  |
| ---------- | -------- | -------------------------------------------- |
| `instance` | `T`      | The state container instance                 |
| `refCount` | `number` | Number of active references to this instance |

---

### InstanceMetadata

Metadata information about a state container instance for debugging and inspection

```typescript
export interface InstanceMetadata
```

| Property                     | Type      | Description                                                |
| ---------------------------- | --------- | ---------------------------------------------------------- |
| `callstack` _(optional)_     | `string`  | Stack trace from when instance was created (for debugging) |
| `className`                  | `string`  | Name of the state container class                          |
| `createdAt`                  | `number`  | Timestamp when instance was created (milliseconds)         |
| `currentState` _(optional)_  | `any`     | Current state value                                        |
| `id`                         | `string`  | Unique instance identifier                                 |
| `isDisposed`                 | `boolean` | Whether the instance has been disposed                     |
| `isIsolated`                 | `boolean` | Whether this is an isolated (component-scoped) instance    |
| `lastStateChangeTimestamp`   | `number`  | When state last changed (milliseconds)                     |
| `name`                       | `string`  | Display name for the instance                              |
| `previousState` _(optional)_ | `any`     | Previous state value                                       |
| `state`                      | `any`     | Current state value                                        |

---

## Types

### BlocConstructor

Constructor type for StateContainer classes with static registry methods. Used for type-safe hook parameters. @template TBloc - The StateContainer instance type

```typescript
export type BlocConstructor<
  S extends object = any,
  T extends new (...args: any[]) => StateContainer<S, any> = new (
    ...args: any[]
  ) => StateContainer<S, any>,
> = (new (...args: any[]) => InstanceType<T>) & {
  acquire(instanceKey?: string, ...args: any[]): InstanceType<T>;
  borrow(instanceKey?: string, ...args: any[]): InstanceType<T> | null;
  borrowSafe(
    instanceKey?: string,
    ...args: any[]
  ):
    | {
        error: Error;
        instance: null;
      }
    | {
        error: null;
        instance: InstanceType<T>;
      };
  ensure(instanceKey?: string): InstanceType<T>;
  release(instanceKey?: string): void;
  isolated?: boolean;
  keepAlive?: boolean;
};
```

### LifecycleEvent

Lifecycle events emitted by the registry

```typescript
export type LifecycleEvent =
  | 'created'
  | 'stateChanged'
  | 'eventAdded'
  | 'disposed';
```

### LifecycleListener

Listener function type for each lifecycle event @template E - The lifecycle event type

```typescript
export type LifecycleListener<E extends LifecycleEvent> = E extends 'created'
  ? (container: StateContainer<any>) => void
  : E extends 'stateChanged'
    ? (
        container: StateContainer<any>,
        previousState: any,
        currentState: any,
        callstack?: string,
      ) => void
    : E extends 'eventAdded'
      ? (container: Vertex<any, any>, event: any) => void
      : E extends 'disposed'
        ? (container: StateContainer<any>) => void
        : never;
```
