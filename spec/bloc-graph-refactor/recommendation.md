# Bloc Graph Visualization Refactor - Recommendation

## Executive Recommendation

**Implement Option 1: Clean Break Architecture**

Extract all graph visualization code from `@blac/core` into a new `@blac/plugin-graph` package with hierarchical tree layout, state nodes, and full animation support.

**Key Decision Rationale:**
- ✅ Clean separation of concerns (87% score, highest)
- ✅ Breaking changes explicitly allowed
- ✅ Meets all requirements immediately
- ✅ Council consensus recommendation
- ✅ Best long-term maintainability

**Timeline:** 3-5 days
**Risk Level:** Medium (breaking changes, but well-specified)

---

## Technical Architecture

### Package Structure

```
packages/
├── blac/                           # Core (@blac/core)
│   └── src/
│       ├── Blac.ts                 # ❌ Remove all graph methods
│       └── graph/                  # ❌ Remove entire directory
│
├── plugins/
│   └── system/
│       └── graph/                  # ✅ NEW: @blac/plugin-graph
│           ├── src/
│           │   ├── index.ts
│           │   ├── GraphPlugin.ts
│           │   ├── types.ts
│           │   ├── graph/
│           │   │   ├── GraphManager.ts
│           │   │   └── GraphBuilder.ts
│           │   ├── serialization/
│           │   │   ├── serializeState.ts
│           │   │   └── analyzeValue.ts
│           │   └── __tests__/
│           ├── package.json
│           ├── tsconfig.json
│           └── README.md
│
└── blac-react/                     # React (@blac/react)
    └── src/
        ├── useBlocGraph.ts         # ✅ Update to use plugin
        └── components/
            └── BlocGraphVisualizer.tsx  # ✅ Update for hierarchy
```

### Data Flow

```
┌─────────────────────────────────────────────────────┐
│                    @blac/core                       │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │ Bloc A   │    │ Bloc B   │    │ Bloc C   │     │
│  │ created  │    │ state    │    │ disposed │     │
│  │          │    │ changed  │    │          │     │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘     │
│       │               │               │            │
│       │ Plugin Hooks  │               │            │
│       ▼               ▼               ▼            │
└───────┼───────────────┼───────────────┼────────────┘
        │               │               │
        │               │               │
┌───────┴───────────────┴───────────────┴────────────┐
│              @blac/plugin-graph                     │
│                                                     │
│  GraphPlugin (BlacPlugin)                          │
│  ┌─────────────────────────────────────────────┐  │
│  │ onBlocCreated() → Add Bloc + State nodes   │  │
│  │ onStateChanged() → Update State node       │  │
│  │ onBlocDisposed() → Remove Bloc + State     │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  GraphManager (Internal State)                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ - Root node (Blac)                          │  │
│  │ - Map<blocUID, BlocNode>                    │  │
│  │ - Map<blocUID, StateNode>                   │  │
│  │ - Edges: parent-child relationships        │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  Subscriber Notifications (throttled 100ms)        │
│  ┌─────────────────────────────────────────────┐  │
│  │ callbacks: Set<GraphUpdateCallback>         │  │
│  │ notifySubscribers() → GraphSnapshot        │  │
│  └─────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────┘
                        │ subscribeToGraph()
                        │ GraphSnapshot
                        ▼
┌─────────────────────────────────────────────────────┐
│                  @blac/react                        │
│                                                     │
│  useBlocGraph()                                    │
│  ┌─────────────────────────────────────────────┐  │
│  │ 1. Get plugin from Blac.plugins             │  │
│  │ 2. Subscribe to graph updates               │  │
│  │ 3. Return GraphSnapshot                     │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  BlocGraphVisualizer                               │
│  ┌─────────────────────────────────────────────┐  │
│  │ 1. Get snapshot from useBlocGraph()         │  │
│  │ 2. Build hierarchy (D3-Hierarchy)           │  │
│  │ 3. Render with React Flow                   │  │
│  │ 4. Animate changes                          │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Graph Plugin Implementation

**File:** `packages/plugins/system/graph/src/GraphPlugin.ts`

```typescript
import {
  BlacPlugin,
  BlocBase,
  Blac,
} from '@blac/core';
import { GraphManager } from './graph/GraphManager';
import { GraphSnapshot, GraphUpdateCallback } from './types';

export interface GraphPluginConfig {
  throttleInterval?: number;        // Default: 100ms
  maxStateDepth?: number;           // Default: 2
  maxStateStringLength?: number;    // Default: 100
}

export class GraphPlugin implements BlacPlugin {
  readonly name = 'GraphPlugin';
  readonly version = '1.0.0';
  readonly capabilities = {
    readState: true,
    transformState: false,
    interceptEvents: false,
    persistData: false,
    accessMetadata: true,
  };

  private graphManager: GraphManager;
  private subscribers = new Set<GraphUpdateCallback>();
  private updateThrottle: ReturnType<typeof setTimeout> | null = null;
  private updatePending = false;
  private config: Required<GraphPluginConfig>;

  constructor(config: GraphPluginConfig = {}) {
    this.config = {
      throttleInterval: config.throttleInterval ?? 100,
      maxStateDepth: config.maxStateDepth ?? 2,
      maxStateStringLength: config.maxStateStringLength ?? 100,
    };

    this.graphManager = new GraphManager(this.config);
  }

  // ===== Lifecycle Hooks =====

  afterBootstrap(): void {
    // Create root node for Blac instance
    this.graphManager.createRootNode();
    this.notifySubscribers();
  }

  onBlocCreated(bloc: BlocBase<any>): void {
    // Add Bloc node + State node
    this.graphManager.addBlocNode(bloc);
    this.graphManager.addStateNode(bloc);
    this.notifySubscribers();
  }

  onBlocDisposed(bloc: BlocBase<any>): void {
    // Remove Bloc node + State node
    this.graphManager.removeBlocNode(bloc.uid);
    this.graphManager.removeStateNode(bloc.uid);
    this.notifySubscribers();
  }

  onStateChanged(
    bloc: BlocBase<any>,
    previousState: any,
    currentState: any
  ): void {
    // Update State node
    this.graphManager.updateStateNode(bloc.uid, currentState, previousState);
    this.notifySubscribers();
  }

  // ===== Public API =====

  subscribeToGraph(callback: GraphUpdateCallback): () => void {
    this.subscribers.add(callback);

    // Send initial snapshot
    callback(this.getGraphSnapshot());

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  getGraphSnapshot(): GraphSnapshot {
    return this.graphManager.getSnapshot();
  }

  // ===== Internal Methods =====

  private notifySubscribers(): void {
    if (this.subscribers.size === 0) return;

    this.updatePending = true;

    if (this.updateThrottle) return;

    this.updateThrottle = setTimeout(() => {
      this.updateThrottle = null;

      if (this.updatePending) {
        this.updatePending = false;
        const snapshot = this.getGraphSnapshot();

        for (const callback of this.subscribers) {
          try {
            callback(snapshot);
          } catch (error) {
            console.error('GraphPlugin: Error in subscriber callback:', error);
          }
        }
      }
    }, this.config.throttleInterval);
  }
}
```

### 2. Graph Types

**File:** `packages/plugins/system/graph/src/types.ts`

```typescript
/**
 * Node type discriminator
 */
export type GraphNodeType = 'root' | 'bloc' | 'cubit' | 'state';

/**
 * Base node interface
 */
export interface BaseGraphNode {
  id: string;
  type: GraphNodeType;
  parentId?: string;
}

/**
 * Root node (Blac instance)
 */
export interface RootGraphNode extends BaseGraphNode {
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

/**
 * Bloc/Cubit node
 */
export interface BlocGraphNode extends BaseGraphNode {
  type: 'bloc' | 'cubit';
  parentId: string;  // Always root node
  name: string;
  instanceId: string;
  lifecycle: 'active' | 'disposal_requested' | 'disposing' | 'disposed';
  consumerCount: number;
  isShared: boolean;
  isIsolated: boolean;
  keepAlive: boolean;
}

/**
 * State node
 */
export interface StateGraphNode extends BaseGraphNode {
  type: 'state';
  parentId: string;  // Bloc/Cubit node ID
  displayValue: string;      // Truncated for display
  fullValue: string;         // Full JSON for tooltip
  isPrimitive: boolean;
  isExpandable: boolean;
  valueType: string;         // 'object' | 'array' | 'string' | etc
  childCount?: number;
  hasChanged?: boolean;      // For flash animation
}

/**
 * Union of all node types
 */
export type GraphNode = RootGraphNode | BlocGraphNode | StateGraphNode;

/**
 * Edge representing parent-child relationship
 */
export interface GraphEdge {
  id: string;
  source: string;  // Parent node ID
  target: string;  // Child node ID
  type: 'hierarchy';
}

/**
 * Complete graph snapshot
 */
export interface GraphSnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
  timestamp: number;
}

/**
 * Subscriber callback
 */
export type GraphUpdateCallback = (snapshot: GraphSnapshot) => void;
```

### 3. State Serialization

**File:** `packages/plugins/system/graph/src/serialization/serializeState.ts`

```typescript
export interface SerializationConfig {
  maxDepth: number;
  maxStringLength: number;
}

export function serializeState(
  value: any,
  config: SerializationConfig
): { displayValue: string; fullValue: string } {
  const full = serializeWithCircularRefs(value, config.maxDepth);
  const display = truncate(full, config.maxStringLength);

  return {
    displayValue: display,
    fullValue: full,
  };
}

function serializeWithCircularRefs(value: any, maxDepth: number): string {
  const seen = new WeakSet();
  let currentDepth = 0;

  return JSON.stringify(
    value,
    function replacer(key, val) {
      // Track depth
      if (key) currentDepth++;
      if (currentDepth > maxDepth) {
        currentDepth--;
        return '[Max Depth]';
      }

      // Handle circular references
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }

      // Handle special types
      if (val instanceof Date) return `[Date: ${val.toISOString()}]`;
      if (val instanceof Map) return `[Map: ${val.size} entries]`;
      if (val instanceof Set) return `[Set: ${val.size} items]`;
      if (typeof val === 'function') return `[Function: ${val.name || 'anonymous'}]`;
      if (typeof val === 'bigint') return `[BigInt: ${val.toString()}]`;
      if (typeof val === 'symbol') return val.toString();

      currentDepth--;
      return val;
    },
    2 // Pretty print with 2-space indent
  );
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}
```

### 4. React Hook Integration

**File:** `packages/blac-react/src/useBlocGraph.ts`

```typescript
import { useEffect, useState } from 'react';
import { Blac } from '@blac/core';
import type { GraphSnapshot, GraphPlugin } from '@blac/plugin-graph';

const EMPTY_SNAPSHOT: GraphSnapshot = {
  nodes: [],
  edges: [],
  timestamp: Date.now(),
};

/**
 * Hook for subscribing to Bloc graph visualization data
 *
 * Requires @blac/plugin-graph to be registered:
 * ```
 * import { GraphPlugin } from '@blac/plugin-graph';
 * Blac.plugins.add(new GraphPlugin());
 * ```
 */
export function useBlocGraph(): GraphSnapshot {
  const [snapshot, setSnapshot] = useState<GraphSnapshot>(() => {
    const plugin = getGraphPlugin();
    return plugin ? plugin.getGraphSnapshot() : EMPTY_SNAPSHOT;
  });

  useEffect(() => {
    const plugin = getGraphPlugin();

    if (!plugin) {
      console.warn(
        '[useBlocGraph] GraphPlugin not registered. ' +
        'Install @blac/plugin-graph and register it: ' +
        'Blac.plugins.add(new GraphPlugin())'
      );
      return;
    }

    const unsubscribe = plugin.subscribeToGraph((newSnapshot) => {
      setSnapshot(newSnapshot);
    });

    return unsubscribe;
  }, []);

  return snapshot;
}

function getGraphPlugin(): GraphPlugin | null {
  const plugin = Blac.plugins.get('GraphPlugin');
  return plugin as GraphPlugin | null;
}
```

### 5. Hierarchical Layout with D3

**File:** `packages/blac-react/src/components/BlocGraphVisualizer.tsx` (excerpt)

```typescript
import { stratify, tree } from 'd3-hierarchy';
import type { Node, Edge } from '@xyflow/react';
import type { GraphSnapshot } from '@blac/plugin-graph';

function buildHierarchy(snapshot: GraphSnapshot): Node[] {
  // D3-Hierarchy requires flat list with id/parentId
  const flatNodes = snapshot.nodes.map(node => ({
    id: node.id,
    parentId: node.parentId || null,
    data: node,
  }));

  // Build hierarchy
  const root = stratify()
    .id(d => d.id)
    .parentId(d => d.parentId)(flatNodes);

  // Apply tree layout
  const treeLayout = tree<typeof flatNodes[0]>()
    .size([1200, 800])  // Width, Height
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.5));

  const layouted = treeLayout(root);

  // Convert to React Flow nodes
  return layouted.descendants().map(d => ({
    id: d.data.id,
    type: getNodeType(d.data.data.type),
    position: { x: d.x, y: d.y },
    data: {
      ...d.data.data,
      isNew: false,  // Track for animations
      hasChanged: false,  // Track for flash
    },
  }));
}

function getNodeType(type: string): string {
  switch (type) {
    case 'root': return 'rootNode';
    case 'bloc':
    case 'cubit': return 'blocNode';
    case 'state': return 'stateNode';
    default: return 'default';
  }
}
```

---

## Implementation Steps

### Step 1: Create Plugin Package (Day 1)
1. ✅ Create `packages/plugins/system/graph/` directory
2. ✅ Copy `package.json` from `render-logging` as template
3. ✅ Create `src/types.ts` with graph types
4. ✅ Implement `GraphPlugin.ts` (BlacPlugin interface)
5. ✅ Implement `GraphManager.ts` (internal state)
6. ✅ Implement `serializeState.ts`
7. ✅ Add unit tests
8. ✅ Build and verify package compiles

### Step 2: Update React Integration (Day 2)
1. ✅ Update `useBlocGraph()` to use plugin
2. ✅ Add graceful fallback if plugin missing
3. ✅ Update `BlocGraphVisualizer` for hierarchy
4. ✅ Implement D3-Hierarchy layout
5. ✅ Create custom node components (Root, Bloc, State)
6. ✅ Test with playground

### Step 3: Remove Core Graph Code (Day 2-3)
1. ✅ Delete `packages/blac/src/graph/` directory
2. ✅ Remove graph methods from `Blac.ts`:
   - `subscribeToGraph()`
   - `getGraphSnapshot()`
   - `notifyGraphSubscribers()`
   - `instanceToNode()`
   - Private graph state
3. ✅ Update core tests
4. ✅ Verify core builds without graph code

### Step 4: Implement Animations (Day 3-4)
1. ✅ Add CSS animations for node add/remove
2. ✅ Implement flash animation on state change
3. ✅ Add hover tooltips with full JSON
4. ✅ Test animation performance

### Step 5: Documentation & Migration (Day 4-5)
1. ✅ Write `@blac/plugin-graph` README
2. ✅ Write migration guide
3. ✅ Update playground demo
4. ✅ Add examples to docs site
5. ✅ Create changeset for breaking change

---

## Migration Guide for Users

### Before (v2.x)
```typescript
import { Blac } from '@blac/core';
import { useBlocGraph } from '@blac/react';

// Graph functionality built into core
const snapshot = Blac.getGraphSnapshot();

// Hook works automatically
function MyComponent() {
  const graph = useBlocGraph();
  // ...
}
```

### After (v3.0)
```typescript
import { Blac } from '@blac/core';
import { GraphPlugin } from '@blac/plugin-graph';
import { useBlocGraph } from '@blac/react';

// 1. Install plugin
// pnpm add @blac/plugin-graph

// 2. Register plugin (once, at app startup)
Blac.plugins.add(new GraphPlugin({
  throttleInterval: 100,  // Optional
  maxStateDepth: 2,       // Optional
  maxStateStringLength: 100,  // Optional
}));

// 3. Use as before
const plugin = Blac.plugins.get('GraphPlugin');
const snapshot = plugin?.getGraphSnapshot();

function MyComponent() {
  const graph = useBlocGraph();  // Works if plugin registered
  // ...
}
```

**Breaking Changes:**
- ❌ `Blac.subscribeToGraph()` removed → Use plugin
- ❌ `Blac.getGraphSnapshot()` removed → Use plugin
- ❌ Graph types moved from `@blac/core` → `@blac/plugin-graph`
- ✅ `useBlocGraph()` still works (automatically uses plugin)

---

## Testing Strategy

### Unit Tests
- **GraphPlugin:** Lifecycle hooks create/update/remove nodes correctly
- **GraphManager:** Node/edge management logic
- **Serialization:** Circular refs, max depth, special types
- **useBlocGraph:** Subscribes/unsubscribes, handles missing plugin

### Integration Tests
- **Full flow:** Create Bloc → Graph node appears → State change → State node updates → Dispose → Node removed
- **Performance:** 100+ Blocs, throttling works, no memory leaks

### Visual Tests (Manual)
- **Playground demo:** All node types render correctly
- **Animations:** Smooth transitions, flash on change
- **Layout:** Hierarchy is clear, no overlaps
- **Interactions:** Hover tooltips, expandable nodes

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Breaking changes upset users** | High | Clear migration guide, deprecation warnings in v2.x |
| **D3-Hierarchy too complex** | Medium | Fallback to dagre if needed, both APIs similar |
| **Large state serialization blocks UI** | Medium | Enforce 2-level depth, add timeout safeguards |
| **Memory leaks from graph state** | High | WeakSet for circular refs, cleanup on plugin shutdown |
| **Animation performance issues** | Low | CSS animations hardware-accelerated, tested with 100+ nodes |
| **Plugin not registered, silent failure** | Medium | Warnings in console, docs emphasize registration |

---

## Success Metrics

**Before Launch:**
- ✅ All graph code removed from `@blac/core` (verify with grep)
- ✅ Plugin package builds and publishes successfully
- ✅ All tests pass (100% coverage on new code)
- ✅ Playground demo shows hierarchical layout with state nodes
- ✅ No TypeScript errors, strict mode enabled

**After Launch:**
- ✅ No bug reports about memory leaks
- ✅ Performance acceptable with 100+ Blocs
- ✅ Migration guide reduces support requests
- ✅ Community feedback positive on new visualization

---

## Next Steps

1. **Get final approval** on this recommendation
2. **Create GitHub issue** with this spec
3. **Set up plugin package** (Day 1 tasks)
4. **Implement incrementally** following the 5-day plan
5. **Review with team** after Days 2, 4 (checkpoints)
6. **Merge and release** as v3.0.0 (breaking change)

---

**Document Version**: 1.0
**Created**: 2025-10-12
**Status**: Final Recommendation - Ready for Implementation
