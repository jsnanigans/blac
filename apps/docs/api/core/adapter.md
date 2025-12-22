---
outline: [2, 3]
---

# Framework Adapter

Utilities for building framework integrations (React, Vue, Svelte, etc.)

<small>[← Back to @blac/core](./index.md)</small>

::: warning Advanced API
This API is intended for authors building framework integrations. Most users should use `@blac/react` directly.
:::

## Quick Reference

**Init Functions:** `autoTrackInit`, `manualDepsInit`, `noTrackInit`

**Subscribe Functions:** `autoTrackSubscribe`, `manualDepsSubscribe`, `noTrackSubscribe`

**Snapshot Functions:** `autoTrackSnapshot`, `manualDepsSnapshot`, `noTrackSnapshot`

**Utilities:** [`disableGetterTracking`](#disablegettertracking), `ExternalDepsManager`, `DependencyManager`

**Types:** [`AdapterState`](#adapterstate), [`ManualDepsConfig`](#manualdepsconfig), [`SnapshotFunction`](#snapshotfunction), [`SubscribeFunction`](#subscribefunction)

## Overview

Three tracking modes are available:

| Mode           | Use Case                            | Re-renders                      |
| -------------- | ----------------------------------- | ------------------------------- |
| **autoTrack**  | Default, tracks accessed properties | Only when accessed props change |
| **manualDeps** | Explicit dependency array           | When deps array changes         |
| **noTrack**    | No optimization                     | Every state change              |

Each mode has three functions: `*Init`, `*Subscribe`, `*Snapshot` for use with `useSyncExternalStore` or similar patterns.

## Interfaces

### AdapterState

Internal state for framework adapters, holding tracking and caching data. @template TBloc - The state container type

```typescript
export interface AdapterState<TBloc extends StateContainerConstructor>
```

| Property          | Type                                           | Description                                           |
| ----------------- | ---------------------------------------------- | ----------------------------------------------------- |
| `dependencyState` | `DependencyState<ExtractState<TBloc>> \| null` | Dependency tracker for state property access tracking |
| `getterState`     | `GetterState \| null`                          | Getter state for computed property tracking           |
| `manualDepsCache` | `unknown[] \| null`                            | Cached manual dependencies for comparison             |
| `proxiedBloc`     | `InstanceState<TBloc> \| null`                 | Proxied bloc instance for auto-tracking               |

---

### ManualDepsConfig

Configuration for manual dependency tracking mode @template TBloc - The state container type

```typescript
export interface ManualDepsConfig<TBloc extends StateContainerConstructor>
```

| Property       | Type                                                                | Description                                                |
| -------------- | ------------------------------------------------------------------- | ---------------------------------------------------------- |
| `dependencies` | `(state: ExtractState<TBloc>, bloc: InstanceState<TBloc>) => any[]` | Function that returns dependency array from state and bloc |

---

## Functions

### disableGetterTracking

Disable getter tracking after render phase completes. Clears the active tracker to prevent tracking outside of render.

```typescript
export declare function disableGetterTracking<
  TBloc extends StateContainerConstructor,
>(adapterState: AdapterState<TBloc>, rawInstance: InstanceState<TBloc>): void;
```

| Parameter      | Type                   | Description           |
| -------------- | ---------------------- | --------------------- |
| `adapterState` | `AdapterState<TBloc>`  | The adapter state     |
| `rawInstance`  | `InstanceState<TBloc>` | The raw bloc instance |

---

## Types

### SnapshotFunction

Function that returns a snapshot of the current state @template TState - The state type

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
