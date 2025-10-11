# Bloc Graph Visualization Refactor - Implementation Plan

## Overview

**Objective:** Extract graph visualization from `@blac/core` into `@blac/plugin-graph` plugin, redesign with hierarchical layout (Blac → Blocs → State nodes), implement animations, and update React integration.

**Approach:** Option 1 - Clean Break (87% score, Council recommended)

**Timeline:** 3-5 days

**Breaking Changes:** Yes (explicitly allowed per specifications)

---

## Phase 1: Plugin Package Foundation

**Goal:** Create new `@blac/plugin-graph` package with core functionality

### Tasks

- [ ] #S:s Create plugin package directory structure
  - Create `packages/plugins/system/graph/` directory
  - Copy `package.json` from `packages/plugins/system/render-logging/` as template
  - Update package name to `@blac/plugin-graph`
  - Update dependencies (add `@blac/core` as peer dependency)
  - Create `tsconfig.json` and `tsconfig.build.json`
  - Create `vitest.config.ts` for testing
  - Add workspace reference in root `pnpm-workspace.yaml` (if needed)

- [ ] #P #S:m Define graph type system
  - Create `src/types.ts` with all type definitions
  - Define `GraphNodeType` union: `'root' | 'bloc' | 'cubit' | 'state'`
  - Define node interfaces: `RootGraphNode`, `BlocGraphNode`, `StateGraphNode`
  - Define `GraphEdge` interface for parent-child relationships
  - Define `GraphSnapshot` interface
  - Define `GraphUpdateCallback` type
  - Add JSDoc comments for all exported types

- [ ] #P #S:m Implement state serialization utilities
  - Create `src/serialization/serializeState.ts`
  - Implement `serializeWithCircularRefs()` using WeakSet
  - Handle special types: Date, Map, Set, BigInt, Symbol, Function
  - Implement depth limiting (maxDepth: 2 default)
  - Implement string truncation (maxLength: 100 default)
  - Create `src/serialization/analyzeValue.ts`
  - Implement `analyzeStateValue()` to extract metadata (type, isExpandable, childCount)
  - Export serialization config interface

- [ ] #S:l Implement GraphManager (internal graph state)
  - Create `src/graph/GraphManager.ts`
  - Implement root node creation (`createRootNode()`)
  - Implement Bloc node management: `addBlocNode()`, `removeBlocNode()`
  - Implement State node management: `addStateNode()`, `updateStateNode()`, `removeStateNode()`
  - Maintain internal Maps: `blocNodes`, `stateNodes`, `edges`
  - Implement `getSnapshot()` to export current graph state
  - Add atomic updates (parent before children, remove children with parent)
  - Implement node change detection for flash animations

- [ ] #S:l Implement GraphPlugin (BlacPlugin interface)
  - Create `src/GraphPlugin.ts`
  - Implement `BlacPlugin` interface with metadata (name, version, capabilities)
  - Add constructor with `GraphPluginConfig` (throttleInterval, maxStateDepth, maxStateStringLength)
  - Implement lifecycle hooks:
    - `afterBootstrap()`: Create root node
    - `onBlocCreated()`: Add Bloc + State nodes
    - `onBlocDisposed()`: Remove Bloc + State nodes atomically
    - `onStateChanged()`: Update State node, mark as changed
  - Implement subscription management:
    - `subscribeToGraph(callback)`: Add subscriber, send initial snapshot, return unsubscribe function
    - `getGraphSnapshot()`: Return current snapshot
  - Implement throttled notification system:
    - Private `notifySubscribers()` with 100ms throttle (configurable)
    - Use `setTimeout` pattern (like old implementation)
    - Error handling for subscriber callbacks

- [ ] #S:m Create plugin exports and index
  - Create `src/index.ts`
  - Export `GraphPlugin` as default and named export
  - Export all types from `types.ts`
  - Export serialization utilities
  - Add package README.md with usage examples

- [ ] #S:s Build and verify plugin package
  - Run `pnpm build` in plugin directory
  - Verify `dist/` output contains types and compiled JS
  - Check for TypeScript errors
  - Verify peer dependency resolution

---

## Phase 2: Plugin Testing

**Goal:** Comprehensive test coverage for plugin functionality

### Tasks

- [ ] #P #S:m Unit tests for state serialization
  - Create `src/__tests__/serialization.test.ts`
  - Test primitive types (number, string, boolean, null, undefined)
  - Test circular reference detection (should return "[Circular]")
  - Test depth limiting (should return "[Max Depth]" beyond limit)
  - Test special types (Date, Map, Set, BigInt, Symbol, Function)
  - Test string truncation
  - Test complex nested objects (arrays, mixed structures)

- [ ] #P #S:m Unit tests for GraphManager
  - Create `src/__tests__/GraphManager.test.ts`
  - Test root node creation
  - Test Bloc node add/remove
  - Test State node add/update/remove
  - Test edge creation (parent-child relationships)
  - Test snapshot generation
  - Test atomic removal (Bloc + State removed together)
  - Test node change detection

- [ ] #S:l Unit tests for GraphPlugin
  - Create `src/__tests__/GraphPlugin.test.ts`
  - Test plugin lifecycle hooks:
    - `afterBootstrap()` creates root node
    - `onBlocCreated()` adds Bloc + State nodes
    - `onBlocDisposed()` removes nodes atomically
    - `onStateChanged()` updates State node
  - Test subscription management:
    - Subscribe sends initial snapshot
    - Unsubscribe stops notifications
    - Multiple subscribers all notified
  - Test throttling behavior:
    - Multiple rapid updates only trigger one notification
    - Notification happens after throttle interval
  - Test error handling in subscriber callbacks

- [ ] #S:m Integration test: Full lifecycle flow
  - Create `src/__tests__/integration.test.ts`
  - Mock `@blac/core` plugin system
  - Test full flow: Register plugin → Create Bloc → State change → Dispose
  - Verify graph updates at each step
  - Test with multiple Blocs (shared, isolated patterns)
  - Test performance with 100+ Bloc instances

- [ ] #S:s Run tests and verify coverage
  - Run `pnpm test` in plugin directory
  - Verify all tests pass
  - Check coverage report (target: 90%+ for new code)
  - Fix any failing tests

---

## Phase 3: Core Library Cleanup

**Goal:** Remove all graph code from `@blac/core` (breaking changes)

### Tasks

- [ ] #S:m Remove graph methods from Blac.ts
  - Open `packages/blac/src/Blac.ts`
  - Remove `subscribeToGraph()` method
  - Remove `getGraphSnapshot()` method
  - Remove `notifyGraphSubscribers()` method
  - Remove `instanceToNode()` method
  - Remove `setGraphThrottleInterval()` method
  - Remove private properties:
    - `graphSubscribers`
    - `graphUpdateThrottle`
    - `graphThrottleInterval`
    - `graphUpdatePending`
  - Remove graph-related imports

- [ ] #S:s Delete graph types directory
  - Delete `packages/blac/src/graph/` directory entirely
  - Verify no imports reference `./graph/` path
  - Update `src/index.ts` if graph types were exported

- [ ] #S:m Update core package exports
  - Review `packages/blac/src/index.ts`
  - Remove any graph type exports
  - Verify core builds without graph code: `cd packages/blac && pnpm build`

- [ ] #S:m Update core tests
  - Search for tests that use graph methods: `grep -r "subscribeToGraph\|getGraphSnapshot" packages/blac/src/__tests__/`
  - Remove or update tests that relied on graph functionality
  - Run core tests: `cd packages/blac && pnpm test`
  - Fix any breaking test failures

- [ ] #S:s Verify core package builds and tests pass
  - Run `pnpm build` in `packages/blac/`
  - Run `pnpm test` in `packages/blac/`
  - Run `pnpm typecheck` in `packages/blac/`
  - Ensure no graph-related code remains (grep verification)

---

## Phase 4: React Integration Updates

**Goal:** Update `@blac/react` to use plugin, maintain backward compatibility where possible

### Tasks

- [ ] #S:m Update useBlocGraph hook
  - Open `packages/blac-react/src/useBlocGraph.ts`
  - Import types from `@blac/plugin-graph` (peer dependency)
  - Implement `getGraphPlugin()` helper to retrieve plugin from `Blac.plugins`
  - Update hook to call `plugin.subscribeToGraph()`
  - Add graceful fallback: Return empty snapshot if plugin not registered
  - Add console warning if plugin missing (with migration instructions)
  - Update JSDoc with plugin registration requirement
  - Add `@blac/plugin-graph` as peer dependency in package.json

- [ ] #S:l Update BlocGraphVisualizer component
  - Open `apps/playground/src/components/bloc-graph/BlocGraphVisualizer.tsx`
  - Update to handle new node types: `root`, `bloc`, `cubit`, `state`
  - Install D3-Hierarchy: `pnpm add d3-hierarchy d3-shape --filter playground`
  - Implement hierarchical layout builder:
    - Import `stratify`, `tree` from `d3-hierarchy`
    - Convert GraphSnapshot to D3 hierarchy format
    - Apply tree layout with proper sizing and separation
    - Convert back to React Flow node format
  - Update node/edge state management for animation support
  - Track added/removed/changed nodes for animations

- [ ] #P #S:m Create custom Root node component
  - Create `apps/playground/src/components/bloc-graph/nodes/RootNode.tsx`
  - Display Blac global statistics:
    - Total Bloc/Cubit count
    - Active vs disposed count
    - Total consumers
    - Memory stats
  - Style distinctly (larger, different color, icon)
  - Add hover tooltip with detailed stats

- [ ] #P #S:m Create custom Bloc/Cubit node component
  - Update `apps/playground/src/components/bloc-graph/nodes/BlocGraphNode.tsx`
  - Display: Class name, instance ID, lifecycle state, consumer count
  - Color-code by:
    - Type (Bloc vs Cubit)
    - Lifecycle state (active, disposal_requested, disposing, disposed)
    - Instance pattern (shared, isolated, keepAlive)
  - Add expand/collapse functionality
  - Add icons for type and pattern

- [ ] #P #S:m Create custom State node component
  - Create `apps/playground/src/components/bloc-graph/nodes/StateNode.tsx`
  - Display truncated state value (`displayValue`)
  - Show value type indicator (object, array, string, etc)
  - Add hover tooltip with full JSON (`fullValue`):
    - Use proper JSON formatting (indented, readable)
    - Position tooltip intelligently (avoid overflow)
  - Style based on value type
  - Add expand functionality for complex objects

- [ ] #S:s Register custom node types with React Flow
  - In `BlocGraphVisualizer.tsx`, create `nodeTypes` object:
    - `rootNode`: RootNode component
    - `blocNode`: BlocGraphNode component
    - `stateNode`: StateNode component
  - Pass to React Flow via `nodeTypes` prop

- [ ] #S:s Update graph layout utilities
  - Update or replace `apps/playground/src/components/bloc-graph/layouts/gridLayout.ts`
  - Rename to `hierarchicalLayout.ts` or similar
  - Implement D3-based layout calculation
  - Export layout function for use in visualizer
  - Handle edge cases (empty graph, single node, very large graphs)

---

## Phase 5: Animation Implementation

**Goal:** Smooth animations for add/remove/change/flash, stable layout

### Tasks

- [ ] #P #S:m Implement node add/remove animations (CSS)
  - Create CSS animations in visualizer stylesheet
  - Define `@keyframes fadeIn` for new nodes:
    - Animate opacity 0 → 1
    - Animate scale 0.95 → 1
    - Duration: 300ms
  - Define `@keyframes fadeOut` for removed nodes:
    - Animate opacity 1 → 0
    - Animate scale 1 → 0.95
    - Duration: 300ms
  - Apply animations conditionally based on node data flags

- [ ] #P #S:m Implement flash animation on state change
  - Define `@keyframes flash` animation:
    - Animate border color and box-shadow
    - Peak at 50% with highlighted color (e.g., amber-500)
    - Return to normal at 100%
    - Duration: 400ms
  - Apply to Bloc/Cubit nodes when `hasChanged` flag is true
  - Apply to State nodes when state value changes
  - Clear `hasChanged` flag after animation completes

- [ ] #S:m Implement position transition animations
  - React Flow auto-animates position changes if using `useNodesState`
  - Verify smooth transitions when layout recalculates
  - Adjust transition timing if needed (CSS: `transition: transform 300ms ease-in-out`)

- [ ] #S:m Implement change detection and flagging
  - In visualizer, detect which nodes changed between updates:
    - Track previous snapshot
    - Compare with new snapshot
    - Identify added/removed/changed nodes
  - Set flags on node data:
    - `isNew: true` for added nodes
    - `hasChanged: true` for changed nodes
  - Trigger animations based on flags
  - Clear flags after animation duration

- [ ] #S:s Add hover tooltip implementation
  - Use Tippy.js or custom tooltip component
  - On hover over State node, show full JSON value
  - Format JSON with `JSON.stringify(value, null, 2)`
  - Style tooltip for readability (monospace font, dark background)
  - Add boundary detection (keep tooltip in viewport)

- [ ] #S:m Test animations with playground
  - Create/dispose Blocs rapidly
  - Change state frequently
  - Verify animations are smooth, not jarring
  - Test with 10, 50, 100+ nodes
  - Verify no performance degradation
  - Adjust timing/easing if needed

---

## Phase 6: Playground Demo Update

**Goal:** Update playground to showcase new graph visualization

### Tasks

- [ ] #S:m Register GraphPlugin in playground
  - Open `apps/playground/src/App.tsx` or main entry
  - Import `GraphPlugin` from `@blac/plugin-graph`
  - Register plugin: `Blac.plugins.add(new GraphPlugin())`
  - Add configuration options (optional):
    - `throttleInterval: 100`
    - `maxStateDepth: 2`
    - `maxStateStringLength: 100`

- [ ] #S:m Update graph demo page
  - Open `apps/playground/src/pages/graph-test.tsx`
  - Update to use new `BlocGraphVisualizer`
  - Remove old grid layout references
  - Add controls for testing:
    - Create Bloc/Cubit buttons
    - Change state buttons
    - Dispose Bloc buttons
  - Add demo Blocs with various state types:
    - Primitive state (counter)
    - Object state (user profile)
    - Array state (todo list)
    - Nested state (complex form)

- [ ] #S:s Test all graph features interactively
  - Launch playground: `cd apps/playground && pnpm dev`
  - Open graph demo page
  - Test node creation (verify fade-in animation)
  - Test state changes (verify flash animation)
  - Test node disposal (verify fade-out animation)
  - Test hover tooltips (verify full JSON display)
  - Test with isolated Blocs (multiple instances)
  - Test with large state objects (verify truncation)
  - Test layout with many nodes (10, 50, 100+)

- [ ] #S:s Visual regression testing (manual)
  - Verify hierarchical structure is clear
  - Verify no overlapping nodes
  - Verify edges are visible and correct
  - Verify colors are distinct and meaningful
  - Verify animations are smooth and not distracting
  - Verify hover states work correctly
  - Test in different browsers (Chrome, Firefox, Safari)

---

## Phase 7: Documentation and Migration Guide

**Goal:** Help users migrate from v2.x to v3.0, document new plugin

### Tasks

- [ ] #S:m Write plugin README
  - Create `packages/plugins/system/graph/README.md`
  - Document installation: `pnpm add @blac/plugin-graph`
  - Document registration and configuration
  - Document API methods: `subscribeToGraph()`, `getGraphSnapshot()`
  - Document configuration options with defaults
  - Add usage examples (basic and advanced)
  - Document node types and structure
  - Add TypeScript usage examples

- [ ] #S:m Write migration guide
  - Create `spec/bloc-graph-refactor/MIGRATION.md`
  - Document breaking changes:
    - `Blac.subscribeToGraph()` removed
    - `Blac.getGraphSnapshot()` removed
    - Graph types moved from `@blac/core` to `@blac/plugin-graph`
  - Provide before/after code examples
  - Document required changes for existing users:
    - Install plugin package
    - Register plugin
    - Update imports
  - Add troubleshooting section (plugin not registered, etc)

- [ ] #S:m Update main documentation site
  - Update relevant pages in `apps/docs/`
  - Add plugin documentation page
  - Update architecture diagrams (if any)
  - Update getting-started guide with plugin registration
  - Add graph visualization tutorial

- [ ] #S:s Create example projects
  - Add graph visualization example to `apps/docs/examples/`
  - Show basic setup with plugin
  - Show custom styling and configuration
  - Show integration with React Flow features

- [ ] #S:s Write changeset for release
  - Run `pnpm changeset` in repo root
  - Select major version bump (breaking change)
  - Document all breaking changes
  - Document new features
  - Reference migration guide
  - List affected packages: `@blac/core`, `@blac/react`, `@blac/plugin-graph`

---

## Phase 8: Testing and Quality Assurance

**Goal:** Comprehensive testing before release

### Tasks

- [ ] #S:m Run full test suite
  - Root: `pnpm test`
  - Core: `cd packages/blac && pnpm test`
  - React: `cd packages/blac-react && pnpm test`
  - Plugin: `cd packages/plugins/system/graph && pnpm test`
  - Fix any failing tests

- [ ] #S:m Run type checking
  - Root: `pnpm typecheck`
  - Verify no TypeScript errors in any package
  - Fix type errors if found

- [ ] #S:m Run linting
  - Root: `pnpm lint`
  - Fix any linting errors
  - Run `pnpm lint:fix` for auto-fixable issues

- [ ] #S:s Build all packages
  - Root: `pnpm build`
  - Verify all packages build successfully
  - Check `dist/` outputs are correct
  - Verify no build warnings

- [ ] #S:m Performance testing
  - Create performance test script
  - Test graph with 100+ Bloc instances
  - Measure update latency (should be <100ms)
  - Measure memory usage (check for leaks)
  - Verify throttling works correctly
  - Profile serialization performance with large states

- [ ] #S:m Manual testing checklist
  - [ ] Plugin registration works
  - [ ] Hook returns empty snapshot if plugin not registered
  - [ ] Console warning appears if plugin missing
  - [ ] Root node appears after plugin bootstrap
  - [ ] Bloc nodes appear on Bloc creation
  - [ ] State nodes appear and update on state changes
  - [ ] Nodes removed on Bloc disposal
  - [ ] Hierarchical layout is correct
  - [ ] Animations are smooth
  - [ ] Flash animation triggers on state change
  - [ ] Hover tooltips show full JSON
  - [ ] Large state objects are truncated
  - [ ] Circular references handled (no infinite loops)
  - [ ] Layout stable with minimal rearrangement
  - [ ] Works with shared Blocs
  - [ ] Works with isolated Blocs
  - [ ] Works with keepAlive Blocs

---

## Phase 9: Release Preparation

**Goal:** Publish new version with breaking changes

### Tasks

- [ ] #S:s Review changeset
  - Verify changeset describes all breaking changes
  - Verify migration guide is linked
  - Verify all affected packages are listed

- [ ] #S:s Update version numbers (via changeset)
  - Run `pnpm changeset version`
  - Review version bumps (should be major for `@blac/core`, `@blac/react`)
  - Review generated CHANGELOG.md files
  - Commit version changes

- [ ] #S:m Final pre-release checks
  - Verify all tests pass: `pnpm test`
  - Verify all types are correct: `pnpm typecheck`
  - Verify all packages build: `pnpm build`
  - Verify no uncommitted changes
  - Verify migration guide is complete
  - Verify documentation is updated

- [ ] #S:s Publish to npm
  - Run `pnpm release` (builds, tests, and publishes)
  - OR manually: `pnpm publish -r` (recursive publish)
  - Verify packages published to npm:
    - `@blac/core@3.0.0`
    - `@blac/react@3.0.0`
    - `@blac/plugin-graph@1.0.0`
  - Tag release in git: `git tag v3.0.0 && git push --tags`

- [ ] #S:s Post-release communication
  - Announce release on GitHub (create Release)
  - Update README.md with new version
  - Post migration guide link
  - Monitor for issues/bug reports

---

## Risk Mitigation

| Risk | Mitigation Strategy |
|------|---------------------|
| **Breaking changes upset users** | Clear migration guide, console warnings, changeset documentation |
| **D3-Hierarchy too complex** | Keep dagre as fallback option, both have similar APIs |
| **Large state serialization blocks UI** | Enforce 2-level depth, add timeout safeguards, test with large objects |
| **Memory leaks from graph state** | WeakSet for circular refs, thorough cleanup on disposal, test for leaks |
| **Animation performance issues** | CSS animations (hardware-accelerated), test with 100+ nodes, adjustable timing |
| **Plugin not registered, silent failure** | Console warnings, docs emphasize registration, graceful fallback |
| **Layout thrashing with many changes** | Throttle updates (100ms), batch layout recalculations, use stable sort order |

---

## Success Criteria

### Phase 1-3 (Plugin + Core Cleanup)
- [ ] ✅ All graph code removed from `@blac/core` (verify with grep)
- [ ] ✅ Plugin package builds successfully
- [ ] ✅ All plugin tests pass (90%+ coverage)
- [ ] ✅ Core tests pass without graph code
- [ ] ✅ No TypeScript errors in core or plugin

### Phase 4-6 (React + Playground)
- [ ] ✅ `useBlocGraph()` uses plugin, fallback works
- [ ] ✅ Hierarchical layout renders correctly
- [ ] ✅ All node types render (root, bloc, state)
- [ ] ✅ Playground demo functional
- [ ] ✅ Animations are smooth and non-intrusive

### Phase 7-9 (Docs + Release)
- [ ] ✅ Migration guide complete
- [ ] ✅ Plugin README comprehensive
- [ ] ✅ All tests pass (core, react, plugin)
- [ ] ✅ Performance acceptable (100+ nodes, <100ms updates)
- [ ] ✅ Packages published to npm

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Plugin Foundation | 1 day | None |
| Phase 2: Plugin Testing | 0.5 days | Phase 1 |
| Phase 3: Core Cleanup | 0.5 days | Phase 1 (can run parallel) |
| Phase 4: React Integration | 1 day | Phase 1, 3 |
| Phase 5: Animations | 0.5 days | Phase 4 |
| Phase 6: Playground Demo | 0.5 days | Phase 4, 5 |
| Phase 7: Documentation | 0.5 days | Phase 1-6 (can run parallel) |
| Phase 8: Testing & QA | 0.5 days | Phase 1-7 |
| Phase 9: Release | 0.5 days | Phase 8 |
| **Total** | **5 days** | Sequential dependencies considered |

**Parallelization Opportunities:**
- Phase 2 and 3 can run concurrently
- Phase 7 can start once APIs are stable (after Phase 4)
- Tasks marked with `#P` within phases can be parallelized

---

## Notes for Implementation

### Architecture Decisions
- **Option 1 (Clean Break)** confirmed by Council consensus (87% score)
- **D3-Hierarchy** for layout (confirmed by user in discussion phase)
- **2-level depth** for state serialization (confirmed by user)
- **100ms throttle** maintained from current implementation
- **WeakSet** for circular reference detection (research recommendation)

### Key Requirements from Specifications
- FR-4.6-4.8: Stable layout with minimal rearrangement (critical for UX)
- FR-7.1-7.5: Comprehensive animations (add/remove/change/flash/hover)
- FR-6.1-6.5: Support all JavaScript types in serialization
- NFR-1: Performance with 100+ nodes
- NFR-2: Breaking changes allowed

### Council Feedback (from discussion.md)
- **Butler Lampson**: Do it right the first time (Option 1)
- **Barbara Liskov**: Handle missing plugin gracefully
- **Nancy Leveson**: Add safeguards for large state serialization
- **Alan Kay**: Don't ship half a solution (full features from start)
- **Martin Kleppmann**: Ensure atomic updates (parent before children)
- **Don Norman**: Flash animations critical for usability

---

**Document Version**: 1.0
**Created**: 2025-10-12
**Status**: Ready for Implementation
**Estimated Completion**: 5 days (assuming full-time work)
