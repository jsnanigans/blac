# Plugins

## BlacPlugin

```ts
interface BlacPlugin {
  readonly name: string;
  readonly version: string;

  onInstall?(context: PluginContext): void;
  onUninstall?(): void;
  onInstanceCreated?(
    instance: StateContainer<any>,
    context: PluginContext,
  ): void;
  onStateChanged?<S extends object = any>(
    instance: StateContainer<S>,
    previousState: S,
    currentState: S,
    callstack: string | undefined,
    context: PluginContext,
  ): void;
  onInstanceDisposed?(
    instance: StateContainer<any>,
    context: PluginContext,
  ): void;
}
```

## PluginContext

```ts
interface PluginContext {
  getInstanceMetadata(instance: StateContainer<any>): InstanceMetadata;
  getState<S extends object = any>(instance: StateContainer<S>): S;
  queryInstances<T extends StateContainer<any>>(
    typeClass: new (...args: any[]) => T,
  ): T[];
  getAllTypes(): Array<new (...args: any[]) => StateContainer<any>>;
  getStats(): {
    registeredTypes: number;
    totalInstances: number;
    typeBreakdown: Record<string, number>;
  };
}
```

## InstanceMetadata

```ts
interface InstanceMetadata {
  id: string;
  className: string;
  isDisposed: boolean;
  name: string;
  lastStateChangeTimestamp: number;
  state: any;
  createdAt: number;
  isIsolated: boolean;
  callstack?: string;
  previousState?: any;
  currentState?: any;
}
```

## PluginConfig

```ts
interface PluginConfig {
  enabled?: boolean;
  environment?: 'development' | 'production' | 'test' | 'all';
}
```

## Installation

```ts
import { getPluginManager } from '@blac/core';

getPluginManager().install(plugin, {
  enabled: true,
  environment: 'development',
});
```
