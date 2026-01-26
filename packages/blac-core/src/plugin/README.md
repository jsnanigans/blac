# BlaC Plugin System

A safe and powerful plugin API for extending BlaC state management.

## Overview

The BlaC plugin system allows you to observe and interact with StateContainer instances without coupling to the core implementation. Plugins receive lifecycle events and have access to instance metadata, state, and queries through a safe context API.

## Creating a Plugin

### Basic Plugin

```typescript
import { BlacPlugin, PluginContext } from '@blac/core';

export class MyPlugin implements BlacPlugin {
  readonly name = 'MyPlugin';
  readonly version = '1.0.0';

  onInstall(context: PluginContext): void {
    console.log('Plugin installed');

    // Query all existing instances
    const stats = context.getStats();
    console.log(`Found ${stats.totalInstances} instances`);
  }

  onInstanceCreated(instance: any, context: PluginContext): void {
    const metadata = context.getInstanceMetadata(instance);
    const state = context.getState(instance);

    console.log(`Created: ${metadata.className}`);
    console.log(`State:`, state);
  }

  onStateChanged(
    instance: any,
    prev: any,
    current: any,
    context: PluginContext,
  ): void {
    console.log('State changed');
  }

  onInstanceDisposed(instance: any, context: PluginContext): void {
    console.log('Instance disposed');
  }

  onUninstall(): void {
    console.log('Plugin uninstalled');
  }
}
```

### Installing a Plugin

```typescript
import { getPluginManager } from '@blac/core';
import { MyPlugin } from './MyPlugin';

// Get the global plugin manager
const pluginManager = getPluginManager();

// Install plugin
pluginManager.install(new MyPlugin(), {
  enabled: true,
  environment: 'development', // or 'production', 'test', 'all'
});
```

## Plugin API Reference

### Plugin Interface

```typescript
interface BlacPlugin {
  // Required
  readonly name: string;
  readonly version: string;

  // Optional lifecycle hooks
  onInstall?(context: PluginContext): void;
  onUninstall?(): void;
  onInstanceCreated?(
    instance: StateContainer<any>,
    context: PluginContext,
  ): void;
  onStateChanged?<S>(
    instance: StateContainer<S>,
    previousState: S,
    currentState: S,
    context: PluginContext,
  ): void;
  onInstanceDisposed?(
    instance: StateContainer<any>,
    context: PluginContext,
  ): void;
}
```

### Plugin Context

The `PluginContext` provides safe access to BlaC internals:

```typescript
interface PluginContext {
  // Get metadata for an instance
  getInstanceMetadata(instance: StateContainer<any>): InstanceMetadata;

  // Get current state of an instance
  getState<S>(instance: StateContainer<S>): S;

  // Query all instances of a specific type
  queryInstances<T extends StateContainer<any>>(
    typeClass: new (...args: any[]) => T,
  ): T[];

  // Query all registered types
  getAllTypes(): Array<new (...args: any[]) => StateContainer<any>>;

  // Get registry statistics
  getStats(): {
    registeredTypes: number;
    totalInstances: number;
    typeBreakdown: Record<string, number>;
  };
}
```

### Instance Metadata

```typescript
interface InstanceMetadata {
  id: string; // Unique instance ID
  className: string; // Class name (e.g., 'CounterCubit')
  instanceKey: string; // Instance key for shared instances
  refCount: number; // Reference count (0 for isolated)
  isDisposed: boolean; // Whether instance is disposed
  name: string; // Custom name if provided
}
```

## Plugin Configuration

```typescript
interface PluginConfig {
  enabled?: boolean; // Enable/disable the plugin
  environment?: 'development' | 'production' | 'test' | 'all';
}
```

## Example Plugins

### Logging Plugin

```typescript
import { BlacPlugin, PluginContext } from '@blac/core';

export class LoggingPlugin implements BlacPlugin {
  readonly name = 'LoggingPlugin';
  readonly version = '1.0.0';

  private logLevel: 'info' | 'debug';

  constructor(logLevel: 'info' | 'debug' = 'info') {
    this.logLevel = logLevel;
  }

  onInstanceCreated(instance: any, context: PluginContext): void {
    const metadata = context.getInstanceMetadata(instance);
    console.log(`[BlaC] Created ${metadata.className}#${metadata.instanceKey}`);

    if (this.logLevel === 'debug') {
      console.log('Initial state:', context.getState(instance));
    }
  }

  onStateChanged(
    instance: any,
    prev: any,
    current: any,
    context: PluginContext,
  ): void {
    const metadata = context.getInstanceMetadata(instance);
    console.log(
      `[BlaC] State changed in ${metadata.className}#${metadata.instanceKey}`,
    );

    if (this.logLevel === 'debug') {
      console.log('Previous:', prev);
      console.log('Current:', current);
    }
  }
}

// Usage
pluginManager.install(new LoggingPlugin('debug'), {
  environment: 'development',
});
```

### Analytics Plugin

```typescript
import { BlacPlugin, PluginContext } from '@blac/core';

export class AnalyticsPlugin implements BlacPlugin {
  readonly name = 'AnalyticsPlugin';
  readonly version = '1.0.0';

  private analytics: AnalyticsService;

  constructor(analytics: AnalyticsService) {
    this.analytics = analytics;
  }

  onInstanceCreated(instance: any, context: PluginContext): void {
    const metadata = context.getInstanceMetadata(instance);
    this.analytics.track('bloc_created', {
      className: metadata.className,
      instanceKey: metadata.instanceKey,
    });
  }

  onInstanceDisposed(instance: any, context: PluginContext): void {
    const metadata = context.getInstanceMetadata(instance);
    this.analytics.track('bloc_disposed', {
      className: metadata.className,
      instanceKey: metadata.instanceKey,
    });
  }
}
```

### State Persistence Plugin

```typescript
import { BlacPlugin, PluginContext } from '@blac/core';

export class PersistencePlugin implements BlacPlugin {
  readonly name = 'PersistencePlugin';
  readonly version = '1.0.0';

  private storage: Storage;
  private persistedTypes: Set<string>;

  constructor(storage: Storage, persistedTypes: string[]) {
    this.storage = storage;
    this.persistedTypes = new Set(persistedTypes);
  }

  onInstall(context: PluginContext): void {
    // Restore persisted states
    const types = context.getAllTypes();

    for (const TypeClass of types) {
      if (this.persistedTypes.has(TypeClass.name)) {
        this.restoreState(TypeClass, context);
      }
    }
  }

  onStateChanged(
    instance: any,
    prev: any,
    current: any,
    context: PluginContext,
  ): void {
    const metadata = context.getInstanceMetadata(instance);

    if (this.persistedTypes.has(metadata.className)) {
      this.saveState(metadata, current);
    }
  }

  private restoreState(TypeClass: any, context: PluginContext): void {
    const key = `blac_${TypeClass.name}`;
    const savedState = this.storage.getItem(key);

    if (savedState) {
      // Implementation depends on your needs
      console.log(`Restored state for ${TypeClass.name}`);
    }
  }

  private saveState(metadata: any, state: any): void {
    const key = `blac_${metadata.className}_${metadata.instanceKey}`;
    this.storage.setItem(key, JSON.stringify(state));
  }
}

// Usage
pluginManager.install(
  new PersistencePlugin(localStorage, ['UserCubit', 'SettingsCubit']),
  { environment: 'all' },
);
```

## DevTools Plugin

The BlaC DevTools browser extension uses the plugin system:

```typescript
import { getPluginManager } from '@blac/core';
import { createDevToolsBrowserPlugin } from '@blac/devtools-connect';

// Install DevTools plugin
const pluginManager = getPluginManager();
pluginManager.install(createDevToolsBrowserPlugin(), {
  environment: 'development',
});
```

This automatically exposes `window.__BLAC_DEVTOOLS__` for the browser extension to access.

## Best Practices

1. **Name your plugin uniquely** - Use descriptive names to avoid conflicts
2. **Version your plugin** - Helps with debugging and compatibility
3. **Handle errors gracefully** - Plugins should never crash the app
4. **Clean up on uninstall** - Remove event listeners, clear caches, etc.
5. **Use environment filtering** - Only run plugins where needed
6. **Minimize overhead** - Keep plugin logic lightweight
7. **Use context API** - Don't access private internals directly

## Plugin Manager API

```typescript
// Get global plugin manager
const pluginManager = getPluginManager();

// Install plugin
pluginManager.install(plugin, config);

// Uninstall plugin
pluginManager.uninstall('PluginName');

// Check if plugin is installed
if (pluginManager.hasPlugin('PluginName')) {
  // ...
}

// Get plugin instance
const plugin = pluginManager.getPlugin('PluginName');

// Get all installed plugins
const plugins = pluginManager.getAllPlugins();

// Clear all plugins (for testing)
pluginManager.clear();
```

## Security Considerations

- Plugins run in the same context as your application
- Only install plugins from trusted sources
- Review plugin code before installation
- Use environment filtering to limit plugin exposure
- The PluginContext API is designed to be safe, but plugins can still access instances directly

## TypeScript Support

The plugin system is fully typed:

```typescript
import type {
  BlacPlugin,
  PluginContext,
  PluginConfig,
  InstanceMetadata,
} from '@blac/core';
```

## Testing Plugins

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  StateContainer,
  createPluginManager,
  StateContainerRegistry,
} from '@blac/core';
import { MyPlugin } from './MyPlugin';

describe('MyPlugin', () => {
  let registry: StateContainerRegistry;
  let pluginManager: PluginManager;
  let plugin: MyPlugin;

  beforeEach(() => {
    registry = new StateContainerRegistry();
    pluginManager = createPluginManager(registry);
    plugin = new MyPlugin();
  });

  it('should track instance creation', () => {
    const spy = vi.fn();
    plugin.onInstanceCreated = spy;

    pluginManager.install(plugin);

    class TestCubit extends Cubit<{ value: number }> {}
    const cubit = new TestCubit({ value: 0 });

    expect(spy).toHaveBeenCalledWith(cubit, expect.any(Object));
  });
});
```
