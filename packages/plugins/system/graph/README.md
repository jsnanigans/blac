# @blac/plugin-graph

Graph visualization plugin for BlaC state management library.

## Overview

This plugin provides hierarchical graph visualization of your BlaC state management system, showing:

- **Root Node**: Blac instance with global statistics
- **Bloc/Cubit Nodes**: State containers with lifecycle and consumer information
- **State Nodes**: Current state values with serialization

## Installation

```bash
pnpm add @blac/plugin-graph
# or
npm install @blac/plugin-graph
# or
yarn add @blac/plugin-graph
```

## Usage

### Basic Setup

```typescript
import { Blac } from '@blac/core';
import { GraphPlugin } from '@blac/plugin-graph';

// Register the plugin (do this once at app startup)
Blac.plugins.add(new GraphPlugin());
```

### With Configuration

```typescript
Blac.plugins.add(new GraphPlugin({
  throttleInterval: 100,        // Update throttle in ms (default: 100)
  maxStateDepth: 2,             // Max depth for nested objects (default: 2)
  maxStateStringLength: 100,    // Max string length before truncation (default: 100)
}));
```

### React Integration

Use with the `useBlocGraph` hook from `@blac/react`:

```typescript
import { useBlocGraph } from '@blac/react';

function MyGraphVisualizer() {
  const graph = useBlocGraph();

  console.log('Nodes:', graph.nodes);
  console.log('Edges:', graph.edges);

  return <div>{/* Your visualization */}</div>;
}
```

### Direct API Access

```typescript
// Get the plugin instance
const graphPlugin = Blac.plugins.get('GraphPlugin') as GraphPlugin;

// Subscribe to graph updates
const unsubscribe = graphPlugin?.subscribeToGraph((snapshot) => {
  console.log('Graph updated:', snapshot);
});

// Get current snapshot
const snapshot = graphPlugin?.getGraphSnapshot();
console.log('Current graph:', snapshot);

// Cleanup
unsubscribe?.();
```

## Graph Structure

### Node Types

#### Root Node
Represents the Blac instance with global statistics:

```typescript
interface RootGraphNode {
  id: 'blac-root';
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

#### Bloc/Cubit Nodes
Represent individual state containers:

```typescript
interface BlocGraphNode {
  id: string;                // 'bloc-{uid}'
  type: 'bloc' | 'cubit';
  parentId: 'blac-root';
  name: string;              // Class name
  instanceId: string;        // UID
  lifecycle: 'active' | 'disposal_requested' | 'disposing' | 'disposed';
  consumerCount: number;
  isShared: boolean;
  isIsolated: boolean;
  keepAlive: boolean;
}
```

#### State Nodes
Represent current state values:

```typescript
interface StateGraphNode {
  id: string;                // 'state-{bloc-uid}'
  type: 'state';
  parentId: string;          // Parent Bloc/Cubit node ID
  displayValue: string;      // Truncated for display
  fullValue: string;         // Full JSON for tooltips
  isPrimitive: boolean;
  isExpandable: boolean;
  valueType: string;         // 'object', 'array', 'string', etc
  childCount?: number;
  hasChanged?: boolean;      // For flash animations
}
```

### Edges

Edges represent parent-child relationships:

```typescript
interface GraphEdge {
  id: string;
  source: string;  // Parent node ID
  target: string;  // Child node ID
  type: 'hierarchy';
}
```

## Features

### State Serialization

The plugin handles complex JavaScript types:

- **Primitives**: `number`, `string`, `boolean`, `null`, `undefined`
- **Objects**: Plain objects, nested structures
- **Collections**: `Array`, `Map`, `Set`
- **Special Types**: `Date`, `RegExp`, `Error`, `URL`, `BigInt`, `Symbol`, `Function`
- **Circular References**: Detected and marked as `[Circular]`
- **Deep Nesting**: Controlled with `maxStateDepth`

### Performance

- **Throttled Updates**: Configurable throttle interval (default: 100ms)
- **Efficient Serialization**: Depth limiting and truncation
- **Memory Safe**: WeakSet-based circular reference detection

### Real-time Updates

The graph automatically updates when:
- New Bloc/Cubit instances are created
- State changes occur
- Blocs are disposed

## Examples

### Subscribing to Updates

```typescript
import { GraphPlugin } from '@blac/plugin-graph';

const plugin = Blac.plugins.get('GraphPlugin') as GraphPlugin;

if (plugin) {
  const unsubscribe = plugin.subscribeToGraph((snapshot) => {
    console.log(`Graph has ${snapshot.nodes.length} nodes`);
    console.log(`Graph has ${snapshot.edges.length} edges`);
    console.log(`Timestamp: ${snapshot.timestamp}`);
  });

  // Later...
  unsubscribe();
}
```

### Filtering Nodes by Type

```typescript
const snapshot = plugin?.getGraphSnapshot();

const rootNode = snapshot?.nodes.find(n => n.type === 'root');
const blocNodes = snapshot?.nodes.filter(n => n.type === 'bloc' || n.type === 'cubit');
const stateNodes = snapshot?.nodes.filter(n => n.type === 'state');

console.log('Root:', rootNode);
console.log('Blocs:', blocNodes);
console.log('States:', stateNodes);
```

### Custom Serialization

```typescript
import { serializeState, analyzeStateValue } from '@blac/plugin-graph';

const state = { user: { name: 'Alice', age: 30 } };

// Serialize with custom config
const serialized = serializeState(state, {
  maxDepth: 3,
  maxStringLength: 200,
});

console.log(serialized.displayValue); // Truncated
console.log(serialized.fullValue);    // Full JSON

// Analyze value
const metadata = analyzeStateValue(state, {
  maxDepth: 3,
  maxStringLength: 200,
});

console.log(metadata.type);          // 'object'
console.log(metadata.childCount);    // 2
console.log(metadata.isExpandable);  // true
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  GraphSnapshot,
  GraphNode,
  GraphEdge,
  RootGraphNode,
  BlocGraphNode,
  StateGraphNode,
  GraphUpdateCallback,
} from '@blac/plugin-graph';
```

## Migration from Core

If you were using the old graph API from `@blac/core`:

### Before (v2.x)
```typescript
import { Blac } from '@blac/core';

const snapshot = Blac.getGraphSnapshot();
const unsubscribe = Blac.subscribeToGraph(callback);
```

### After (v3.0)
```typescript
import { Blac } from '@blac/core';
import { GraphPlugin } from '@blac/plugin-graph';

// 1. Register plugin
Blac.plugins.add(new GraphPlugin());

// 2. Access via plugin
const plugin = Blac.plugins.get('GraphPlugin') as GraphPlugin;
const snapshot = plugin?.getGraphSnapshot();
const unsubscribe = plugin?.subscribeToGraph(callback);

// 3. Or use React hook
import { useBlocGraph } from '@blac/react';
const graph = useBlocGraph(); // Works transparently
```

## License

MIT
