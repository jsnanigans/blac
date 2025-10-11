# ADR 001: React Flow for Graph Visualization

**Date**: 2025-10-11
**Status**: ✅ ACCEPTED
**Decision Maker**: Implementation Team
**Phase**: Phase 1 - React Flow Prototype & Validation

## Context

The BlaC playground demos improvement project requires a graph visualization system to display Bloc/Cubit instances, their relationships, lifecycle states, and real-time state updates. This visualization is a core feature that will help users understand:

- Instance patterns (shared, isolated, keep-alive)
- Lifecycle management (active, disposing, disposed)
- Consumer relationships between components and Blocs
- Real-time state changes
- Multiple concurrent instances

### Requirements

**Functional Requirements:**
- Display 20+ nodes simultaneously (typical demo scenario)
- Support up to 50-100 nodes (stress test/complex scenarios)
- Real-time state updates (10+ updates per second)
- Custom node rendering with expandable/collapsible state
- Interactive controls (zoom, pan, minimap)
- Custom layout algorithms (grid layout for instance pattern grouping)
- Color-coded nodes based on type, lifecycle, and instance pattern
- Mobile responsive

**Performance Requirements:**
- Desktop: 60fps minimum during animations and updates
- Mobile: 30fps minimum during animations and updates
- Smooth interactions (zoom, pan, drag)
- Low memory overhead

### Options Considered

1. **React Flow (@xyflow/react)**
   - Pros: Mature library, excellent performance, rich feature set, compound nodes
   - Cons: Additional bundle size (~100-130KB)
   - Bundle Impact: ~103-133KB

2. **Custom SVG Implementation**
   - Pros: Minimal bundle size, full control
   - Cons: Must implement all features from scratch, higher development time
   - Bundle Impact: Minimal

3. **D3.js**
   - Pros: Powerful visualization capabilities
   - Cons: Larger bundle, steeper learning curve, React integration complexity
   - Bundle Impact: ~200KB+

4. **Canvas-based Rendering**
   - Pros: High performance for large graphs
   - Cons: Accessibility challenges, harder to implement interactions
   - Bundle Impact: Custom implementation required

## Decision

**We will use React Flow (@xyflow/react) for graph visualization.**

## Rationale

### Performance Validation Results

A comprehensive prototype was built and tested with the following results:

**✅ All Tests Passed - Amazing Performance**

1. **Initial Load (20 nodes)**: Maintained 60fps
2. **State Updates (10 updates/sec)**: Maintained 60fps
3. **Stress Test (50-100 nodes)**: Performance remained excellent
4. **Zoom/Pan/Minimap**: Smooth interactions throughout
5. **Node Expansion**: No performance degradation
6. **Mobile Responsive**: Passed requirements

### Key Advantages

1. **Proven Performance**: Real-world testing validates it can handle our use case with excellent performance
2. **Rich Feature Set**:
   - Built-in zoom, pan, minimap controls
   - Compound nodes (perfect for expandable state display)
   - Custom node types with React components
   - Edge animations and styling
   - Background grid/dots
3. **Developer Experience**:
   - Excellent React integration (hooks-based API)
   - TypeScript support out of the box
   - Well-documented with many examples
   - Active maintenance and community
4. **Custom Layout Support**: Easy to implement custom grid layout algorithm for instance pattern grouping
5. **Bundle Size Acceptable**: ~103-133KB is within our budget (<150KB target for all new features)

### Trade-offs Accepted

- **Bundle Size**: Adding 103-133KB to the bundle (acceptable within our 150KB budget)
- **Dependency**: Adding external dependency (mitigated by mature, well-maintained library)
- **Learning Curve**: Team needs to learn React Flow API (minimal, excellent docs)

## Implementation Details

### Prototype Components Built

```
apps/playground/src/components/bloc-graph-prototype/
├── BlocGraphPrototype.tsx    # Full prototype with all features
└── index.ts
```

### Features Validated in Prototype

- ✅ 20+ mock Bloc/Cubit nodes
- ✅ Custom grid layout algorithm (grouping by instance pattern)
- ✅ Rapid state updates (10+ updates/second)
- ✅ Compound nodes with expand/collapse
- ✅ Zoom, pan, minimap controls
- ✅ Color-coding by type, lifecycle, instance pattern
- ✅ FPS monitoring
- ✅ Configurable node count and update rate
- ✅ Edge rendering for relationships

### Production Implementation Plan

Phase 2 will build on this prototype to create:

1. **BlocGraphVisualizer Component**: Production-ready component
2. **Blac Integration**: Graph subscription API in `@blac/core`
3. **Custom Node Components**: BlocNode, CubitNode with full styling
4. **Layout Algorithms**: Grid layout (primary), force layout (optional)
5. **useBlocGraph Hook**: React hook for subscribing to graph updates

## Consequences

### Positive

- ✅ **Fast Implementation**: Can reuse prototype code, accelerates Phase 2 development
- ✅ **Excellent UX**: Smooth, interactive graph visualization enhances learning experience
- ✅ **Scalable**: Handles stress tests with ease, room for growth
- ✅ **Maintainable**: Well-supported library reduces long-term maintenance burden
- ✅ **Accessible**: React Flow has good accessibility support built-in

### Negative

- ⚠️ **Bundle Size**: Adds 103-133KB to bundle (but within acceptable limits)
- ⚠️ **External Dependency**: Relying on third-party library (mitigated by maturity)

### Neutral

- React Flow is specifically designed for this use case, no significant compromises needed

## Alternatives Not Chosen

### Custom SVG Implementation
**Rejected because**: Would require 2-3 weeks to build equivalent functionality, high risk of performance issues, ongoing maintenance burden. React Flow prototype proved we don't need custom implementation.

### D3.js
**Rejected because**: Larger bundle size (~200KB+), more complex React integration, steeper learning curve. React Flow provides better DX for React applications.

### Canvas-based Rendering
**Rejected because**: Accessibility challenges, harder to implement compound nodes and interactions. React Flow's DOM-based approach works perfectly for our needs.

## Validation & Acceptance Criteria

- ✅ Desktop Chrome: Maintains 60fps
- ✅ Mobile Safari: Maintains 30fps minimum
- ✅ Handles 50+ nodes (stress test)
- ✅ Smooth zoom, pan, minimap controls
- ✅ Custom node rendering works
- ✅ Real-time updates perform well
- ✅ Bundle size under 150KB

## Next Steps

1. ✅ **Phase 1 Complete**: Prototype validated, decision documented
2. **Phase 2**: Build production BlocGraphVisualizer component
   - Add graph subscription API to `@blac/core`
   - Create custom BlocNode and CubitNode components
   - Implement grid and force layout algorithms
   - Create useBlocGraph hook
   - Write integration tests
3. **Phase 3**: Integrate into reference demo (simple-counter)

## References

- React Flow Documentation: https://reactflow.dev/
- Prototype Implementation: `apps/playground/src/components/bloc-graph-prototype/`
- Test Page: http://localhost:3003/prototype-test
- Plan Document: `spec/playground-demos-improvement/plan.md`

---

**Decision Status**: ✅ ACCEPTED
**Last Updated**: 2025-10-11
**Review Date**: Post Phase 2 implementation
