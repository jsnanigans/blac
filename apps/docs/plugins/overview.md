# Plugin System

BlaC's plugin system provides a powerful way to extend the functionality of your state management without modifying core code. Plugins can observe state changes, transform state, intercept events, and add custom behavior to your blocs and cubits.

## Overview

The plugin system in BlaC is designed with several key principles:

- **Non-intrusive**: Plugins observe and enhance without breaking existing functionality
- **Type-safe**: Full TypeScript support with proper type inference
- **Performance-conscious**: Minimal overhead with synchronous hooks
- **Secure**: Capability-based security model controls what plugins can access
- **Extensible**: Both system-wide and bloc-specific plugins

## Types of Plugins

BlaC supports two types of plugins:

### 1. System Plugins (BlacPlugin)

System plugins observe all blocs in your application. They're perfect for:

- Global logging and debugging
- Analytics and monitoring
- Development tools
- Cross-cutting concerns

### 2. Bloc Plugins (BlocPlugin)

Bloc plugins are attached to specific bloc instances. They're ideal for:

- State persistence
- State transformation
- Event interception
- Instance-specific behavior

## Quick Example

Here's a simple logging plugin that tracks all state changes:

```typescript
import { BlacPlugin, BlacLifecycleEvent } from '@blac/core';

class LoggingPlugin implements BlacPlugin {
  name = 'logger';
  version = '1.0.0';

  onStateChanged(bloc, previousState, currentState) {
    console.log(`[${bloc._name}] State changed:`, {
      from: previousState,
      to: currentState,
      timestamp: Date.now(),
    });
  }
}

// Register the plugin globally
Blac.plugins.add(new LoggingPlugin());
```

## Plugin Capabilities

Plugins declare their capabilities for security and clarity:

```typescript
interface PluginCapabilities {
  readState: boolean; // Can read bloc state
  transformState: boolean; // Can modify state
  interceptEvents: boolean; // Can intercept/modify events
  persistData: boolean; // Can persist data externally
  accessMetadata: boolean; // Can access internal metadata
}
```

## Installation

Most plugins are distributed as npm packages:

```bash
npm install @blac/plugin-persistence
npm install @blac/plugin-devtools
```

## What's Next?

- [Creating Plugins](./creating-plugins.md) - Build your own plugins
- [System Plugins](./system-plugins.md) - Global plugin documentation
- [Bloc Plugins](./bloc-plugins.md) - Instance-specific plugins
- [Persistence Plugin](./persistence.md) - Built-in persistence plugin
- [Plugin API Reference](./api-reference.md) - Complete API documentation
