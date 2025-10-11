# Bloc Graph Visualization Refactor - Research

## Current Implementation Analysis

### Graph Code Location

**Core Library (`@blac/core`):**
- `packages/blac/src/graph/types.ts` (~190 lines) - Graph type definitions
- `packages/blac/src/Blac.ts:184-1000` (~200 lines) - Graph methods embedded in core class

**Graph Methods in `Blac.ts`:**
```typescript
// Subscription management
subscribeToGraph(callback: GraphUpdateCallback): () => void
unsubscribeFromGraph(callback: GraphUpdateCallback): void

// Data access
getGraphSnapshot(): GraphSnapshot
instanceToNode(instance: BlocBase<unknown>): BlocGraphNode

// Update notification
notifyGraphSubscribers(): void
setGraphThrottleInterval(interval: number): void

// Internal state
private graphSubscribers: Set<GraphUpdateCallback>
private graphUpdateThrottle: ReturnType<typeof setTimeout> | null
private graphThrottleInterval = 100
private graphUpdatePending = false
```

**React Integration (`@blac/react`):**
- `packages/blac-react/src/useBlocGraph.ts` - Hook that calls `Blac.subscribeToGraph()`

**Visualization (`apps/playground`):**
- `apps/playground/src/components/bloc-graph/BlocGraphVisualizer.tsx` - React Flow component
- `apps/playground/src/components/bloc-graph/layouts/gridLayout.ts` - Current grid layout
- `apps/playground/src/components/bloc-graph/nodes/BlocGraphNode.tsx` - Custom node renderer

### Current Graph Structure

**Node Types:**
- Only Bloc/Cubit nodes (no root, no state nodes)
- Metadata includes state but not displayed separately

**Layout:**
- Grid layout with groups (shared, isolated, keepAlive)
- Fixed columns (default: 5)
- Large spacing (350px horizontal, 350px vertical)
- No hierarchy or edges

**Issues:**
1. Sparse, disconnected visualization
2. State hidden in metadata
3. No clear relationships
4. No root anchor point

---

## Plugin Architecture Patterns

### System-Wide Plugin Example: RenderLoggingPlugin

**Location:** `packages/plugins/system/render-logging/src/RenderLoggingPlugin.ts`

**Key Features:**
```typescript
export class RenderLoggingPlugin implements BlacPlugin {
  readonly name = 'RenderLoggingPlugin';
  readonly version = '1.0.0';
  readonly capabilities = {
    readState: true,
    transformState: false,
    interceptEvents: false,
    persistData: false,
    accessMetadata: true,
  };

  // Lifecycle hooks
  onAdapterCreated = (adapter: any, metadata: AdapterMetadata) => {...}
  onAdapterDisposed = (adapter: any, metadata: AdapterMetadata) => {...}
  onAdapterRender = (adapter: any, metadata: AdapterMetadata) => {...}

  // Optional hooks (not implemented in this plugin)
  // onBlocCreated?(bloc: BlocBase<any>): void
  // onBlocDisposed?(bloc: BlocBase<any>): void
  // onStateChanged?(bloc: BlocBase<any>, previousState: any, currentState: any): void
}
```

**Registration:**
```typescript
Blac.plugins.add(new RenderLoggingPlugin({ enabled: true, level: 'detailed' }));
```

**Package Structure:**
```
packages/plugins/system/render-logging/
├── src/
│   ├── index.ts                    # Exports
│   └── RenderLoggingPlugin.ts      # Plugin implementation
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── README.md
```

### Bloc-Specific Plugin Example: PersistencePlugin

**Location:** `packages/plugins/bloc/persistence/`

**Key Difference:**
- Implements `BlocPlugin<TState>` (not `BlacPlugin`)
- Attached to specific Bloc instances
- Can transform state
- Different lifecycle: `onAttach`, `onDetach`, `onStateChange`

**Our Use Case:**
- Graph visualization needs **system-wide observation** of all Blocs
- Should implement `BlacPlugin` (like RenderLoggingPlugin)
- Subscribe to `onBlocCreated`, `onBlocDisposed`, `onStateChanged`

---

## React Flow Layout Options

### Layout Libraries Comparison

Based on React Flow official documentation (2024-2025):

| Library | Best For | Pros | Cons | Our Fit |
|---------|----------|------|------|---------|
| **Dagre** | Simple directed graphs, trees | Easy to use, fast, stable | Limited customization | ✅ **Good** |
| **D3-Hierarchy** | Trees with single root | Rich tree layouts (treemap, partition) | Requires tree structure | ✅ **Excellent** |
| **Elkjs** | Complex graphs, advanced features | Very powerful, many options | More complex, slower | ⚠️ Overkill |
| **Entitree Flex** | Trees with siblings, variable sizes | Flexible, modern (2024) | Newer, less proven | ✅ **Interesting** |

### Recommended: D3-Hierarchy

**Why D3-Hierarchy is ideal for our use case:**
1. ✅ We have a **single root node** (Blac instance)
2. ✅ Clear **parent-child relationships** (Blac → Blocs → State)
3. ✅ **Tree structure** (no cycles)
4. ✅ **Compact layouts** available (tree, cluster, partition)
5. ✅ **Stable positioning** with good algorithms

**Example D3-Hierarchy Layouts:**
- `d3.tree()` - Tidy tree layout (Reingold-Tilford algorithm)
- `d3.cluster()` - Dendrogram-like layout
- `d3.treemap()` - Space-filling rectangles

**Installation:**
```bash
pnpm add d3-hierarchy d3-shape
```

**Basic Usage Pattern:**
```typescript
import { stratify, tree } from 'd3-hierarchy';

// Convert nodes to hierarchy
const root = stratify()
  .id(d => d.id)
  .parentId(d => d.parentId)(nodes);

// Apply tree layout
const treeLayout = tree()
  .size([width, height])
  .separation((a, b) => (a.parent === b.parent ? 1 : 2));

const layouted = treeLayout(root);

// Convert back to React Flow nodes
return layouted.descendants().map(d => ({
  id: d.data.id,
  position: { x: d.x, y: d.y },
  data: d.data,
}));
```

### Alternative: Dagre (Simpler Option)

If d3-hierarchy proves too complex, dagre is a solid fallback:

```typescript
import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));
dagreGraph.setGraph({ rankdir: 'TB' }); // Top-to-Bottom

nodes.forEach(node => {
  dagreGraph.setNode(node.id, { width: 200, height: 100 });
});

edges.forEach(edge => {
  dagreGraph.setEdge(edge.source, edge.target);
});

dagre.layout(dagreGraph);

return nodes.map(node => {
  const position = dagreGraph.node(node.id);
  return { ...node, position: { x: position.x, y: position.y } };
});
```

---

## State Serialization Strategies

### Challenge: Complex JavaScript Types

Need to serialize:
- Primitives: `number`, `string`, `boolean`, `null`, `undefined`, `bigint`, `symbol`
- Objects: Plain objects, nested objects, circular references
- Collections: `Array`, `Map`, `Set`, `WeakMap`, `WeakSet`
- Special: `Date`, `RegExp`, `Error`, `URL`
- Functions: (typically not serializable, show `[Function]`)

### Best Practices (2024-2025)

**1. Custom Replacer with WeakSet (Circular References)**

```typescript
function serializeWithCircularRefs(value: any, maxDepth: number = 5): string {
  const seen = new WeakSet();

  return JSON.stringify(value, (key, val) => {
    // Limit depth
    if (key.split('.').length > maxDepth) {
      return '[Max Depth Exceeded]';
    }

    // Handle circular references
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) {
        return '[Circular]';
      }
      seen.add(val);
    }

    // Handle special types
    if (val instanceof Date) {
      return `[Date: ${val.toISOString()}]`;
    }
    if (val instanceof Map) {
      return `[Map: ${val.size} entries]`;
    }
    if (val instanceof Set) {
      return `[Set: ${val.size} items]`;
    }
    if (typeof val === 'function') {
      return `[Function: ${val.name || 'anonymous'}]`;
    }
    if (typeof val === 'bigint') {
      return `[BigInt: ${val.toString()}]`;
    }
    if (typeof val === 'symbol') {
      return `[Symbol: ${val.toString()}]`;
    }

    return val;
  }, 2); // Pretty print with 2-space indent
}
```

**2. Truncation for Display**

```typescript
function truncateForDisplay(str: string, maxLength: number = 100): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

function serializeStateForDisplay(state: any): string {
  const full = serializeWithCircularRefs(state);
  return truncateForDisplay(full, 100);
}
```

**3. Deep Object Representation**

For deeply nested objects, provide expandable view:

```typescript
interface StateNodeData {
  value: any;                    // Original value
  displayValue: string;          // Truncated for display
  fullValue: string;             // Full JSON string for tooltip
  isExpandable: boolean;         // Can be expanded
  isPrimitive: boolean;          // Simple value
  type: string;                  // 'object' | 'array' | 'primitive' | 'map' | 'set' | etc
  childCount?: number;           // For objects/arrays
}

function analyzeStateValue(value: any): StateNodeData {
  const fullValue = serializeWithCircularRefs(value);
  const isPrimitive = ['string', 'number', 'boolean'].includes(typeof value)
    || value === null
    || value === undefined;

  let childCount: number | undefined;
  let type: string;

  if (Array.isArray(value)) {
    type = 'array';
    childCount = value.length;
  } else if (value instanceof Map) {
    type = 'map';
    childCount = value.size;
  } else if (value instanceof Set) {
    type = 'set';
    childCount = value.size;
  } else if (typeof value === 'object' && value !== null) {
    type = 'object';
    childCount = Object.keys(value).length;
  } else {
    type = typeof value;
  }

  return {
    value,
    displayValue: truncateForDisplay(fullValue, 100),
    fullValue,
    isExpandable: !isPrimitive && (childCount ?? 0) > 0,
    isPrimitive,
    type,
    childCount,
  };
}
```

**4. Libraries to Consider**

- **flatted** (2.5MB minified) - Handles circular refs, widely used
- **json-stringify-safe** - Simple, safe replacement for JSON.stringify
- **superjson** - Preserves types (Date, Map, Set, etc.), 8KB gzipped

**Recommendation:** Implement custom solution first, add library if needed.

---

## Animation Patterns in React Flow

### React Flow Animation Support

React Flow natively supports animations via CSS transitions on node positions.

### Key Animation Requirements

**1. Node Add/Remove Animations**

```typescript
// In custom node component
const CustomNode = ({ data, selected }) => {
  return (
    <div
      className="custom-node"
      style={{
        animation: data.isNew ? 'fadeIn 0.3s ease-in' : undefined,
      }}
    >
      {/* Node content */}
    </div>
  );
};

// CSS
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

**2. Position Transition Animations**

React Flow automatically animates position changes if you use the provided state management:

```typescript
// Smooth position transitions
const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

// Position changes will be animated automatically
setNodes((nds) =>
  nds.map((node) => ({
    ...node,
    position: newPosition, // Will animate smoothly
  }))
);
```

**3. Flash Animation on State Change**

```typescript
// Track which nodes changed
const [changedNodes, setChangedNodes] = useState<Set<string>>(new Set());

// In node component
const isFlashing = changedNodes.has(data.id);

return (
  <div
    className={`bloc-node ${isFlashing ? 'flash' : ''}`}
  >
    {/* ... */}
  </div>
);

// CSS
.flash {
  animation: flashBorder 0.4s ease-in-out;
}

@keyframes flashBorder {
  0%, 100% {
    border-color: currentColor;
    box-shadow: none;
  }
  50% {
    border-color: #f59e0b; /* Amber-500 */
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.3);
  }
}
```

**4. Stable Layout with Animations**

To minimize visual disruption:
- Use stable node IDs (based on Bloc UID)
- Maintain sort order (alphabetical or creation time)
- Only animate what changed
- Use React Flow's `fitView` with `duration` option

```typescript
// Smooth viewport adjustment
fitView({
  duration: 300,  // 300ms transition
  padding: 0.2,   // 20% padding around nodes
});
```

---

## Performance Considerations

### Throttling & Debouncing

**Current Implementation:** 100ms throttle on graph updates (good)

**Optimization Opportunities:**
1. **Differential updates** - Only update changed nodes
2. **Virtual rendering** - For 100+ nodes, use React Flow's viewport culling
3. **Memoization** - Memo expensive serialization operations

```typescript
// Efficient graph updates
const updateGraph = useMemo(() =>
  throttle((snapshot: GraphSnapshot) => {
    // Diff nodes
    const added = snapshot.nodes.filter(n => !prevNodes.has(n.id));
    const removed = prevNodes.filter(id => !snapshot.nodes.find(n => n.id === id));
    const changed = snapshot.nodes.filter(n => hasNodeChanged(n, prevNodes.get(n.id)));

    // Only update what changed
    setNodes((nds) => {
      // Remove disposed nodes
      let updated = nds.filter(n => !removed.includes(n.id));

      // Add new nodes with animation flag
      const newNodes = added.map(nodeData => ({
        ...convertToReactFlowNode(nodeData),
        data: { ...nodeData, isNew: true },
      }));

      // Update changed nodes
      updated = updated.map(node => {
        const changedData = changed.find(c => c.id === node.id);
        return changedData ? { ...node, data: changedData } : node;
      });

      return [...updated, ...newNodes];
    });
  }, 100),
  [prevNodes]
);
```

### Large Graph Optimization

For graphs with 100+ nodes:
- Enable React Flow's `onlyRenderVisibleElements` prop
- Use smaller node sizes
- Reduce animation complexity
- Consider pagination or filtering

---

## Package Structure Recommendations

### Proposed Plugin Package Structure

```
packages/plugins/system/graph/
├── src/
│   ├── index.ts                    # Main exports
│   ├── GraphPlugin.ts              # Plugin implementation (BlacPlugin)
│   ├── types.ts                    # Graph types (nodes, edges, snapshot)
│   ├── serialization/
│   │   ├── index.ts
│   │   ├── serializeState.ts       # State serialization logic
│   │   └── analyzeValue.ts         # Value analysis for display
│   ├── graph/
│   │   ├── GraphManager.ts         # Internal graph state management
│   │   └── GraphBuilder.ts         # Convert Blocs → Graph structure
│   └── __tests__/
│       ├── GraphPlugin.test.ts
│       └── serialization.test.ts
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vitest.config.ts
└── README.md
```

### React Visualization Package

Option 1: Extend `@blac/react` (if tightly coupled)
Option 2: Create `@blac/react-graph` (if standalone)

**Recommendation:** Keep in `@blac/react` as optional export:

```typescript
// @blac/react/src/index.ts
export { useBloc } from './useBloc';
export { useBlocGraph } from './useBlocGraph'; // Already exists
export { BlocGraphVisualizer } from './components/BlocGraphVisualizer'; // New
```

---

## Migration Strategy

### Phase 1: Extract Plugin (No Breaking Changes Initially)

1. Create `@blac/plugin-graph` package
2. Copy graph types from core
3. Implement `GraphPlugin` with same API
4. Keep old methods in core as deprecated wrappers that delegate to plugin
5. Auto-register plugin in core (temporary)

### Phase 2: Update React Integration

1. Update `useBlocGraph()` to use plugin
2. Add fallback if plugin not registered
3. Test with playground

### Phase 3: Remove Core Graph Code (Breaking Change)

1. Remove graph methods from `Blac.ts`
2. Remove `packages/blac/src/graph/` directory
3. Update documentation
4. Publish as major version bump

### Phase 4: Redesign Visualization

1. Implement hierarchical layout
2. Add state nodes
3. Add animations
4. Update playground demo

---

## Key Findings Summary

### Plugin Architecture
✅ Use `BlacPlugin` interface (like RenderLoggingPlugin)
✅ Subscribe to `onBlocCreated`, `onBlocDisposed`, `onStateChanged`
✅ Internal graph state management
✅ Throttled subscriber notifications (100ms default)

### Layout Strategy
✅ **D3-Hierarchy recommended** for tree layout
⚠️ Dagre as fallback if d3 is too complex
✅ Single root node (Blac instance)
✅ Stable positioning with Reingold-Tilford algorithm

### State Serialization
✅ Custom replacer with WeakSet for circular refs
✅ Truncate for display, full value on hover
✅ Handle all JS types (primitives, objects, collections, special types)
✅ Configurable depth and length limits

### Animations
✅ CSS animations for add/remove (fade in/out)
✅ React Flow auto-animates position changes
✅ Flash animation on state change (border/shadow pulse)
✅ Stable layout to minimize disruption

### Performance
✅ Keep 100ms throttling
✅ Differential updates (only changed nodes)
✅ Memoize serialization
✅ Use React Flow's viewport culling for large graphs

---

**Document Version**: 1.0
**Created**: 2025-10-12
**Status**: Complete - Ready for Discussion Phase
