# BlaC Graph Visualization Design

## Executive Summary

Based on comprehensive research and codebase analysis, this document defines the optimal graph visualization approach for BlaC Bloc/Cubit instances. The design moves away from artificial hierarchical structures (like a "state" root node) to accurately represent BlaC's multi-instance architecture.

---

## Key Findings from Research

### 1. Multi-Root Graph Requirements

**Research Finding:** Hierarchical layouts (like Dagre) require a single root node, but BlaC has multiple independent Bloc instances with no natural hierarchy.

**Solution:** Use force-directed layout or custom grid arrangement to handle multiple independent root nodes (each Bloc instance is a root).

### 2. React Flow Compound Nodes

**Research Finding:** React Flow supports parent-child node relationships (compound/nested nodes) with `parentId` property, allowing rich nested visualizations.

**Solution:** Each Bloc instance is a compound node that can contain child nodes for state properties, subscriptions, and lifecycle info.

### 3. Layout Algorithm Comparison

| Algorithm | Best For | BlaC Fit |
|-----------|----------|----------|
| **Dagre (Tree)** | Single-root DAGs | ❌ Requires artificial root node |
| **Force-Directed** | Multiple disconnected components | ✅ Handles multiple Bloc instances naturally |
| **ELK (Layered)** | Complex multi-port diagrams | ⚠️ Overkill for BlaC's simpler structure |
| **Custom Grid** | Organized independent nodes | ✅ Clean, predictable layout |

**Recommendation:** **Custom Grid Layout** with optional force-directed clustering for related Blocs.

---

## BlaC Architecture Analysis

### Core Entities

```typescript
// From codebase analysis
Blac (singleton) {
  blocInstanceMap: Map<string, BlocBase>      // Shared/non-isolated
  isolatedBlocMap: Map<Constructor, BlocBase[]> // Isolated instances
  uidRegistry: Map<string, BlocBase>          // All instances by UID
  keepAliveBlocs: Set<BlocBase>               // Persistent instances
}

BlocBase {
  uid: string                    // Unique ID
  _id: BlocInstanceId            // Instance ID
  _name: string                  // Class name
  _state: S                      // Current state
  _subscriptionManager           // Manages consumers/observers
  _lifecycleManager              // ACTIVE, DISPOSING, etc.
  _isolated: boolean             // Shared vs isolated
  _keepAlive: boolean            // Persistence flag
}
```

### Relationships to Visualize

1. **Bloc Instances** → Independent nodes (no parent)
2. **Bloc → State Properties** → Nested within Bloc node
3. **Bloc → Consumers** → Edges showing subscriptions
4. **Bloc ↔ Bloc** → Communication edges (if applicable)
5. **Shared vs Isolated** → Visual grouping/coloring
6. **Lifecycle States** → Color-coded borders

---

## Optimal Graph Structure

### Level 1: Bloc Instance Nodes

**Design:** Each Bloc/Cubit instance is a top-level, compound node.

```
┌─────────────────────────────────────┐
│ CounterCubit                        │ ← Compound Node
│ uid: 91e17237 (isolated)            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ ┌─────────────────────────────────┐ │
│ │ State                           │ │ ← Child: State Display
│ │ { count: 5 }                    │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Lifecycle: ACTIVE               │ │ ← Child: Lifecycle
│ │ Consumers: 2                    │ │
│ │ Keep-Alive: false               │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
         │
         │ (edge)
         ▼
    [Component A]  ← Consumer node
```

### Level 2: Visual Grouping

**Shared Blocs:** Grouped in one visual area (e.g., left side, blue tint)
**Isolated Blocs:** Grouped in another area (e.g., right side, orange tint)

```
┌─── Shared Instances ────────────┐  ┌─── Isolated Instances ─────────┐
│                                  │  │                                  │
│  ○ AppStateCubit                 │  │  ○ CounterCubit:91e17237        │
│  ○ AuthBloc                      │  │  ○ CounterCubit:db4ff2ef        │
│  ○ SettingsCubit                 │  │  ○ TodoBloc:0a192a29            │
│                                  │  │                                  │
└──────────────────────────────────┘  └──────────────────────────────────┘
```

### Level 3: Expandable/Collapsible

**Collapsed View:** Compact node showing essentials
```
┌──────────────────────┐
│ CounterCubit         │
│ count: 5 | 2 ↻       │ (↻ = consumers)
│ [ACTIVE]             │
└──────────────────────┘
```

**Expanded View:** Shows all details
```
┌─────────────────────────────────────┐
│ CounterCubit                        │
│ uid: 91e17237 | Isolated            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ State Properties:                   │
│   • count: 5 (number)               │
│                                     │
│ Lifecycle:                          │
│   • Status: ACTIVE                  │
│   • Consumers: 2                    │
│   • Keep-Alive: false               │
│                                     │
│ Methods:                            │
│   • increment()                     │
│   • decrement()                     │
│   • reset()                         │
└─────────────────────────────────────┘
```

---

## Layout Strategy

### Option A: Custom Grid Layout (Recommended)

**Approach:**
1. Group blocs by type (Shared | Isolated)
2. Within each group, arrange in rows/columns
3. Auto-space based on node size
4. Edges connect to consumers outside the grid

**Pros:**
- ✅ Clean, organized, predictable
- ✅ Easy to scan and find specific blocs
- ✅ Handles many instances well
- ✅ No overlapping nodes

**Cons:**
- ⚠️ Less organic than force-directed
- ⚠️ Doesn't show "clustering" of related blocs

**Implementation:**
```typescript
// Simplified pseudo-code
function gridLayout(blocs: BlocInstance[]) {
  const shared = blocs.filter(b => !b.isolated);
  const isolated = blocs.filter(b => b.isolated);

  const layout = {
    nodes: [
      ...arrangeInGrid(shared, { startX: 50, startY: 50 }),
      ...arrangeInGrid(isolated, { startX: 500, startY: 50 })
    ]
  };

  return layout;
}

function arrangeInGrid(items: BlocInstance[], options: { startX, startY }) {
  const COLS = 3;
  const SPACING_X = 300;
  const SPACING_Y = 200;

  return items.map((item, i) => ({
    id: item.uid,
    position: {
      x: options.startX + (i % COLS) * SPACING_X,
      y: options.startY + Math.floor(i / COLS) * SPACING_Y
    },
    data: item
  }));
}
```

### Option B: Force-Directed with Clustering

**Approach:**
1. All blocs start with repulsion forces
2. Related blocs (same type, communication) attract
3. Shared vs isolated have different "charge" (stronger repulsion between groups)

**Pros:**
- ✅ Organic, visually interesting
- ✅ Shows relationships through proximity
- ✅ Handles Bloc communication well

**Cons:**
- ⚠️ Can be chaotic with many nodes
- ⚠️ Non-deterministic layout
- ⚠️ Harder to find specific blocs

**Use Case:** Better for demos showing Bloc-to-Bloc communication.

### Option C: Hybrid Approach (Best of Both)

**Approach:**
1. **Default:** Grid layout for clarity
2. **Interactive:** User can switch to force-directed
3. **Auto-detect:** If Bloc communication exists, suggest force-directed

**This is the recommended approach.**

---

## Visual Design

### Color Coding System

**Bloc Type:**
```typescript
const BLOC_TYPE_COLORS = {
  cubit: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-500',
    text: 'text-blue-700 dark:text-blue-300'
  },
  bloc: {
    bg: 'bg-purple-50 dark:bg-purple-950/20',
    border: 'border-purple-500',
    text: 'text-purple-700 dark:text-purple-300'
  }
};
```

**Instance Type:**
```typescript
const INSTANCE_TYPE_COLORS = {
  shared: {
    accent: 'border-l-4 border-l-cyan-500',
    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
  },
  isolated: {
    accent: 'border-l-4 border-l-orange-500',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
  }
};
```

**Lifecycle State:**
```typescript
const LIFECYCLE_COLORS = {
  ACTIVE: 'ring-2 ring-green-500 shadow-green-500/50',
  DISPOSAL_REQUESTED: 'ring-2 ring-yellow-500 shadow-yellow-500/50 animate-pulse',
  DISPOSING: 'ring-2 ring-orange-500 shadow-orange-500/50 animate-pulse',
  DISPOSED: 'ring-2 ring-gray-400 opacity-50'
};
```

**Keep-Alive:**
```typescript
const KEEP_ALIVE_INDICATOR = {
  true: '🔒',  // Lock icon or pin
  false: ''
};
```

### Node Anatomy

```tsx
<motion.div
  className={cn(
    // Base styles
    'rounded-lg shadow-lg p-4 min-w-[250px]',

    // Bloc type color
    BLOC_TYPE_COLORS[bloc.type].bg,
    BLOC_TYPE_COLORS[bloc.type].border,

    // Instance type accent
    INSTANCE_TYPE_COLORS[bloc.isShared ? 'shared' : 'isolated'].accent,

    // Lifecycle ring
    LIFECYCLE_COLORS[bloc.lifecycle],
  )}
  initial={{ scale: 0, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
>
  {/* Header */}
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2">
      <span className="font-bold text-sm">{bloc.name}</span>
      {bloc.keepAlive && <span>🔒</span>}
    </div>
    <Badge className={INSTANCE_TYPE_COLORS[bloc.isShared ? 'shared' : 'isolated'].badge}>
      {bloc.isShared ? 'Shared' : 'Isolated'}
    </Badge>
  </div>

  {/* UID */}
  <div className="text-xs text-muted-foreground mb-2">
    uid: {bloc.uid.slice(0, 8)}
  </div>

  {/* Collapsible State */}
  <Collapsible>
    <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium">
      <ChevronRight className={cn("h-4 w-4 transition", isOpen && "rotate-90")} />
      State
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div className="mt-2 p-2 bg-muted/50 rounded font-mono text-xs">
        {renderColoredJSON(bloc.state)}
      </div>
    </CollapsibleContent>
  </Collapsible>

  {/* Footer */}
  <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
    <span className="flex items-center gap-1">
      <Users className="h-3 w-3" />
      {bloc.consumerCount} consumers
    </span>
    <span className={cn(
      'px-2 py-0.5 rounded-full text-[10px] font-medium',
      LIFECYCLE_COLORS[bloc.lifecycle].replace('ring-2', 'bg').split(' ')[0]
    )}>
      {bloc.lifecycle}
    </span>
  </div>
</motion.div>
```

### State Value Color Coding

```typescript
function renderColoredJSON(state: any, depth = 0) {
  const TYPE_COLORS = {
    string: 'text-green-600 dark:text-green-400',
    number: 'text-blue-600 dark:text-blue-400',
    boolean: 'text-purple-600 dark:text-purple-400',
    null: 'text-gray-500 dark:text-gray-400',
    undefined: 'text-gray-500 dark:text-gray-400',
    object: 'text-orange-600 dark:text-orange-400',
  };

  // Recursive rendering with color-coded types
  // ... implementation details ...
}
```

---

## Animation Strategy

### Entry Animations

**New Bloc Created:**
```tsx
<motion.div
  initial={{ scale: 0, rotate: -10, opacity: 0 }}
  animate={{ scale: 1, rotate: 0, opacity: 1 }}
  transition={{ type: 'spring', stiffness: 200 }}
>
```

**Bloc Disposed:**
```tsx
<motion.div
  exit={{ scale: 0, opacity: 0, transition: { duration: 0.3 } }}
>
```

### State Change Pulse

**When state updates:**
```tsx
const [pulse, setPulse] = useState(false);

useEffect(() => {
  setPulse(true);
  const timer = setTimeout(() => setPulse(false), 500);
  return () => clearTimeout(timer);
}, [bloc.state]);

<motion.div
  animate={pulse ? {
    scale: [1, 1.05, 1],
    boxShadow: [
      '0 0 0 0 rgba(59, 130, 246, 0)',
      '0 0 0 10px rgba(59, 130, 246, 0.4)',
      '0 0 0 0 rgba(59, 130, 246, 0)'
    ]
  } : {}}
  transition={{ duration: 0.5 }}
>
```

### Consumer Connection Animation

**Animated edge when subscription happens:**
```tsx
<motion.path
  d={edgePath}
  stroke="#3b82f6"
  strokeWidth={2}
  fill="none"
  initial={{ pathLength: 0, opacity: 0 }}
  animate={{ pathLength: 1, opacity: 1 }}
  transition={{ duration: 0.6, ease: 'easeInOut' }}
/>
```

---

## Integration with BlaC Core

### 1. Registry Subscription API

```typescript
// Add to Blac class
class Blac {
  private graphSubscribers = new Set<GraphUpdateCallback>();

  subscribeToGraph(callback: GraphUpdateCallback): () => void {
    this.graphSubscribers.add(callback);

    // Immediate callback with current state
    callback(this.getGraphSnapshot());

    return () => this.graphSubscribers.delete(callback);
  }

  private notifyGraphSubscribers() {
    const snapshot = this.getGraphSnapshot();
    this.graphSubscribers.forEach(cb => cb(snapshot));
  }

  getGraphSnapshot(): GraphSnapshot {
    return {
      blocs: Array.from(this.uidRegistry.values()).map(bloc => ({
        uid: bloc.uid,
        name: bloc._name,
        id: bloc._id,
        type: bloc instanceof Bloc ? 'bloc' : 'cubit',
        lifecycle: this.getLifecycleState(bloc),
        state: bloc.state,
        isShared: !bloc._isolated,
        keepAlive: bloc._keepAlive,
        consumerCount: bloc.subscriptionCount,
        lastUpdate: bloc.lastUpdate
      })),
      timestamp: Date.now()
    };
  }
}

// Notify on key events
registerBlocInstance(bloc) {
  // ... existing code ...
  this.notifyGraphSubscribers();
}

disposeBloc(bloc) {
  // ... existing code ...
  this.notifyGraphSubscribers();
}
```

### 2. React Hook

```typescript
export function useBlocGraph(): GraphSnapshot {
  const [snapshot, setSnapshot] = useState<GraphSnapshot>(() =>
    Blac.instance.getGraphSnapshot()
  );

  useEffect(() => {
    const unsubscribe = Blac.instance.subscribeToGraph(setSnapshot);
    return unsubscribe;
  }, []);

  return snapshot;
}
```

### 3. Graph Visualizer Component

```tsx
export function BlocGraphVisualizer({
  layout = 'grid',  // 'grid' | 'force' | 'auto'
  showDisposed = false,
  grouping = 'instance-type'  // 'instance-type' | 'bloc-type' | 'none'
}: BlocGraphVisualizerProps) {
  const snapshot = useBlocGraph();
  const [nodes, edges] = useMemo(() =>
    transformToReactFlow(snapshot, { layout, showDisposed, grouping }),
    [snapshot, layout, showDisposed, grouping]
  );

  return (
    <div className="h-[600px] w-full rounded-lg border bg-muted/20">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={{
          blocNode: BlocNode,
          consumerNode: ConsumerNode
        }}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) =>
            node.data.type === 'cubit' ? '#3b82f6' : '#a855f7'
          }
        />
        <Panel position="top-right">
          <LayoutControls
            value={layout}
            onChange={setLayout}
          />
        </Panel>
      </ReactFlow>
    </div>
  );
}
```

---

## Demo Integration Examples

### 1. Instance Management Demo

**Show:**
- Shared instance with multiple consumers
- Create isolated instances on button click
- Watch graph update in real-time
- See disposal when last consumer unmounts

**Layout:** Grid layout (clear organization)

### 2. Lifecycle Demo

**Show:**
- Color transitions through lifecycle states
- Animate disposal sequence
- Highlight keep-alive behavior preventing disposal

**Layout:** Grid layout with focus on single bloc

### 3. Bloc Communication Demo

**Show:**
- Multiple blocs communicating
- Edges showing data flow
- Event propagation animation

**Layout:** Force-directed (shows relationships)

### 4. Props-Based Blocs Demo

**Show:**
- Multiple instances of same class
- Different UIDs and props
- Visual grouping by class

**Layout:** Grid layout grouped by class

---

## Performance Considerations

### Optimization Strategies

1. **Virtualization:** Only render visible nodes when >50 instances
2. **Lazy Loading:** Load graph component on demand
3. **Debounced Updates:** Throttle graph updates to 60fps
4. **Memoization:** Memo-ize node transformations
5. **Code Splitting:** Lazy load React Flow

```tsx
// Lazy load graph
const BlocGraphVisualizer = React.lazy(() =>
  import('./components/BlocGraphVisualizer')
);

// In demo
<Suspense fallback={<GraphSkeleton />}>
  {showGraph && <BlocGraphVisualizer />}
</Suspense>
```

### Bundle Impact

```
react-flow: ~100KB
dagre (optional): ~30KB
Custom grid layout: ~2KB
Total: ~102-132KB (acceptable for feature richness)
```

---

## Comparison: Proposed vs Original Mockup

### Original Mockup Issues

```
state ○──┬─ SharedCounterCubit ○───────────○ count
         ├─ IsolatedCounterCubit:91e17237 ○─○ count
         └─ IsolatedCounterCubit:db4ff2ef ○─○ count
```

**Problems:**
1. ❌ "state" isn't a real entity in BlaC
2. ❌ Implies hierarchical structure that doesn't exist
3. ❌ Doesn't show lifecycle, consumers, or keep-alive
4. ❌ All blocs appear equal when they have different roles
5. ❌ Doesn't show Bloc-to-Bloc relationships

### Proposed Solution

```
Shared Instances              Isolated Instances
┌──────────────────┐         ┌───────────────────────┐
│ SharedCounter    │         │ IsolatedCounter       │
│ [ACTIVE] 🔒      │         │ :91e17237             │
│ count: 5         │         │ [ACTIVE]              │
│ 3 consumers      │         │ count: 1              │
└──────────────────┘         │ 1 consumer            │
         │                   └───────────────────────┘
         ├──→ [ComponentA]            │
         ├──→ [ComponentB]            └──→ [ComponentC]
         └──→ [ComponentC]
```

**Improvements:**
1. ✅ No artificial "state" root
2. ✅ Each Bloc is independent
3. ✅ Lifecycle and metadata visible
4. ✅ Shared vs isolated clearly distinguished
5. ✅ Consumer relationships shown
6. ✅ Keep-alive indicator (🔒)
7. ✅ Scalable to many instances

---

## Conclusion & Recommendations

### Primary Recommendation

**Use Custom Grid Layout with React Flow:**
- Clean, organized, predictable
- Handles multiple independent Blocs naturally
- Expandable nodes show details on demand
- Color-coded for instant recognition
- Animated state changes provide feedback

### Implementation Phases

**Phase 1 (MVP):**
1. ✅ Grid layout with compound nodes
2. ✅ Basic color coding (type, instance, lifecycle)
3. ✅ Real-time updates from Blac registry
4. ✅ Collapsible state display

**Phase 2 (Enhanced):**
1. Consumer edge visualization
2. Force-directed layout option
3. Click node to inspect details
4. Filter/search functionality
5. Export graph as image

**Phase 3 (Advanced):**
1. Event flow animation
2. Time-travel (state history)
3. Performance metrics overlay
4. Bloc-to-Bloc communication visualization
5. DevTools integration

### Bundle Impact

- **Minimal:** 102KB (React Flow only)
- **Acceptable for:** Educational demos and future devtools
- **Can be:** Code-split and lazy-loaded

### Unique Differentiator

**No other state management library visualizes instance lifecycles, subscriptions, and relationships in real-time.** This gives BlaC a massive educational and debugging advantage over Redux, Zustand, Jotai, and MobX.

---

**Document Status**: COMPLETE
**Created**: 2025-10-11
**Based On**: Research findings, BlaC codebase analysis, React Flow capabilities
