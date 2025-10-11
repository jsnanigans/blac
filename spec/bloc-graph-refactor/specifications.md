# Bloc Graph Visualization Refactor - Specifications

## Overview

Refactor the Bloc graph visualization system to move graph concerns out of the core library into a dedicated plugin, and redesign the visualization to use a hierarchical layout with state nodes.

## Problem Statement

### Current Issues

1. **Architectural Concern**: Graph visualization code (~200 lines) is embedded in the core `Blac` class (`Blac.ts:184-1000`), violating single responsibility principle
   - Graph types defined in `packages/blac/src/graph/types.ts`
   - Graph methods in `Blac.ts`: `subscribeToGraph()`, `getGraphSnapshot()`, `notifyGraphSubscribers()`, `instanceToNode()`
   - Subscription management and throttling logic in core

2. **Design Limitation**: Current visualization uses a sparse grid layout with disconnected Bloc nodes
   - No clear hierarchy or relationships visible
   - State values hidden inside node metadata, not visible as separate entities
   - Difficult to understand system structure at a glance
   - No root node to anchor the visualization

## Goals

### Primary Goals

1. **Extract graph concerns to plugin**: Move all graph-related code from `@blac/core` to a new plugin package
2. **Implement hierarchical visualization**: Create a tree-based layout with clear parent-child relationships
3. **Expose state as nodes**: Represent state values as visible nodes in the graph, not just metadata

### Secondary Goals

4. Support visualization of all state types (primitives, objects, arrays, etc.)
5. Maintain real-time updates with throttling
6. Provide filtering and customization options
7. Keep React integration clean and optional

## Requirements

### Functional Requirements

#### FR-1: Plugin Architecture
- **FR-1.1**: Create new plugin package `@blac/plugin-graph` following existing plugin patterns
- **FR-1.2**: Plugin must implement `BlacPlugin` interface with lifecycle hooks
- **FR-1.3**: Plugin subscribes to Bloc lifecycle events: `onBlocCreated`, `onBlocDisposed`, `onStateChanged`
- **FR-1.4**: Plugin maintains internal graph state and notifies subscribers
- **FR-1.5**: Core library provides minimal hook points, no graph-specific logic

#### FR-2: Hierarchical Graph Structure
- **FR-2.1**: Graph must have a single root node representing the `Blac` instance
- **FR-2.2**: Bloc/Cubit instances are children of the root node
- **FR-2.3**: State values are children of their respective Bloc/Cubit nodes
- **FR-2.4**: Edges represent parent-child ownership relationships

**Visual Structure:**
```
Blac (root)
├── CounterBloc
│   └── State: { count: 5 }
├── UserCubit
│   └── State: { user: { id: 1, name: "Alice" } }
├── IsolatedCounterCubit (instance 1)
│   └── State: 10
└── IsolatedCounterCubit (instance 2)
    └── State: 20
```

#### FR-3: Node Types

**FR-3.1: Root Node (Blac)**
- Displays global statistics:
  - Total Bloc/Cubit count
  - Active vs disposed count
  - Total consumers
  - Memory stats (from `Blac.getMemoryStats()`)
- Always visible, never disposed
- Anchor point for layout

**FR-3.2: Bloc/Cubit Nodes**
- Display:
  - Class name (e.g., "CounterBloc")
  - Instance ID
  - Lifecycle state (active, disposal_requested, disposing, disposed)
  - Consumer count
  - Instance pattern (shared, isolated, keepAlive)
- Color-coded by:
  - Type (Bloc vs Cubit)
  - Lifecycle state
  - Instance pattern
- Expandable to show more details

**FR-3.3: State Nodes**
- Display serialized state value
- Support all JavaScript types:
  - Primitives: number, string, boolean, null, undefined
  - Objects: show keys/values, expandable for deep objects
  - Arrays: show length and items preview
  - Dates, Maps, Sets: custom serialization
- Truncate large values with ellipsis
- Expandable for detailed view
- Updates in real-time as state changes

#### FR-4: Layout Algorithm
- **FR-4.1**: Use hierarchical tree layout (not grid)
- **FR-4.2**: Root at top, children arranged below
- **FR-4.3**: Automatic spacing to prevent overlap
- **FR-4.4**: Support for zoom, pan, and fit-to-view
- **FR-4.5**: Compact representation for readability
- **FR-4.6**: Stable layout - minimize rearrangement when nodes are added/removed/changed
- **FR-4.7**: Nodes should maintain relative positions whenever possible
- **FR-4.8**: Predictable ordering (e.g., alphabetical by name, or creation order)

#### FR-5: React Integration
- **FR-5.1**: Update `useBlocGraph()` hook in `@blac/react` to work with plugin
- **FR-5.2**: Hook returns graph snapshot from plugin, not from core
- **FR-5.3**: Optional dependency: graph visualization works only if plugin is registered
- **FR-5.4**: Graceful fallback if plugin not available

#### FR-6: State Serialization
- **FR-6.1**: Support all JavaScript types
- **FR-6.2**: Handle circular references gracefully (mark as "[Circular]")
- **FR-6.3**: Limit depth for deeply nested objects (configurable, default: 5 levels)
- **FR-6.4**: Limit string length (configurable, default: 100 chars)
- **FR-6.5**: Provide custom serializer option for user-defined types

#### FR-7: Visual Feedback & Interactions
- **FR-7.1**: Smooth animations for node additions (fade in + position transition)
- **FR-7.2**: Smooth animations for node removals (fade out)
- **FR-7.3**: Animated position transitions when layout changes (avoid jarring jumps)
- **FR-7.4**: Flash animation on state change:
  - Bloc/Cubit node flashes briefly (e.g., border or background pulse)
  - Specific State node property/key that changed also flashes
  - Duration: ~300-500ms
- **FR-7.5**: Hover interaction on State nodes:
  - Shows tooltip with full JSON.stringify() of exact value
  - No truncation on hover
  - Properly formatted JSON (indented)
- **FR-7.6**: Visual clarity:
  - Clear visual distinction between node types (color, shape, icons)
  - Easy to scan and parse at a glance
  - Consistent visual language

### Non-Functional Requirements

#### NFR-1: Performance
- Throttle graph updates (default: 100ms)
- Efficient diffing for large graphs (100+ nodes)
- No performance impact when plugin not registered

#### NFR-2: Breaking Changes
- **ALLOWED**: Breaking changes to graph API are acceptable
- Remove `Blac.subscribeToGraph()` from core
- Remove `Blac.getGraphSnapshot()` from core
- Remove all graph-related methods from core
- Update `useBlocGraph()` to use plugin

#### NFR-3: Code Organization
- Follow existing monorepo structure
- Plugin in `packages/plugins/system/graph/`
- Follow naming conventions of `@blac/plugin-persistence`
- Comprehensive TypeScript types
- Unit tests for plugin logic

#### NFR-4: Documentation
- README for plugin package
- Migration guide for users of old graph API
- Examples in playground app

## Constraints

### Technical Constraints

1. **Plugin System**: Must use existing `BlacPlugin` interface and `SystemPluginRegistry`
2. **TypeScript**: Strict mode, no `any` types where avoidable
3. **React Flow**: Continue using React Flow library for visualization
4. **Monorepo**: Follow existing pnpm workspace structure with catalog dependencies

### Design Constraints

1. **Separation of Concerns**: Core library must not know about graph visualization
2. **Optional Feature**: Graph visualization is optional, core works without it
3. **Backward Compatibility**: NOT required - breaking changes allowed

## Success Criteria

### Must Have
1. ✅ All graph code removed from `@blac/core`
2. ✅ New `@blac/plugin-graph` package created and functional
3. ✅ Hierarchical layout with Blac root node
4. ✅ State values visible as separate nodes
5. ✅ Real-time updates working
6. ✅ `useBlocGraph()` hook updated and functional
7. ✅ Playground demo updated and working
8. ✅ Animations for node add/remove/change (FR-7.1-7.4)
9. ✅ Flash animation on state change
10. ✅ Hover tooltip with full JSON values (FR-7.5)
11. ✅ Support for all JavaScript types in state nodes (FR-6.1)
12. ✅ Stable layout with minimal rearrangement (FR-4.6-4.8)

### Should Have
1. Expandable nodes for deeply nested state objects
2. Filtering and search capabilities
3. Performance optimization for large graphs (100+ nodes)
4. Custom node renderers for specific Bloc types

### Nice to Have
1. Interactive state editing (for debugging)
2. Time-travel debugging support
3. Export graph as image/JSON
4. Configurable animation durations and styles

## Out of Scope

1. Support for other visualization libraries besides React Flow
2. 3D visualization
3. Graph analytics or metrics beyond basic counts
4. Distributed system visualization (multiple Blac instances)
5. Historical graph snapshots/replay

## Dependencies

### External Dependencies
- React Flow (already in use)
- Existing plugin system in `@blac/core`

### Internal Dependencies
- `@blac/core` (peer dependency)
- `@blac/react` (for hook integration)

## Migration Path

For users currently using the old graph API:

1. Install new plugin: `pnpm add @blac/plugin-graph`
2. Register plugin: `Blac.plugins.add(new GraphPlugin())`
3. Update imports: `useBlocGraph` from `@blac/react` works transparently
4. Remove direct calls to `Blac.subscribeToGraph()` if any

## Design Decisions (Confirmed)

1. ✅ **Plugin Registration**: Explicit registration for user control
   - Users must call `Blac.plugins.add(new GraphPlugin())`
   - Provides explicit control and avoids auto-magic behavior

2. ✅ **State Node Expansion**: Collapsed by default, expandable on click
   - Keeps visual clutter minimal
   - Users can drill down when needed

3. ✅ **Large State Objects**: Show truncated preview, full view on expand
   - Truncation limits configurable (default: 100 chars for strings, 5 levels for depth)
   - Full value always available via hover tooltip or expansion

4. ✅ **Custom Node Renderers**: Yes, via plugin configuration option
   - Allow users to customize visualization for specific Bloc types
   - Maintains flexibility for advanced use cases

5. ✅ **Hierarchical Structure**: Confirmed
   - Blac (root) → Blocs/Cubits → State nodes
   - Clear parent-child relationships

6. ✅ **Layout Behavior**: Compact and stable
   - Minimal rearrangement on changes
   - Smooth animations for all transitions
   - Visual feedback (flash) on state changes

## Acceptance Criteria

The refactor is complete when:

1. All graph-related code is removed from `packages/blac/src/Blac.ts`
2. Graph types moved out of `packages/blac/src/graph/` directory
3. New `@blac/plugin-graph` package builds successfully
4. Playground graph demo shows:
   - Hierarchical layout with Blac root node
   - State nodes as children of Bloc/Cubit nodes
   - Smooth animations for add/remove/change
   - Flash animation on state change (both Bloc and State)
   - Hover tooltip showing full JSON values
   - Stable layout with minimal rearrangement
5. All tests pass (core and plugin)
6. Documentation is updated (README, migration guide)
7. No TypeScript errors
8. Performance is comparable or better than current implementation (100+ nodes)
9. All "Must Have" success criteria are met

---

**Document Version**: 1.1
**Created**: 2025-10-12
**Updated**: 2025-10-12
**Status**: Confirmed - Ready for Research Phase
