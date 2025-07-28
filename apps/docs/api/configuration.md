# Configuration

BlaC provides global configuration options to customize its behavior across your entire application. This page covers all available configuration options and how to use them effectively.

## Overview

BlaC uses a static configuration system that allows you to modify global behaviors. Configuration changes affect all new instances and behaviors but do not retroactively change existing instances.

## Setting Configuration

Use the `Blac.setConfig()` method to update configuration:

```typescript
import { Blac } from '@blac/core';

// Set a single configuration option
Blac.setConfig({
  proxyDependencyTracking: false
});

// Set multiple options at once
Blac.setConfig({
  proxyDependencyTracking: false,
  exposeBlacInstance: true
});
```

## Reading Configuration

Access the current configuration using the `Blac.config` getter:

```typescript
const currentConfig = Blac.config;
console.log(currentConfig.proxyDependencyTracking); // true (default)
```

Note: `Blac.config` returns a readonly copy of the configuration to prevent accidental mutations.

## Configuration Options

### `proxyDependencyTracking`

**Type:** `boolean`  
**Default:** `true`

Controls whether BlaC uses automatic proxy-based dependency tracking for optimized re-renders in React components.

#### When enabled (default):
- Components only re-render when properties they actually access change
- BlaC automatically tracks which state properties your components use
- Provides fine-grained reactivity and optimal performance

```typescript
// With proxy tracking enabled (default)
const MyComponent = () => {
  const [state, bloc] = useBloc(UserBloc);
  
  // Only re-renders when state.name changes
  return <div>{state.name}</div>;
};
```

#### When disabled:
- Components re-render on any state change
- Simpler mental model but potentially more re-renders
- Useful for debugging or when proxy behavior causes issues

```typescript
// Disable proxy tracking globally
Blac.setConfig({ proxyDependencyTracking: false });

const MyComponent = () => {
  const [state, bloc] = useBloc(UserBloc);
  
  // Re-renders on ANY state change
  return <div>{state.name}</div>;
};
```

#### Manual Dependencies Override

You can always override the global setting by providing manual dependencies:

```typescript
// This always uses manual dependencies, regardless of global config
const [state, bloc] = useBloc(UserBloc, {
  dependencies: (bloc) => [bloc.state.name, bloc.state.email]
});
```

### `exposeBlacInstance`

**Type:** `boolean`  
**Default:** `false`

Controls whether the BlaC instance is exposed globally for debugging purposes.

```typescript
// Enable global instance exposure
Blac.setConfig({ exposeBlacInstance: true });

// Access instance globally (useful for debugging)
if (window.Blac) {
  console.log(window.Blac.getInstance().getMemoryStats());
}
```

## Configuration Validation

BlaC validates configuration values and throws descriptive errors for invalid inputs:

```typescript
try {
  Blac.setConfig({
    proxyDependencyTracking: 'yes' as any // Invalid type
  });
} catch (error) {
  // Error: BlacConfig.proxyDependencyTracking must be a boolean
}
```

## Best Practices

### 1. Configure Early

Set your configuration as early as possible in your application lifecycle:

```typescript
// app.tsx or index.tsx
import { Blac } from '@blac/core';

// Configure before any components mount
Blac.setConfig({
  proxyDependencyTracking: true
});

// Then render your app
createRoot(document.getElementById('root')!).render(<App />);
```

### 2. Environment-Based Configuration

Adjust configuration based on your environment:

```typescript
Blac.setConfig({
  proxyDependencyTracking: process.env.NODE_ENV === 'production',
  exposeBlacInstance: process.env.NODE_ENV === 'development'
});
```

### 3. Testing Configuration

Reset configuration between tests to ensure isolation:

```typescript
describe('MyComponent', () => {
  const originalConfig = { ...Blac.config };
  
  afterEach(() => {
    Blac.setConfig(originalConfig);
  });
  
  it('works without proxy tracking', () => {
    Blac.setConfig({ proxyDependencyTracking: false });
    // ... test implementation
  });
});
```

## Performance Considerations

### Proxy Dependency Tracking

**Benefits:**
- Minimal re-renders - components only update when accessed properties change
- Automatic optimization without manual work
- Ideal for complex state objects with many properties

**Costs:**
- Small overhead from proxy creation
- May interfere with certain debugging tools
- Can be confusing if you expect all state changes to trigger re-renders

**When to disable:**
- Debugging re-render issues
- Working with state objects that don't benefit from fine-grained tracking
- Compatibility issues with certain tools or libraries

## TypeScript Support

BlaC exports the `BlacConfig` interface for type-safe configuration:

```typescript
import { BlacConfig } from '@blac/core';

const myConfig: Partial<BlacConfig> = {
  proxyDependencyTracking: false
};

Blac.setConfig(myConfig);
```

## Future Configuration Options

The configuration system is designed to be extensible. Future versions may include options for:
- Custom error boundaries
- Development mode warnings
- Performance profiling
- Plugin systems

## Migration Guide

If you're upgrading from a version without configuration support:

1. **Default behavior is unchanged** - Proxy tracking is enabled by default
2. **No code changes required** - Existing code continues to work
3. **Opt-in to changes** - Explicitly disable features if needed

```typescript
// Old behavior (proxy tracking always on)
const [state, bloc] = useBloc(MyBloc);

// Still works exactly the same with default config
const [state, bloc] = useBloc(MyBloc);

// New option to disable if needed
Blac.setConfig({ proxyDependencyTracking: false });
```