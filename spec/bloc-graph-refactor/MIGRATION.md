# Bloc Graph Visualization - Migration Guide

## Overview

This migration guide helps you upgrade from BlaC v2.x to v3.0, which includes a **major refactoring** of the graph visualization system.

**Key Changes:**
- Graph visualization extracted from `@blac/core` into a separate plugin: `@blac/plugin-graph`
- Breaking API changes: `Blac.subscribeToGraph()` and `Blac.getGraphSnapshot()` removed
- New hierarchical layout with Root → Bloc → State node structure
- Enhanced features: better state serialization, animations, and customization

---

## Breaking Changes

### 1. Graph Methods Removed from `@blac/core`

**Removed APIs:**
- `Blac.instance.subscribeToGraph(callback)` ❌
- `Blac.instance.getGraphSnapshot()` ❌
- `Blac.instance.setGraphThrottleInterval(ms)` ❌

**Reason:** Graph visualization is now a plugin, keeping the core library focused and lightweight.

### 2. Graph Types Moved

**Old Location:** `@blac/core`
```typescript
import type { GraphNode, GraphSnapshot } from '@blac/core';
```

**New Location:** `@blac/plugin-graph`
```typescript
import type { GraphNode, GraphSnapshot } from '@blac/plugin-graph';
```

### 3. New Node Structure

The graph now uses a **3-level hierarchy**:
- **Root Node**: Represents the Blac instance (global stats)
- **Bloc/Cubit Nodes**: Individual state containers
- **State Nodes**: Current state values (serialized)

---

## Migration Steps

### Step 1: Install the Plugin Package

```bash
npm install @blac/plugin-graph
# or
yarn add @blac/plugin-graph
# or
pnpm add @blac/plugin-graph
```

### Step 2: Register the Plugin

**Before (v2.x):**
```typescript
import { Blac } from '@blac/core';

// Graph was automatically available
const snapshot = Blac.instance.getGraphSnapshot();
```

**After (v3.0):**
```typescript
import { Blac } from '@blac/core';
import { GraphPlugin } from '@blac/plugin-graph';

// Register the plugin ONCE at app startup
Blac.instance.plugins.add(new GraphPlugin({
  throttleInterval: 100,        // Optional: Update throttle (default: 100ms)
  maxStateDepth: 2,              // Optional: Serialization depth (default: 2)
  maxStateStringLength: 100,     // Optional: String truncation (default: 100)
}));
```

**Where to register:** Early in your application's entry point (e.g., `main.ts`, `index.ts`, or `App.tsx`).

### Step 3: Update Graph Subscriptions

**Before (v2.x):**
```typescript
import { Blac } from '@blac/core';

const unsubscribe = Blac.instance.subscribeToGraph((snapshot) => {
  console.log('Graph updated:', snapshot);
});
```

**After (v3.0):**
```typescript
import { Blac } from '@blac/core';

const plugin = Blac.instance.plugins.get('GraphPlugin');

if (plugin) {
  const unsubscribe = plugin.subscribeToGraph((snapshot) => {
    console.log('Graph updated:', snapshot);
  });
}
```

**Recommended:** Use the `useBlocGraph` React hook (see Step 4).

### Step 4: Update React Components

**Before (v2.x):**
```tsx
import { Blac } from '@blac/core';
import { useEffect, useState } from 'react';

function GraphVisualizer() {
  const [graph, setGraph] = useState(Blac.instance.getGraphSnapshot());

  useEffect(() => {
    const unsubscribe = Blac.instance.subscribeToGraph(setGraph);
    return unsubscribe;
  }, []);

  return <div>Nodes: {graph.nodes.length}</div>;
}
```

**After (v3.0):**
```tsx
import { useBlocGraph } from '@blac/react';

function GraphVisualizer() {
  const graph = useBlocGraph(); // Automatically subscribes to plugin

  return <div>Nodes: {graph.nodes.length}</div>;
}
```

**Benefits:**
- Automatic subscription management
- Graceful fallback if plugin not registered (returns empty snapshot)
- Console warnings if plugin is missing

### Step 5: Update Type Imports

**Before (v2.x):**
```typescript
import type { GraphNode, GraphSnapshot, GraphEdge } from '@blac/core';
```

**After (v3.0):**
```typescript
import type {
  GraphNode,
  GraphSnapshot,
  GraphEdge,
  RootGraphNode,
  BlocGraphNode,
  StateGraphNode,
} from '@blac/plugin-graph';
```

---

## New Features in v3.0

### 1. Hierarchical Node Structure

The graph now includes a **Root node** showing global Blac statistics:

```typescript
interface RootGraphNode {
  type: 'root';
  stats: {
    totalBlocs: number;
    activeBlocs: number;
    disposedBlocs: number;
    totalConsumers: number;
    memoryStats: {
      registeredBlocs: number;
      isolatedBlocs: number;
      keepAliveBlocs: number;
    };
  };
}
```

### 2. Separate State Nodes

State values are now separate nodes with rich metadata:

```typescript
interface StateGraphNode {
  type: 'state';
  displayValue: string;      // Truncated for display
  fullValue: string;          // Full JSON for tooltips
  isPrimitive: boolean;       // Is it a primitive value?
  isExpandable: boolean;      // Can it be expanded?
  valueType: string;          // 'object', 'array', 'number', etc.
  childCount?: number;        // Number of properties (for objects/arrays)
  hasChanged?: boolean;       // Flag for flash animations
}
```

### 3. Enhanced State Serialization

- **Circular reference detection**: No more infinite loops
- **Depth limiting**: Prevents performance issues with deep objects (default: 2 levels)
- **String truncation**: Long strings are truncated for display (default: 100 chars)
- **Special type handling**: Proper serialization for Date, Map, Set, BigInt, Symbol, Function, etc.

### 4. Configuration Options

```typescript
new GraphPlugin({
  throttleInterval: 100,        // Throttle graph updates (milliseconds)
  maxStateDepth: 2,              // Maximum nesting depth for state serialization
  maxStateStringLength: 100,     // Maximum string length before truncation
});
```

---

## Troubleshooting

### Error: "GraphPlugin not registered"

**Symptom:** Console warning: `[useBlocGraph] GraphPlugin not registered.`

**Solution:**
1. Install `@blac/plugin-graph`: `npm install @blac/plugin-graph`
2. Register the plugin early in your app:
   ```typescript
   import { GraphPlugin } from '@blac/plugin-graph';
   Blac.instance.plugins.add(new GraphPlugin());
   ```

### Error: Type imports not found

**Symptom:** TypeScript error: `Module '"@blac/core"' has no exported member 'GraphNode'`

**Solution:** Update imports to use `@blac/plugin-graph`:
```typescript
import type { GraphNode } from '@blac/plugin-graph';
```

### Graph not updating

**Symptom:** `useBlocGraph()` returns empty snapshot or stale data

**Possible causes:**
1. Plugin not registered (check console for warnings)
2. Plugin registered after Blocs were created (register plugin before creating Blocs)
3. Throttle interval too high (default: 100ms)

**Solution:**
- Ensure plugin is registered in your app's entry point
- Lower throttle interval if needed:
  ```typescript
  new GraphPlugin({ throttleInterval: 50 })
  ```

### Performance issues with large state

**Symptom:** UI freezes when rendering large state objects

**Solution:** Reduce serialization depth:
```typescript
new GraphPlugin({
  maxStateDepth: 1,              // Only serialize top-level properties
  maxStateStringLength: 50,      // Truncate strings more aggressively
});
```

---

## Comparison: Old vs New API

| Feature | v2.x (Old) | v3.0 (New) |
|---------|------------|------------|
| **Installation** | Built-in (`@blac/core`) | Plugin (`@blac/plugin-graph`) |
| **Setup** | Automatic | Explicit registration required |
| **Subscribe** | `Blac.instance.subscribeToGraph(cb)` | `plugin.subscribeToGraph(cb)` or `useBlocGraph()` |
| **Get Snapshot** | `Blac.instance.getGraphSnapshot()` | `plugin.getGraphSnapshot()` |
| **React Hook** | Manual implementation | `useBlocGraph()` hook |
| **Node Types** | `bloc`, `cubit` | `root`, `bloc`, `cubit`, `state` |
| **State Serialization** | Basic | Advanced (circular refs, depth limiting, etc.) |
| **Configuration** | Global only | Per-plugin configuration |
| **Bundle Impact** | Always included | Optional (plugin-based) |

---

## Benefits of v3.0

1. **Smaller Core Bundle**: Graph visualization code removed from `@blac/core`
2. **Better Separation of Concerns**: Visualization is now a plugin, not core functionality
3. **Enhanced Features**: Better state serialization, hierarchical layout, animations
4. **Easier Testing**: Plugin can be omitted in production builds
5. **Future Extensibility**: Other visualization plugins can be added (e.g., timeline, flow diagrams)

---

## Need Help?

- **Documentation**: [packages/plugins/system/graph/README.md](../../packages/plugins/system/graph/README.md)
- **Examples**: [apps/playground/src/pages/graph-test.tsx](../../apps/playground/src/pages/graph-test.tsx)
- **Issues**: Report bugs or ask questions on GitHub Issues

---

**Migration Checklist:**
- [ ] Install `@blac/plugin-graph` package
- [ ] Register `GraphPlugin` in app entry point
- [ ] Update imports: `@blac/core` → `@blac/plugin-graph`
- [ ] Replace `Blac.instance.subscribeToGraph()` with `useBlocGraph()` hook
- [ ] Update any custom visualization code to handle new node types
- [ ] Test graph functionality in development
- [ ] Remove any direct calls to old graph APIs

---

**Document Version**: 1.0
**Created**: 2025-10-12
**Applies To**: BlaC v2.x → v3.0
