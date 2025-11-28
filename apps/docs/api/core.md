---
outline: [2, 3]
---

# @blac/core

## Overview

**Classes:** [`Cubit`](#cubit), [`ExternalDependencyManager`](#externaldependencymanager), [`PluginManager`](#pluginmanager), [`StateContainer`](#statecontainer), [`StateContainerRegistry`](#statecontainerregistry), [`Vertex`](#vertex)

**Interfaces:** [`AdapterState`](#adapterstate), [`AuthState`](#authstate), [`BaseEvent`](#baseevent), [`BlacPlugin`](#blacplugin), [`BlacPluginWithInit`](#blacpluginwithinit), [`GetterTrackerState`](#gettertrackerstate), [`InstanceEntry`](#instanceentry), [`InstanceMetadata`](#instancemetadata), [`LogConfig`](#logconfig), [`LogEntry`](#logentry), [`ManualDepsConfig`](#manualdepsconfig), [`PathInfo`](#pathinfo), [`PluginConfig`](#pluginconfig), [`PluginContext`](#plugincontext), [`ProxyTrackerState`](#proxytrackerstate), [`StateContainerConfig`](#statecontainerconfig), [`SystemEventPayloads`](#systemeventpayloads), [`TodoState`](#todostate), [`TrackerState`](#trackerstate)

**Functions:** [`blac`](#blac), [`captureTrackedPaths`](#capturetrackedpaths), [`clearActiveTracker`](#clearactivetracker), [`clearExternalDependencies`](#clearexternaldependencies), [`commitTrackedGetters`](#committrackedgetters), [`configureLogger`](#configurelogger), [`createArrayProxy`](#createarrayproxy), [`createAutoTrackSnapshot`](#createautotracksnapshot), [`createAutoTrackSubscribe`](#createautotracksubscribe), [`createBlocProxy`](#createblocproxy), [`createGetterTracker`](#creategettertracker), [`createIdGenerator`](#createidgenerator), [`createLogger`](#createlogger), [`createManualDepsSnapshot`](#createmanualdepssnapshot), [`createManualDepsSubscribe`](#createmanualdepssubscribe), [`createNoTrackSnapshot`](#createnotracksnapshot), [`createNoTrackSubscribe`](#createnotracksubscribe), [`createPluginManager`](#createpluginmanager), [`createProxy`](#createproxy), [`createProxyForTarget`](#createproxyfortarget), [`createProxyInternal`](#createproxyinternal), [`createProxyTrackerState`](#createproxytrackerstate), [`createTrackerState`](#createtrackerstate), [`debug`](#debug), [`disableGetterTracking`](#disablegettertracking), [`error`](#error), [`generateId`](#generateid), [`generateIsolatedKey`](#generateisolatedkey), [`generateSimpleId`](#generatesimpleid), [`getActiveTracker`](#getactivetracker), [`getDescriptor`](#getdescriptor), [`getGetterExecutionContext`](#getgetterexecutioncontext), [`getPluginManager`](#getpluginmanager), [`getStaticProp`](#getstaticprop), [`getValueAtPath`](#getvalueatpath), [`hasChanges`](#haschanges), [`hasGetterChanges`](#hasgetterchanges), [`hasInitHook`](#hasinithook), [`hasTrackedData`](#hastrackeddata), [`info`](#info), [`initAutoTrackState`](#initautotrackstate), [`initManualDepsState`](#initmanualdepsstate), [`initNoTrackState`](#initnotrackstate), [`invalidateRenderCache`](#invalidaterendercache), [`isExcludedFromDevTools`](#isexcludedfromdevtools), [`isGetter`](#isgetter), [`isIsolatedClass`](#isisolatedclass), [`isIsolatedKey`](#isisolatedkey), [`isKeepAliveClass`](#iskeepaliveclass), [`isProxyable`](#isproxyable), [`parsePath`](#parsepath), [`resetGetterTracker`](#resetgettertracker), [`setActiveTracker`](#setactivetracker), [`shallowEqual`](#shallowequal), [`startProxyTracking`](#startproxytracking), [`startTracking`](#starttracking), [`stopProxyTracking`](#stopproxytracking), [`warn`](#warn)

**Types:** `BlacOptions`, `BlocConstructor`, `Brand`, `BrandedId`, `EventConstructor`, `EventHandler`, `ExtractConstructorArgs`, `ExtractProps`, `ExtractState`, `InstanceId`, ...

## Classes

### Cubit

> **Abstract class**

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
| `patch` | `S extends object ? (partial: Partial<S>) => void : never` |  |

**Methods:**

#### `emit`

```typescript
emit(newState: S): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `newState` | `S` |  |

#### `update`

```typescript
update(updater: (current: S) => S): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `updater` | `(current: S) => S` |  |

---

### ExternalDependencyManager

```typescript
export declare class ExternalDependencyManager
```

**Methods:**

#### `cleanup`

```typescript
cleanup(): void;
```

#### `updateSubscriptions`

```typescript
updateSubscriptions(getterTracker: GetterTrackerState | null, rawInstance: StateContainer<any, any>, onGetterChange: () => void): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `getterTracker` | `GetterTrackerState \| null` |  |
| `rawInstance` | `StateContainer<any, any>` |  |
| `onGetterChange` | `() => void` |  |

---

### PluginManager

```typescript
export declare class PluginManager
```

**Constructor:**

```typescript
constructor(registry: StateContainerRegistry);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `registry` | `StateContainerRegistry` |  |

**Methods:**

#### `clear`

```typescript
clear(): void;
```

#### `getAllPlugins`

```typescript
getAllPlugins(): BlacPlugin[];
```

#### `getPlugin`

```typescript
getPlugin(pluginName: string): BlacPlugin | undefined;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pluginName` | `string` |  |

#### `hasPlugin`

```typescript
hasPlugin(pluginName: string): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pluginName` | `string` |  |

#### `install`

```typescript
install(plugin: BlacPlugin, config?: PluginConfig): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `plugin` | `BlacPlugin` |  |
| `config` | `PluginConfig` |  |

#### `uninstall`

```typescript
uninstall(pluginName: string): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pluginName` | `string` |  |

---

### StateContainer

> **Abstract class**

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
| `__excludeFromDevTools` *(static)*  | `boolean` |  |
| `_registry` *(static)*  | `StateContainerRegistry` |  |
| `createdAt` | `number` |  |
| `debug` | `boolean` |  |
| `enableStackTrace` *(static)*  | `boolean` |  |
| `instanceId` | `string` |  |
| `isDisposed` *(readonly)*  | `boolean` |  |
| `lastUpdateTimestamp` | `number` |  |
| `name` | `string` |  |
| `onSystemEvent` | `<E extends SystemEvent>(event: E, handler: SystemEventHandler<S, P, E>) => (() => void)` |  |
| `props` *(readonly)*  | `P \| undefined` |  |
| `state` *(readonly)*  | `S` |  |

**Methods:**

#### `clear` *(static)*

```typescript
static clear<T extends StateContainer<any>>(this: new (...args: any[]) => T): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |

#### `clearAllInstances` *(static)*

```typescript
static clearAllInstances(): void;
```

#### `connect` *(static)*

```typescript
static connect<T extends StateContainer<any>>(this: new (...args: any[]) => T, instanceKey?: string, constructorArgs?: any): T;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |
| `instanceKey` | `string` |  |
| `constructorArgs` | `any` |  |

#### `dispose`

```typescript
dispose(): void;
```

#### `emit` *(protected)*

```typescript
protected emit(newState: S): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `newState` | `S` |  |

#### `forEach` *(static)*

```typescript
static forEach<T extends StateContainer<any>>(this: new (...args: any[]) => T, callback: (instance: T) => void): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |
| `callback` | `(instance: T) => void` |  |

#### `get` *(static)*

```typescript
static get<T extends StateContainer<any>>(this: new (...args: any[]) => T, instanceKey?: string): T;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |
| `instanceKey` | `string` |  |

#### `getAll` *(static)*

```typescript
static getAll<T extends StateContainer<any>>(this: new (...args: any[]) => T): T[];
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |

#### `getRefCount` *(static)*

```typescript
static getRefCount<T extends StateContainer<any>>(this: new (...args: any[]) => T, instanceKey?: string): number;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |
| `instanceKey` | `string` |  |

#### `getRegistry` *(static)*

```typescript
static getRegistry(): StateContainerRegistry;
```

#### `getSafe` *(static)*

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
| `instanceKey` | `string` |  |

#### `getStats` *(static)*

```typescript
static getStats(): {
        registeredTypes: number;
        totalInstances: number;
        typeBreakdown: Record<string, number>;
    };
```

#### `hasInstance` *(static)*

```typescript
static hasInstance<T extends StateContainer<any>>(this: new (...args: any[]) => T, instanceKey?: string): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |
| `instanceKey` | `string` |  |

#### `initConfig`

```typescript
initConfig(config: StateContainerConfig): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `StateContainerConfig` |  |

#### `register` *(static)*

```typescript
static register<T extends StateContainer<any>>(this: new (...args: any[]) => T, isolated?: boolean): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |
| `isolated` | `boolean` |  |

#### `release` *(static)*

```typescript
static release<T extends StateContainer<any>>(this: new (...args: any[]) => T, instanceKey?: string, forceDispose?: boolean): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |
| `instanceKey` | `string` |  |
| `forceDispose` | `boolean` |  |

#### `resolve` *(static)*

```typescript
static resolve<T extends StateContainer<any>>(this: new (...args: any[]) => T, instanceKey?: string, constructorArgs?: any): T;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `this` | `new (...args: any[]) => T` |  |
| `instanceKey` | `string` |  |
| `constructorArgs` | `any` |  |

#### `setRegistry` *(static)*

```typescript
static setRegistry(registry: StateContainerRegistry): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `registry` | `StateContainerRegistry` |  |

#### `subscribe`

```typescript
subscribe(listener: StateListener<S>): () => void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `listener` | `StateListener<S>` |  |

#### `update` *(protected)*

```typescript
protected update(updater: (current: S) => S): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `updater` | `(current: S) => S` |  |

#### `updateProps`

```typescript
updateProps(newProps: P): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `newProps` | `P` |  |

---

### StateContainerRegistry

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

```typescript
register<T extends StateContainer<any>>(constructor: new (...args: any[]) => T, isolated?: boolean): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `constructor` | `new (...args: any[]) => T` |  |
| `isolated` | `boolean` |  |

#### `registerType`

```typescript
registerType<T extends StateContainer<any>>(constructor: new (...args: any[]) => T): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `constructor` | `new (...args: any[]) => T` |  |

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

---

### Vertex

> **Abstract class**

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
| `add` | `(event: E) => void` |  |
| `on` | `<T extends E>(EventClass: EventConstructor<T>, handler: EventHandler<T, S>) => void` |  |

**Methods:**

#### `onEventError` *(protected)*

```typescript
protected onEventError(_event: E, _error: Error): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `_event` | `E` |  |
| `_error` | `Error` |  |

---

## Interfaces

### AdapterState

```typescript
export interface AdapterState<TBloc extends StateContainer<any, any>>
```

| Property | Type | Description |
|----------|------|-------------|
| `getterTracker` | `GetterTrackerState \| null` |  |
| `manualDepsCache` | `unknown[] \| null` |  |
| `proxiedBloc` | `TBloc \| null` |  |
| `tracker` | `TrackerState<ExtractState<TBloc>> \| null` |  |

---

### AuthState

Auth State and Events for testing async handlers

```typescript
export interface AuthState
```

| Property | Type | Description |
|----------|------|-------------|
| `error` | `string \| null` |  |
| `isAuthenticated` | `boolean` |  |
| `isLoading` | `boolean` |  |
| `user` | `string` |  |

---

### BaseEvent

Base event interface Used by Vertex for event-driven state management

```typescript
export interface BaseEvent
```

| Property | Type | Description |
|----------|------|-------------|
| `source` *(optional)* | `string` |  |
| `timestamp` | `number` |  |
| `type` | `string` |  |

---

### BlacPlugin

```typescript
export interface BlacPlugin
```

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` |  |
| `version` | `string` |  |

**Methods:**

#### `onEventAdded`

```typescript
onEventAdded?<E extends BaseEvent>(vertex: Vertex<any, E>, event: E, context: PluginContext): void;
```

#### `onInstall`

```typescript
onInstall?(context: PluginContext): void;
```

#### `onInstanceCreated`

```typescript
onInstanceCreated?(instance: StateContainer<any>, context: PluginContext): void;
```

#### `onInstanceDisposed`

```typescript
onInstanceDisposed?(instance: StateContainer<any>, context: PluginContext): void;
```

#### `onStateChanged`

```typescript
onStateChanged?<S>(instance: StateContainer<S>, previousState: S, currentState: S, callstack: string | undefined, context: PluginContext): void;
```

#### `onUninstall`

```typescript
onUninstall?(): void;
```

---

### BlacPluginWithInit

```typescript
export interface BlacPluginWithInit extends BlacPlugin
```

**Methods:**

#### `onInstall`

```typescript
onInstall(context: PluginContext): void;
```

---

### GetterTrackerState

```typescript
export interface GetterTrackerState
```

| Property | Type | Description |
|----------|------|-------------|
| `cacheValid` | `boolean` |  |
| `currentlyAccessing` | `Set<string \| symbol>` |  |
| `externalDependencies` | `Set<StateContainer<any>>` |  |
| `isTracking` | `boolean` |  |
| `renderCache` | `Map<string \| symbol, unknown>` |  |
| `trackedGetters` | `Set<string \| symbol>` |  |
| `trackedValues` | `Map<string \| symbol, unknown>` |  |

---

### InstanceEntry

```typescript
export interface InstanceEntry<T = any>
```

| Property | Type | Description |
|----------|------|-------------|
| `instance` | `T` |  |
| `refCount` | `number` |  |

---

### InstanceMetadata

```typescript
export interface InstanceMetadata
```

| Property | Type | Description |
|----------|------|-------------|
| `callstack` *(optional)* | `string` |  |
| `className` | `string` |  |
| `createdAt` | `number` |  |
| `currentState` *(optional)* | `any` |  |
| `id` | `string` |  |
| `isDisposed` | `boolean` |  |
| `isIsolated` | `boolean` |  |
| `lastStateChangeTimestamp` | `number` |  |
| `name` | `string` |  |
| `previousState` *(optional)* | `any` |  |
| `state` | `any` |  |

---

### LogConfig

```typescript
export interface LogConfig
```

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` |  |
| `level` | `LogLevel` |  |
| `output` | `(entry: LogEntry) => void` |  |

---

### LogEntry

```typescript
export interface LogEntry
```

| Property | Type | Description |
|----------|------|-------------|
| `context` | `string` |  |
| `data` *(optional)* | `any` |  |
| `level` | `string` |  |
| `message` | `string` |  |
| `timestamp` | `number` |  |

---

### ManualDepsConfig

```typescript
export interface ManualDepsConfig<TBloc extends StateContainer<any, any>>
```

| Property | Type | Description |
|----------|------|-------------|
| `dependencies` | `(state: any, bloc: TBloc) => unknown[]` |  |

---

### PathInfo

```typescript
export interface PathInfo
```

| Property | Type | Description |
|----------|------|-------------|
| `segments` | `string[]` |  |
| `value` | `any` |  |

---

### PluginConfig

```typescript
export interface PluginConfig
```

| Property | Type | Description |
|----------|------|-------------|
| `enabled` *(optional)* | `boolean` |  |
| `environment` *(optional)* | `'development' \| 'production' \| 'test' \| 'all'` |  |

---

### PluginContext

```typescript
export interface PluginContext
```

**Methods:**

#### `getAllTypes`

```typescript
getAllTypes(): Array<new (...args: any[]) => StateContainer<any>>;
```

#### `getInstanceMetadata`

```typescript
getInstanceMetadata(instance: StateContainer<any>): InstanceMetadata;
```

#### `getState`

```typescript
getState<S>(instance: StateContainer<S>): S;
```

#### `getStats`

```typescript
getStats(): {
        registeredTypes: number;
        totalInstances: number;
        typeBreakdown: Record<string, number>;
    };
```

#### `queryInstances`

```typescript
queryInstances<T extends StateContainer<any>>(typeClass: new (...args: any[]) => T): T[];
```

---

### ProxyTrackerState

State container for proxy tracking

```typescript
export interface ProxyTrackerState<T>
```

| Property | Type | Description |
|----------|------|-------------|
| `boundFunctionsCache` | `WeakMap<Function, Function> \| null` | Cache of bound functions to maintain referential equality |
| `isTracking` | `boolean` | Whether tracking is currently active |
| `lastProxiedState` | `T \| null` | Last state object that was proxied (for cache invalidation) |
| `lastProxy` | `T \| null` | Last proxy created (for cache reuse) |
| `maxDepth` | `number` | Maximum depth for nested proxy creation |
| `proxyCache` | `WeakMap<object, any>` | Cache of created proxies to avoid duplicates |
| `trackedPaths` | `Set<string>` | Set of all tracked property paths |

---

### StateContainerConfig

```typescript
export interface StateContainerConfig
```

| Property | Type | Description |
|----------|------|-------------|
| `debug` *(optional)* | `boolean` |  |
| `instanceId` *(optional)* | `string` |  |
| `name` *(optional)* | `string` |  |

---

### SystemEventPayloads

```typescript
export interface SystemEventPayloads<S, P>
```

| Property | Type | Description |
|----------|------|-------------|
| `dispose` | `void` |  |
| `propsUpdated` | `P` |  |
| `stateChanged` | `S` |  |

---

### TodoState

```typescript
export interface TodoState
```

| Property | Type | Description |
|----------|------|-------------|
| `filter` | `'all' \| 'active' \| 'completed'` |  |
| `isLoading` | `boolean` |  |
| `todos` | `string` |  |

---

### TrackerState

```typescript
export interface TrackerState<T>
```

| Property | Type | Description |
|----------|------|-------------|
| `currentRenderPaths` | `Set<string>` |  |
| `lastCheckedState` | `T \| null` |  |
| `lastCheckedValues` | `Map<string, any>` |  |
| `pathCache` | `Map<string, PathInfo>` |  |
| `previousRenderPaths` | `Set<string>` |  |
| `proxyTrackerState` | `ProxyTrackerState<T>` |  |

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

```typescript
Decorator syntax (requires experimentalDecorators or TC39 decorators)
```typescript
```

```typescript
Function syntax (no decorator support needed)
```typescript
const FormBloc = blac({ isolated: true })(
  class extends Cubit<FormState> {}
);
```
```

---

### captureTrackedPaths

```typescript
export declare function captureTrackedPaths<T>(tracker: TrackerState<T>, state: T): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `tracker` | `TrackerState<T>` |  |
| `state` | `T` |  |

---

### clearActiveTracker

```typescript
export declare function clearActiveTracker<TBloc extends StateContainer<any>>(bloc: TBloc): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `bloc` | `TBloc` |  |

---

### clearExternalDependencies

```typescript
export declare function clearExternalDependencies(tracker: GetterTrackerState): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `tracker` | `GetterTrackerState` |  |

---

### commitTrackedGetters

```typescript
export declare function commitTrackedGetters(tracker: GetterTrackerState): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `tracker` | `GetterTrackerState` |  |

---

### configureLogger

Configuration function that recreates the default logger

```typescript
export declare function configureLogger(opts: Partial<LogConfig>): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `opts` | `Partial<LogConfig>` | Partial logger configuration |

**Examples:**

```typescript
```ts
configureLogger({ enabled: true, level: LogLevel.DEBUG });
```
```

---

### createArrayProxy

Create a proxy for an array with property access tracking

Tracks: - Array element access (arr[0]) - Length access (arr.length) - Array method calls (arr.map, arr.filter, etc.)

```typescript
export declare function createArrayProxy<T, U>(state: ProxyTrackerState<T>, target: U[], path: string, depth?: number): U[];
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | `ProxyTrackerState<T>` |  |
| `target` | `U[]` |  |
| `path` | `string` |  |
| `depth` | `number` |  |

---

### createAutoTrackSnapshot

```typescript
export declare function createAutoTrackSnapshot<TBloc extends StateContainer<any, any>>(instance: TBloc, adapterState: AdapterState<TBloc>): SnapshotFunction<ExtractState<TBloc>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `TBloc` |  |
| `adapterState` | `AdapterState<TBloc>` |  |

---

### createAutoTrackSubscribe

```typescript
export declare function createAutoTrackSubscribe<TBloc extends StateContainer<any, any>>(instance: TBloc, adapterState: AdapterState<TBloc>): SubscribeFunction;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `TBloc` |  |
| `adapterState` | `AdapterState<TBloc>` |  |

---

### createBlocProxy

```typescript
export declare function createBlocProxy<TBloc extends StateContainer<any>>(bloc: TBloc): TBloc;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `bloc` | `TBloc` |  |

---

### createGetterTracker

```typescript
export declare function createGetterTracker(): GetterTrackerState;
```

---

### createIdGenerator

Creates an ID generator with isolated counter state

```typescript
export declare function createIdGenerator(prefix: string): {
    next: () => string;
    nextSimple: () => string;
    reset: () => void;
};
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `prefix` | `string` | Prefix for generated IDs |

**Returns:** Object with next(), nextSimple(), and reset() methods

**Examples:**

```typescript
```ts
const generator = createIdGenerator('sub');
const id1 = generator.next(); // "sub:1698765432100_1_a3k9d7f2q"
const id2 = generator.next(); // "sub:1698765432101_2_b4n8e9g3r"
```
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

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `LogConfig` | Logger configuration |

**Returns:** Logger instance with debug, info, warn, error, and configure methods

**Examples:**

```typescript
```ts
const logger = createLogger({
  enabled: true,
  level: LogLevel.DEBUG,
  output: (entry) => console.log(JSON.stringify(entry))
});
logger.debug('MyComponent', 'Rendering', { props: { foo: 'bar' } });
```
```

---

### createManualDepsSnapshot

```typescript
export declare function createManualDepsSnapshot<TBloc extends StateContainer<any, any>>(instance: TBloc, adapterState: AdapterState<TBloc>, config: ManualDepsConfig<TBloc>): SnapshotFunction<ExtractState<TBloc>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `TBloc` |  |
| `adapterState` | `AdapterState<TBloc>` |  |
| `config` | `ManualDepsConfig<TBloc>` |  |

---

### createManualDepsSubscribe

```typescript
export declare function createManualDepsSubscribe<TBloc extends StateContainer<any, any>>(instance: TBloc, adapterState: AdapterState<TBloc>, config: ManualDepsConfig<TBloc>): SubscribeFunction;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `TBloc` |  |
| `adapterState` | `AdapterState<TBloc>` |  |
| `config` | `ManualDepsConfig<TBloc>` |  |

---

### createNoTrackSnapshot

```typescript
export declare function createNoTrackSnapshot<TBloc extends StateContainer<any, any>>(instance: TBloc): SnapshotFunction<ExtractState<TBloc>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `TBloc` |  |

---

### createNoTrackSubscribe

```typescript
export declare function createNoTrackSubscribe<TBloc extends StateContainer<any, any>>(instance: TBloc): SubscribeFunction;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `TBloc` |  |

---

### createPluginManager

Create a plugin manager instance

```typescript
export declare function createPluginManager(registry: StateContainerRegistry): PluginManager;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `registry` | `StateContainerRegistry` |  |

---

### createProxy

```typescript
export declare function createProxy<T>(tracker: TrackerState<T>, state: T): T;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `tracker` | `TrackerState<T>` |  |
| `state` | `T` |  |

---

### createProxyForTarget

Create a proxy for a target with caching

If the target hasn't changed since the last call, returns the cached proxy. Otherwise, creates a new proxy and caches it.

This is the main entry point for creating tracked proxies.

```typescript
export declare function createProxyForTarget<T>(state: ProxyTrackerState<T>, target: T): T;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | `ProxyTrackerState<T>` |  |
| `target` | `T` |  |

---

### createProxyInternal

Create a proxy for an object with property access tracking

This is the core proxy creation function that recursively creates proxies for nested objects and arrays.

Tracks: - Property access (obj.prop) - Nested property access (obj.nested.prop) - 'in' operator usage ('prop' in obj) - Object.keys, Object.entries, etc.

```typescript
export declare function createProxyInternal<T>(state: ProxyTrackerState<T>, target: T, path?: string, depth?: number): T;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | `ProxyTrackerState<T>` |  |
| `target` | `T` |  |
| `path` | `string` |  |
| `depth` | `number` |  |

---

### createProxyTrackerState

Create a new proxy tracker state

```typescript
export declare function createProxyTrackerState<T>(): ProxyTrackerState<T>;
```

**Examples:**

```typescript
const state = createProxyTrackerState<MyState>(); startProxyTracking(state); const proxy = createProxyForTarget(state, myObject); // ... use proxy ... const paths = stopProxyTracking(state);
```

---

### createTrackerState

```typescript
export declare function createTrackerState<T>(): TrackerState<T>;
```

---

### debug

```typescript
debug: (context: string, message: string, data?: any) => void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `context` | `string` |  |
| `message` | `string` |  |
| `data` | `any` |  |

---

### disableGetterTracking

```typescript
export declare function disableGetterTracking<TBloc extends StateContainer<any, any>>(adapterState: AdapterState<TBloc>, rawInstance: TBloc): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `adapterState` | `AdapterState<TBloc>` |  |
| `rawInstance` | `TBloc` |  |

---

### error

```typescript
error: (context: string, message: string, data?: any) => void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `context` | `string` |  |
| `message` | `string` |  |
| `data` | `any` |  |

---

### generateId

Generate ID with timestamp, counter, and random suffix (tree-shakeable)

Format: `${prefix}:${timestamp}_${counter}_${random}`

```typescript
export declare function generateId(prefix: string): string;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `prefix` | `string` | Prefix for the ID (e.g., 'sub', 'consumer', 'stage') |

**Returns:** Branded ID string

**Examples:**

```typescript
```ts
const id = generateId('sub');
// Returns: "sub:1698765432100_1_a3k9d7f2q"
```
```

---

### generateIsolatedKey

Generate a unique isolated instance key Uses base36 encoding for compact, URL-safe identifiers

Format: "isolated-{9-char-random-string}" Example: "isolated-k7x2m9p4q"

```typescript
export declare function generateIsolatedKey(): string;
```

**Returns:** A unique isolated instance key

---

### generateSimpleId

Generate simple ID with timestamp and random (no counter tracking)

Format: `${prefix}:${timestamp}_${random}`

```typescript
export declare function generateSimpleId(prefix: string, affix?: string): string;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `prefix` | `string` | Prefix for the ID |
| `affix` | `string` |  |

**Returns:** Branded ID string

**Examples:**

```typescript
```ts
const id = generateSimpleId('CounterBloc');
// Returns: "CounterBloc:1698765432100_a3k9d7f2q"
```
```

---

### getActiveTracker

```typescript
export declare function getActiveTracker<TBloc extends StateContainer<any>>(bloc: TBloc): GetterTrackerState | undefined;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `bloc` | `TBloc` |  |

---

### getDescriptor

```typescript
export declare function getDescriptor(obj: any, prop: string | symbol): PropertyDescriptor | undefined;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `obj` | `any` |  |
| `prop` | `string \| symbol` |  |

---

### getGetterExecutionContext

```typescript
export declare function getGetterExecutionContext(): GetterExecutionContext;
```

---

### getPluginManager

Get the global plugin manager

```typescript
export declare function getPluginManager(): any;
```

---

### getStaticProp

Get a static property from a class constructor Type-safe helper that avoids (Type as any) casts

```typescript
export declare function getStaticProp<T>(Type: new (...args: any[]) => any, propName: string, defaultValue?: T): T | undefined;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | `new (...args: any[]) => any` | The class constructor |
| `propName` | `string` | The property name to access |
| `defaultValue` | `T` | Optional default value if property is undefined |

**Returns:** The property value or default

---

### getValueAtPath

Get a value from an object using a path of segments

```typescript
export declare function getValueAtPath(obj: any, segments: string[]): any;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `obj` | `any` |  |
| `segments` | `string[]` |  |

**Examples:**

```typescript
const obj = { user: { name: 'Alice', age: 30 } } getValueAtPath(obj, ['user', 'name']) // 'Alice' getValueAtPath(obj, ['user', 'age']) // 30 getValueAtPath(obj, ['user', 'missing']) // undefined
```

---

### hasChanges

```typescript
export declare function hasChanges<T>(tracker: TrackerState<T>, state: T): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `tracker` | `TrackerState<T>` |  |
| `state` | `T` |  |

---

### hasGetterChanges

```typescript
export declare function hasGetterChanges<TBloc extends StateContainer<any>>(bloc: TBloc, tracker: GetterTrackerState | null): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `bloc` | `TBloc` |  |
| `tracker` | `GetterTrackerState \| null` |  |

---

### hasInitHook

```typescript
export declare function hasInitHook(plugin: BlacPlugin): plugin is BlacPluginWithInit;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `plugin` | `BlacPlugin` |  |

---

### hasTrackedData

```typescript
export declare function hasTrackedData<T>(tracker: TrackerState<T>): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `tracker` | `TrackerState<T>` |  |

---

### info

```typescript
info: (context: string, message: string, data?: any) => void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `context` | `string` |  |
| `message` | `string` |  |
| `data` | `any` |  |

---

### initAutoTrackState

```typescript
export declare function initAutoTrackState<TBloc extends StateContainer<any, any>>(instance: TBloc): AdapterState<TBloc>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `TBloc` |  |

---

### initManualDepsState

```typescript
export declare function initManualDepsState<TBloc extends StateContainer<any, any>>(instance: TBloc): AdapterState<TBloc>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `TBloc` |  |

---

### initNoTrackState

```typescript
export declare function initNoTrackState<TBloc extends StateContainer<any, any>>(instance: TBloc): AdapterState<TBloc>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `TBloc` |  |

---

### invalidateRenderCache

```typescript
export declare function invalidateRenderCache(tracker: GetterTrackerState): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `tracker` | `GetterTrackerState` |  |

---

### isExcludedFromDevTools

Check if a class should be excluded from DevTools Used to prevent infinite loops when DevTools tracks itself

```typescript
export declare function isExcludedFromDevTools(Type: new (...args: any[]) => any): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | `new (...args: any[]) => any` |  |

---

### isGetter

```typescript
export declare function isGetter(obj: any, prop: string | symbol): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `obj` | `any` |  |
| `prop` | `string \| symbol` |  |

---

### isIsolatedClass

Check if a class is marked as isolated Isolated classes create separate instances per component

```typescript
export declare function isIsolatedClass(Type: new (...args: any[]) => any): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | `new (...args: any[]) => any` |  |

---

### isIsolatedKey

Check if a key is an isolated instance key

```typescript
export declare function isIsolatedKey(key: string): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | The instance key to check |

**Returns:** true if the key is an isolated instance key

---

### isKeepAliveClass

Check if a class is marked as keepAlive KeepAlive classes are never auto-disposed when ref count reaches 0

```typescript
export declare function isKeepAliveClass(Type: new (...args: any[]) => any): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | `new (...args: any[]) => any` |  |

---

### isProxyable

Check if a value can be proxied

Returns true for plain objects and arrays only. Excludes built-in objects like Date, Map, Set, etc.

```typescript
export declare function isProxyable(value: unknown): value is object;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `value` | `unknown` |  |

---

### parsePath

Parse a property path string into an array of segments

Handles both dot notation (a.b.c) and bracket notation (a[0].b)

```typescript
export declare function parsePath(path: string): string[];
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | `string` |  |

**Examples:**

```typescript
parsePath('user.name') // ['user', 'name'] parsePath('items[0].name') // ['items', '0', 'name'] parsePath('data.users[2].address.city') // ['data', 'users', '2', 'address', 'city']
```

---

### resetGetterTracker

```typescript
export declare function resetGetterTracker(tracker: GetterTrackerState): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `tracker` | `GetterTrackerState` |  |

---

### setActiveTracker

```typescript
export declare function setActiveTracker<TBloc extends StateContainer<any>>(bloc: TBloc, tracker: GetterTrackerState): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `bloc` | `TBloc` |  |
| `tracker` | `GetterTrackerState` |  |

---

### shallowEqual

Shallow equality comparison for arrays

Compares two arrays element-by-element using Object.is

```typescript
export declare function shallowEqual(arr1: unknown[], arr2: unknown[]): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `arr1` | `unknown[]` |  |
| `arr2` | `unknown[]` |  |

**Examples:**

```typescript
shallowEqual([1, 2, 3], [1, 2, 3]) // true shallowEqual([1, 2, 3], [1, 2, 4]) // false shallowEqual([1, 2], [1, 2, 3]) // false
```

---

### startProxyTracking

Start tracking property accesses

Clears previous tracked paths and enables tracking mode.

```typescript
export declare function startProxyTracking<T>(state: ProxyTrackerState<T>): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | `ProxyTrackerState<T>` |  |

---

### startTracking

```typescript
export declare function startTracking<T>(tracker: TrackerState<T>): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `tracker` | `TrackerState<T>` |  |

---

### stopProxyTracking

Stop tracking and return the tracked paths

Returns a new Set containing all tracked paths.

```typescript
export declare function stopProxyTracking<T>(state: ProxyTrackerState<T>): Set<string>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | `ProxyTrackerState<T>` |  |

---

### warn

```typescript
warn: (context: string, message: string, data?: any) => void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `context` | `string` |  |
| `message` | `string` |  |
| `data` | `any` |  |

---

## Type Aliases

### BlacOptions

```typescript
export type BlacOptions = {
    isolated: true;
} | {
    keepAlive: true;
} | {
    excludeFromDevTools: true;
};
```

### BlocConstructor

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

### Brand

```typescript
export type Brand<T, B> = T & {
    [brand]: B;
};
```

### BrandedId

```typescript
export type BrandedId<B> = Brand<string, B>;
```

### EventConstructor

```typescript
export type EventConstructor<T extends BaseEvent = BaseEvent> = new (...args: never[]) => T;
```

### EventHandler

```typescript
export type EventHandler<E extends BaseEvent, S> = (event: E, emit: (state: S) => void) => void;
```

### ExtractConstructorArgs

```typescript
export type ExtractConstructorArgs<T> = T extends new (...args: infer P) => any ? P : never[];
```

### ExtractProps

```typescript
export type ExtractProps<T> = T extends StateContainer<any, infer P> ? P : undefined;
```

### ExtractState

```typescript
export type ExtractState<T> = T extends StateContainer<infer S, any> ? S : never;
```

### InstanceId

```typescript
export type InstanceId = Brand<string, 'InstanceId'>;
```

### LifecycleEvent

```typescript
export type LifecycleEvent = 'created' | 'stateChanged' | 'eventAdded' | 'disposed';
```

### LifecycleListener

```typescript
export type LifecycleListener<E extends LifecycleEvent> = E extends 'created' ? (container: StateContainer<any>) => void : E extends 'stateChanged' ? (container: StateContainer<any>, previousState: any, currentState: any, callstack?: string) => void : E extends 'eventAdded' ? (container: Vertex<any, any>, event: any) => void : E extends 'disposed' ? (container: StateContainer<any>) => void : never;
```

### SnapshotFunction

```typescript
export type SnapshotFunction<TState> = () => TState;
```

### SubscribeFunction

```typescript
export type SubscribeFunction = (callback: SubscriptionCallback) => () => void;
```

### SubscriptionCallback

```typescript
export type SubscriptionCallback = () => void;
```

### SystemEvent

```typescript
export type SystemEvent = 'propsUpdated' | 'stateChanged' | 'dispose';
```

## Constants

### BLAC_DEFAULTS

Default configuration constants for BlaC

```typescript
BLAC_DEFAULTS: {
    readonly DEFAULT_INSTANCE_KEY: "default";
    readonly MAX_GETTER_DEPTH: 10;
    readonly CLEANUP_INTERVAL_MS: 30000;
    readonly WEAKREF_CLEANUP_INTERVAL_MS: 10000;
    readonly MAX_SUBSCRIPTIONS: 1000;
    readonly MAX_SUBSCRIPTIONS_HIGH_PERF: 10000;
    readonly PIPELINE_TIMEOUT_MS: 5000;
    readonly CLEANUP_INTERVAL_HIGH_PERF_MS: 5000;
    readonly MAX_PIPELINE_STAGES: 30;
}
```

### BLAC_ERROR_PREFIX

Standard error message prefix

```typescript
BLAC_ERROR_PREFIX: "[BlaC]"
```

### BLAC_ID_PATTERNS

ID generation patterns and constants

```typescript
BLAC_ID_PATTERNS: {
    readonly ISOLATED_PREFIX: "isolated-";
    readonly ID_LENGTH: 9;
}
```

### BLAC_STATIC_PROPS

Static property names for StateContainer classes Used for feature flags and configuration on bloc classes

```typescript
BLAC_STATIC_PROPS: {
    readonly ISOLATED: "isolated";
    readonly KEEP_ALIVE: "keepAlive";
    readonly EXCLUDE_FROM_DEVTOOLS: "__excludeFromDevTools";
}
```

### globalRegistry

Global default registry instance

```typescript
globalRegistry: StateContainerRegistry
```

## Enums

### LogLevel

| Member | Value | Description |
|--------|-------|-------------|
| `DEBUG` | `3` |  |
| `ERROR` | `0` |  |
| `INFO` | `2` |  |
| `WARN` | `1` |  |

