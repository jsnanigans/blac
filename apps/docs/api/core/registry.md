---
outline: [2, 3]
---

# Registry

Instance management and lifecycle

<small>[← Back to @blac/core](./index.md)</small>

## Quick Reference

**Interfaces:** [`InstanceEntry`](#instanceentry), [`InstanceMetadata`](#instancemetadata)

**Types:** [`BlocConstructor`](#blocconstructor), [`LifecycleEvent`](#lifecycleevent), [`LifecycleListener`](#lifecyclelistener)

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
export type BlocConstructor<S extends object = any, T extends new (...args: any[]) => StateContainer<S> = new (...args: any[]) => StateContainer<S>> = (new (...args: any[]) => InstanceType<T>) & {
    acquire(instanceKey?: string, ...args: any[]): InstanceType<T>;
    borrow(instanceKey?: string, ...args: any[]): InstanceType<T> | null;
    borrowSafe(instanceKey?: string, ...args: any[]): {
        error: Error;
        instance: null;
    } | {
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
export type LifecycleEvent = 'created' | 'stateChanged' | 'disposed';
```

### LifecycleListener

Listener function type for each lifecycle event  @template E - The lifecycle event type

```typescript
export type LifecycleListener<E extends LifecycleEvent> = E extends 'created' ? (container: StateContainer<any>) => void : E extends 'stateChanged' ? (container: StateContainer<any>, previousState: any, currentState: any, callstack?: string) => void : E extends 'disposed' ? (container: StateContainer<any>) => void : never;
```

