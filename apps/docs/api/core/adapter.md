---
outline: [2, 3]
---

# Framework Adapter

React integration and dependency tracking

<small>[← Back to @blac/core](./index.md)</small>

## Quick Reference

**Class:** [`ExternalDependencyManager`](#externaldependencymanager)

**Interfaces:** [`AdapterState`](#adapterstate), [`ManualDepsConfig`](#manualdepsconfig)

**Functions:** [`createAutoTrackSnapshot`](#createautotracksnapshot), [`createAutoTrackSubscribe`](#createautotracksubscribe), [`createManualDepsSnapshot`](#createmanualdepssnapshot), [`createManualDepsSubscribe`](#createmanualdepssubscribe), [`createNoTrackSnapshot`](#createnotracksnapshot), [`createNoTrackSubscribe`](#createnotracksubscribe), [`disableGetterTracking`](#disablegettertracking), [`initAutoTrackState`](#initautotrackstate), [`initManualDepsState`](#initmanualdepsstate), [`initNoTrackState`](#initnotrackstate)

**Types:** [`SnapshotFunction`](#snapshotfunction), [`SubscribeFunction`](#subscribefunction), [`SubscriptionCallback`](#subscriptioncallback)

## Classes

### ExternalDependencyManager

Manages subscriptions to external bloc dependencies for getter tracking. When a getter accesses another bloc's state, this manager ensures re-renders occur when those external dependencies change.

```typescript
export declare class ExternalDependencyManager
```

**Methods:**

#### `cleanup`

Clean up all active subscriptions

```typescript
cleanup(): void;
```

#### `updateSubscriptions`

Update subscriptions to external bloc dependencies. Creates subscriptions to blocs accessed via getters.

```typescript
updateSubscriptions(getterTracker: GetterTrackerState | null, rawInstance: StateContainer<any, any>, onGetterChange: () => void): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `getterTracker` | `GetterTrackerState \| null` | The getter tracker state with external dependencies |
| `rawInstance` | `StateContainer<any, any>` | The primary bloc instance (excluded from subscriptions) |
| `onGetterChange` | `() => void` | Callback to invoke when external dependency changes |

**Returns:** true if subscriptions were updated, false if unchanged

---

## Interfaces

### AdapterState

Internal state for framework adapters, holding tracking and caching data.  @template TBloc - The state container type

```typescript
export interface AdapterState<TBloc extends StateContainer<any, any>>
```

| Property | Type | Description |
|----------|------|-------------|
| `getterTracker` | `GetterTrackerState \| null` | Getter tracker for computed property tracking |
| `manualDepsCache` | `unknown[] \| null` | Cached manual dependencies for comparison |
| `proxiedBloc` | `TBloc \| null` | Proxied bloc instance for auto-tracking |
| `tracker` | `TrackerState<ExtractState<TBloc>> \| null` | Proxy tracker for state property access tracking |

---

### ManualDepsConfig

Configuration for manual dependency tracking mode  @template TBloc - The state container type

```typescript
export interface ManualDepsConfig<TBloc extends StateContainer<any, any>>
```

| Property | Type | Description |
|----------|------|-------------|
| `dependencies` | `(state: any, bloc: TBloc) => unknown[]` | Function that returns dependency array from state and bloc |

---

## Functions

### createAutoTrackSnapshot

Create a snapshot function for auto-tracking mode. Returns a proxied state that tracks property access.

```typescript
export declare function createAutoTrackSnapshot<TBloc extends StateContainer<any, any>>(instance: TBloc, adapterState: AdapterState<TBloc>): SnapshotFunction<ExtractState<TBloc>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `TBloc` | The state container instance |
| `adapterState` | `AdapterState<TBloc>` | The adapter state for tracking |

**Returns:** Snapshot function for use with useSyncExternalStore

---

### createAutoTrackSubscribe

Create a subscribe function for auto-tracking mode. Only triggers callback when tracked properties change.

```typescript
export declare function createAutoTrackSubscribe<TBloc extends StateContainer<any, any>>(instance: TBloc, adapterState: AdapterState<TBloc>): SubscribeFunction;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `TBloc` | The state container instance |
| `adapterState` | `AdapterState<TBloc>` | The adapter state for tracking |

**Returns:** Subscribe function for use with useSyncExternalStore

---

### createManualDepsSnapshot

Create a snapshot function for manual dependency tracking mode. Caches dependencies for comparison on next render.

```typescript
export declare function createManualDepsSnapshot<TBloc extends StateContainer<any, any>>(instance: TBloc, adapterState: AdapterState<TBloc>, config: ManualDepsConfig<TBloc>): SnapshotFunction<ExtractState<TBloc>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `TBloc` | The state container instance |
| `adapterState` | `AdapterState<TBloc>` | The adapter state for caching |
| `config` | `ManualDepsConfig<TBloc>` | Configuration with dependencies function |

**Returns:** Snapshot function for use with useSyncExternalStore

---

### createManualDepsSubscribe

Create a subscribe function for manual dependency tracking mode. Only triggers callback when dependencies array changes.

```typescript
export declare function createManualDepsSubscribe<TBloc extends StateContainer<any, any>>(instance: TBloc, adapterState: AdapterState<TBloc>, config: ManualDepsConfig<TBloc>): SubscribeFunction;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `TBloc` | The state container instance |
| `adapterState` | `AdapterState<TBloc>` | The adapter state for caching |
| `config` | `ManualDepsConfig<TBloc>` | Configuration with dependencies function |

**Returns:** Subscribe function for use with useSyncExternalStore

---

### createNoTrackSnapshot

Create a snapshot function for no-tracking mode. Returns the raw state directly.

```typescript
export declare function createNoTrackSnapshot<TBloc extends StateContainer<any, any>>(instance: TBloc): SnapshotFunction<ExtractState<TBloc>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `TBloc` | The state container instance |

**Returns:** Snapshot function for use with useSyncExternalStore

---

### createNoTrackSubscribe

Create a subscribe function for no-tracking mode. Triggers callback on every state change.

```typescript
export declare function createNoTrackSubscribe<TBloc extends StateContainer<any, any>>(instance: TBloc): SubscribeFunction;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `TBloc` | The state container instance |

**Returns:** Subscribe function for use with useSyncExternalStore

---

### disableGetterTracking

Disable getter tracking after render phase completes. Clears the active tracker to prevent tracking outside of render.

```typescript
export declare function disableGetterTracking<TBloc extends StateContainer<any, any>>(adapterState: AdapterState<TBloc>, rawInstance: TBloc): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `adapterState` | `AdapterState<TBloc>` | The adapter state |
| `rawInstance` | `TBloc` | The raw bloc instance |

---

### initAutoTrackState

Initialize adapter state for auto-tracking mode. Creates getter tracker and proxied bloc instance.

```typescript
export declare function initAutoTrackState<TBloc extends StateContainer<any, any>>(instance: TBloc): AdapterState<TBloc>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `TBloc` | The state container instance |

**Returns:** Initialized adapter state

---

### initManualDepsState

Initialize adapter state for manual dependency tracking mode. No proxy is created; bloc is used directly.

```typescript
export declare function initManualDepsState<TBloc extends StateContainer<any, any>>(instance: TBloc): AdapterState<TBloc>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `TBloc` | The state container instance |

**Returns:** Initialized adapter state

---

### initNoTrackState

Initialize adapter state for no-tracking mode. No tracking or proxy is created.

```typescript
export declare function initNoTrackState<TBloc extends StateContainer<any, any>>(instance: TBloc): AdapterState<TBloc>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `TBloc` | The state container instance |

**Returns:** Initialized adapter state

---

## Types

### SnapshotFunction

Function that returns a snapshot of the current state  @template TState - The state type

```typescript
export type SnapshotFunction<TState> = () => TState;
```

### SubscribeFunction

Function that subscribes to state changes and returns an unsubscribe function

```typescript
export type SubscribeFunction = (callback: SubscriptionCallback) => () => void;
```

### SubscriptionCallback

Callback function invoked when subscribed state changes

```typescript
export type SubscriptionCallback = () => void;
```

