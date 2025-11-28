---
outline: [2, 3]
---

# Registry

Instance management and lifecycle

<small>[← Back to @blac/core](./index.md)</small>

## Quick Reference

**Class:** [`StateContainerRegistry`](#statecontainerregistry)

**Interfaces:** [`InstanceEntry`](#instanceentry), [`InstanceMetadata`](#instancemetadata)

**Types:** [`BlocConstructor`](#blocconstructor), [`LifecycleEvent`](#lifecycleevent), [`LifecycleListener`](#lifecyclelistener)

## Classes

### StateContainerRegistry

Central registry for managing StateContainer instances. Handles instance lifecycle, ref counting, and lifecycle event emission.

```typescript
export declare class StateContainerRegistry
```

**Methods:**

#### `clear`

Clear all instances of a specific type

```typescript
clear<T extends StateContainer<any>>(Type: new (...args: any[]) => T): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | `new (...args: any[]) => T` |  |

#### `clearAll`

Clear all instances from all types (for testing)

Iterates all registered types and clears their instances. Also clears type tracking to reset the registry state.

```typescript
clearAll(): void;
```

#### `connect`

Connect to an instance with borrowing semantics (for B2B communication) Gets existing instance OR creates it if it doesn't exist, without incrementing ref count. Tracks cross-bloc dependency for reactive updates.

Use this in bloc-to-bloc communication when you need to ensure an instance exists but don't want to claim ownership (no ref count increment).

```typescript
connect<T extends StateContainer<any>>(Type: new (...args: any[]) => T, instanceKey?: string, constructorArgs?: any): T;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | `new (...args: any[]) => T` | The bloc class constructor |
| `instanceKey` | `string` | Optional instance key (defaults to 'default') |
| `constructorArgs` | `any` | Constructor arguments (only used if creating new instance) |

**Returns:** The bloc instance

#### `forEach`

Safely iterate over all instances of a type

```typescript
forEach<T extends StateContainer<any>>(Type: new (...args: any[]) => T, callback: (instance: T) => void): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | `new (...args: any[]) => T` |  |
| `callback` | `(instance: T) => void` |  |

#### `get`

Get an existing instance without ref counting (borrowing semantics)

```typescript
get<T extends StateContainer<any>>(Type: new (...args: any[]) => T, instanceKey?: string): T;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | `new (...args: any[]) => T` |  |
| `instanceKey` | `string` |  |

#### `getAll`

Get all instances of a specific type

```typescript
getAll<T extends StateContainer<any>>(Type: new (...args: any[]) => T): T[];
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | `new (...args: any[]) => T` |  |

#### `getInstancesMap`

Get the instances Map for a specific class (public API for stats/debugging)

```typescript
getInstancesMap<T extends StateContainer<any>>(Type: new (...args: any[]) => T): Map<string, InstanceEntry>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | `new (...args: any[]) => T` |  |

#### `getRefCount`

Get reference count for an instance

```typescript
getRefCount<T extends StateContainer<any>>(Type: new (...args: any[]) => T, instanceKey?: string): number;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | `new (...args: any[]) => T` |  |
| `instanceKey` | `string` |  |

#### `getSafe`

Safely get an existing instance (borrowing semantics with error handling) Returns discriminated union for type-safe conditional access

```typescript
getSafe<T extends StateContainer<any>>(Type: new (...args: any[]) => T, instanceKey?: string): {
        error: Error;
        instance: null;
    } | {
        error: null;
        instance: T;
    };
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | `new (...args: any[]) => T` |  |
| `instanceKey` | `string` |  |

#### `getStats`

Get registry statistics (for debugging)

```typescript
getStats(): {
        registeredTypes: number;
        totalInstances: number;
        typeBreakdown: Record<string, number>;
    };
```

#### `getTypes`

Get all registered types (for plugin system)

```typescript
getTypes(): Array<new (...args: any[]) => StateContainer<any>>;
```

#### `hasInstance`

Check if an instance exists

```typescript
hasInstance<T extends StateContainer<any>>(Type: new (...args: any[]) => T, instanceKey?: string): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | `new (...args: any[]) => T` |  |
| `instanceKey` | `string` |  |

#### `on`

Subscribe to lifecycle events

```typescript
on<E extends LifecycleEvent>(event: E, listener: LifecycleListener<E>): () => void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `event` | `E` | The lifecycle event to listen for |
| `listener` | `LifecycleListener<E>` | The listener function to call when the event occurs |

**Returns:** Unsubscribe function

#### `register`

Register a StateContainer class with configuration

```typescript
register<T extends StateContainer<any>>(constructor: new (...args: any[]) => T, isolated?: boolean): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `constructor` | `new (...args: any[]) => T` | The StateContainer class constructor |
| `isolated` | `boolean` | Whether instances should be isolated (component-scoped) |

#### `registerType`

Register a type for lifecycle event tracking

```typescript
registerType<T extends StateContainer<any>>(constructor: new (...args: any[]) => T): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `constructor` | `new (...args: any[]) => T` | The StateContainer class constructor |

#### `release`

Release a reference to an instance

```typescript
release<T extends StateContainer<any>>(Type: new (...args: any[]) => T, instanceKey?: string, forceDispose?: boolean): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | `new (...args: any[]) => T` |  |
| `instanceKey` | `string` |  |
| `forceDispose` | `boolean` |  |

#### `resolve`

Resolve an instance with ref counting (ownership semantics)

```typescript
resolve<T extends StateContainer<any>>(Type: new (...args: any[]) => T, instanceKey?: string, constructorArgs?: any): T;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | `new (...args: any[]) => T` |  |
| `instanceKey` | `string` |  |
| `constructorArgs` | `any` |  |

**Examples:**


```ts
const registry = new StateContainerRegistry();
const instance = registry.resolve(MyBloc);
registry.on('stateChanged', (container, prev, next) => {
  console.log('State changed:', prev, '->', next);
});
```

---

## Interfaces

### InstanceEntry

Entry in the instance registry, tracking the instance and its reference count  @template T - Instance type

```typescript
export interface InstanceEntry<T = any>
```

| Property | Type | Description |
|----------|------|-------------|
| `instance` | `T` | The state container instance |
| `refCount` | `number` | Number of active references to this instance |

---

### InstanceMetadata

Metadata information about a state container instance for debugging and inspection

```typescript
export interface InstanceMetadata
```

| Property | Type | Description |
|----------|------|-------------|
| `callstack` *(optional)* | `string` | Stack trace from when instance was created (for debugging) |
| `className` | `string` | Name of the state container class |
| `createdAt` | `number` | Timestamp when instance was created (milliseconds) |
| `currentState` *(optional)* | `any` | Current state value |
| `id` | `string` | Unique instance identifier |
| `isDisposed` | `boolean` | Whether the instance has been disposed |
| `isIsolated` | `boolean` | Whether this is an isolated (component-scoped) instance |
| `lastStateChangeTimestamp` | `number` | When state last changed (milliseconds) |
| `name` | `string` | Display name for the instance |
| `previousState` *(optional)* | `any` | Previous state value |
| `state` | `any` | Current state value |

---

## Types

### BlocConstructor

Constructor type for StateContainer classes with static registry methods. Used for type-safe hook parameters.  @template TBloc - The StateContainer instance type

```typescript
export type BlocConstructor<TBloc extends StateContainer<any, any>> = (new (...args: any[]) => TBloc) & {
    resolve(instanceKey?: string, ...args: any[]): TBloc;
    get(instanceKey?: string): TBloc;
    getSafe(instanceKey?: string): {
        error: Error;
        instance: null;
    } | {
        error: null;
        instance: TBloc;
    };
    release(instanceKey?: string): void;
    isolated?: boolean;
    keepAlive?: boolean;
};
```

### LifecycleEvent

Lifecycle events emitted by the registry

```typescript
export type LifecycleEvent = 'created' | 'stateChanged' | 'eventAdded' | 'disposed';
```

### LifecycleListener

Listener function type for each lifecycle event  @template E - The lifecycle event type

```typescript
export type LifecycleListener<E extends LifecycleEvent> = E extends 'created' ? (container: StateContainer<any>) => void : E extends 'stateChanged' ? (container: StateContainer<any>, previousState: any, currentState: any, callstack?: string) => void : E extends 'eventAdded' ? (container: Vertex<any, any>, event: any) => void : E extends 'disposed' ? (container: StateContainer<any>) => void : never;
```

