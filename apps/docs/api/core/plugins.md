---
outline: [2, 3]
---

# Plugins

Plugin system for extending BlaC

<small>[← Back to @blac/core](./index.md)</small>

## Quick Reference

**Class:** [`PluginManager`](#pluginmanager)

**Interfaces:** [`BlacPlugin`](#blacplugin), [`BlacPluginWithInit`](#blacpluginwithinit), [`PluginConfig`](#pluginconfig), [`PluginContext`](#plugincontext)

**Function:** [`getPluginManager`](#getpluginmanager)

## Classes

### PluginManager

Manages plugin lifecycle for the BlaC state management system. Plugins receive notifications about state container lifecycle events.

```typescript
export declare class PluginManager
```

**Constructor:**

```typescript
constructor(registry: StateContainerRegistry);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `registry` | `StateContainerRegistry` | The StateContainerRegistry to monitor for lifecycle events |

**Methods:**

#### `clear`

Uninstall all plugins

```typescript
clear(): void;
```

#### `getAllPlugins`

Get all installed plugins

```typescript
getAllPlugins(): BlacPlugin[];
```

**Returns:** Array of all installed plugins

#### `getPlugin`

Get an installed plugin by name

```typescript
getPlugin(pluginName: string): BlacPlugin | undefined;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pluginName` | `string` | The name of the plugin to retrieve |

**Returns:** The plugin instance or undefined if not found

#### `hasPlugin`

Check if a plugin is installed

```typescript
hasPlugin(pluginName: string): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pluginName` | `string` | The name of the plugin to check |

**Returns:** true if the plugin is installed

#### `install`

Install a plugin with optional configuration

```typescript
install(plugin: BlacPlugin, config?: PluginConfig): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `plugin` | `BlacPlugin` | The plugin to install |
| `config` | `PluginConfig` | Optional plugin configuration |

#### `uninstall`

Uninstall a plugin by name

```typescript
uninstall(pluginName: string): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pluginName` | `string` | The name of the plugin to uninstall |

**Examples:**


```ts
const manager = createPluginManager(registry);
manager.install(myPlugin, { environment: 'development' });
```

---

## Interfaces

### BlacPlugin

Interface for plugins that extend BlaC functionality

```typescript
export interface BlacPlugin
```

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Unique plugin identifier |
| `version` | `string` | Plugin version identifier |

**Methods:**

#### `onInstall`

Called when the plugin is installed (optional)

```typescript
onInstall?(context: PluginContext): void;
```

#### `onInstanceCreated`

Called when a state container instance is created

```typescript
onInstanceCreated?(instance: StateContainer<any>, context: PluginContext): void;
```

#### `onInstanceDisposed`

Called when a state container instance is disposed

```typescript
onInstanceDisposed?(instance: StateContainer<any>, context: PluginContext): void;
```

#### `onStateChanged`

Called when state changes in a container instance

```typescript
onStateChanged?<S extends object = any>(instance: StateContainer<S>, previousState: S, currentState: S, callstack: string | undefined, context: PluginContext): void;
```

#### `onUninstall`

Called when the plugin is uninstalled

```typescript
onUninstall?(): void;
```

---

### BlacPluginWithInit

Plugin interface variant that requires mandatory onInstall hook

```typescript
export interface BlacPluginWithInit extends BlacPlugin
```

**Methods:**

#### `onInstall`

Required initialization hook called when plugin is installed

```typescript
onInstall(context: PluginContext): void;
```

---

### PluginConfig

Configuration options for plugin installation

```typescript
export interface PluginConfig
```

| Property | Type | Description |
|----------|------|-------------|
| `enabled` *(optional)* | `boolean` | Enable or disable the plugin |
| `environment` *(optional)* | `'development' \| 'production' \| 'test' \| 'all'` | Environments where plugin runs |

---

### PluginContext

Safe context API provided to plugins for accessing registry data

```typescript
export interface PluginContext
```

**Methods:**

#### `getAllTypes`

Get all registered state container types

```typescript
getAllTypes(): Array<new (...args: any[]) => StateContainer<any>>;
```

#### `getInstanceMetadata`

Get metadata for a specific instance

```typescript
getInstanceMetadata(instance: StateContainer<any>): InstanceMetadata;
```

#### `getState`

Get current state from a container

```typescript
getState<S extends object = any>(instance: StateContainer<S>): S;
```

#### `getStats`

Get registry statistics

```typescript
getStats(): {
        registeredTypes: number;
        totalInstances: number;
        typeBreakdown: Record<string, number>;
    };
```

#### `queryInstances`

Get all instances of a specific type

```typescript
queryInstances<T extends StateContainer<any>>(typeClass: new (...args: any[]) => T): T[];
```

---

## Functions

### getPluginManager

Get the global plugin manager

```typescript
export declare function getPluginManager(): any;
```

---

