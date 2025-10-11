# Bloc Graph Visualization Refactor - Discussion

## Executive Summary

**Goal:** Extract graph visualization from `@blac/core` into `@blac/plugin-graph`, redesign with hierarchical layout showing Blac root → Blocs → State nodes.

**Key Requirements:**
- ✅ Plugin architecture using `BlacPlugin` interface
- ✅ Hierarchical tree layout with D3-Hierarchy
- ✅ State nodes visible with serialization (depth: 2 levels)
- ✅ Smooth animations (add/remove/change/flash)
- ✅ Stable layout, minimal rearrangement
- ✅ Breaking changes allowed

---

## Important Considerations

### Architectural
- **Separation of Concerns:** Core library must remain focused on state management, not visualization
- **Plugin Independence:** Graph plugin should work without React (types/data), visualization in React component
- **Performance:** Real-time updates for 100+ Bloc instances without lag
- **Type Safety:** Strict TypeScript, avoid `any` types

### User Experience
- **Visual Clarity:** Easy to scan, understand system structure at a glance
- **Stability:** Minimize visual disruption when nodes change
- **Feedback:** Clear indicators of state changes (flash animations)
- **Discoverability:** Hover tooltips, expandable nodes for details

### Common Mistakes to Avoid
- ❌ Tight coupling between plugin and core (makes plugin optional)
- ❌ Over-animating (causes visual chaos, performance issues)
- ❌ Synchronous serialization of large objects (blocks UI)
- ❌ Memory leaks from circular references in graph state
- ❌ Layout thrashing (recalculating layout on every state change)

---

## Implementation Options

### Option 1: Clean Break (Recommended)

**Approach:** Remove all graph code from core immediately, plugin is only source of graph data.

**Architecture:**
```
@blac/core
├── No graph code
└── Plugin hooks: onBlocCreated, onBlocDisposed, onStateChanged

@blac/plugin-graph
├── GraphPlugin (BlacPlugin implementation)
├── Graph types (nodes, edges, snapshot)
├── State serialization
├── Internal graph state management
└── Subscriber notifications

@blac/react
├── useBlocGraph() hook (uses plugin)
└── BlocGraphVisualizer component (React Flow + D3-Hierarchy)
```

**Node Structure:**
- **Root Node:** Blac instance (global stats)
- **Bloc Nodes:** Bloc/Cubit instances (lifecycle, consumers)
- **State Nodes:** Serialized state values (depth: 2)

**Layout:** D3-Hierarchy tree layout with custom positioning

**Serialization:** Custom implementation with WeakSet for circular refs

**Animations:** Full implementation (fade in/out, position transitions, flash on change)

**Pros:**
- ✅ Clean architecture, clear separation
- ✅ Core library stays focused
- ✅ Plugin is truly optional
- ✅ Easier to maintain long-term

**Cons:**
- ⚠️ Breaking change (but allowed per specs)
- ⚠️ Migration required for existing users
- ⚠️ More upfront work

**Scoring:**
| Category | Score | Notes |
|----------|-------|-------|
| Architecture | 10/10 | Perfect separation of concerns |
| Maintainability | 10/10 | Clear ownership, easy to extend |
| Performance | 9/10 | Efficient, plugin overhead minimal |
| User Experience | 10/10 | Full feature set, all animations |
| Migration Complexity | 6/10 | Breaking change, docs needed |
| Implementation Time | 7/10 | ~3-5 days for full implementation |
| **TOTAL** | **52/60** | **87%** |

---

### Option 2: Phased Migration

**Approach:** Keep deprecated wrappers in core initially, gradual migration over 2-3 releases.

**Phase 1:** Create plugin, auto-register in core, old methods delegate to plugin
**Phase 2:** Deprecate old methods, update docs
**Phase 3:** Remove old methods (breaking change)

**Pros:**
- ✅ No immediate breaking changes
- ✅ Gradual user migration
- ✅ Can rollback if issues

**Cons:**
- ⚠️ Temporary complexity in core
- ⚠️ More code to maintain during transition
- ⚠️ Users might not migrate proactively

**Scoring:**
| Category | Score | Notes |
|----------|-------|-------|
| Architecture | 7/10 | Temporary coupling during migration |
| Maintainability | 6/10 | Dual codepaths during transition |
| Performance | 9/10 | Minimal overhead with delegation |
| User Experience | 9/10 | Smooth migration experience |
| Migration Complexity | 9/10 | No immediate breaking changes |
| Implementation Time | 5/10 | More work (3 phases) |
| **TOTAL** | **45/60** | **75%** |

---

### Option 3: Minimal Plugin (Hybrid)

**Approach:** Keep graph types in core, only move subscription logic to plugin.

**Architecture:**
```
@blac/core
├── Graph types (GraphSnapshot, BlocGraphNode, etc.)
└── Plugin hooks

@blac/plugin-graph
├── GraphPlugin (minimal, just subscription management)
└── Graph building logic

@blac/react
├── useBlocGraph()
└── BlocGraphVisualizer
```

**Pros:**
- ✅ Types remain accessible without plugin
- ✅ Smaller plugin package
- ✅ Less code movement

**Cons:**
- ⚠️ Still couples visualization concepts to core
- ⚠️ Not truly optional (types always present)
- ⚠️ Violates "clean separation" principle

**Scoring:**
| Category | Score | Notes |
|----------|-------|-------|
| Architecture | 6/10 | Still some coupling |
| Maintainability | 7/10 | Split responsibility |
| Performance | 9/10 | Efficient |
| User Experience | 9/10 | Full features |
| Migration Complexity | 8/10 | Moderate breaking changes |
| Implementation Time | 8/10 | Less refactoring needed |
| **TOTAL** | **47/60** | **78%** |

---

### Option 4: Simplified Start (MVP)

**Approach:** Implement plugin with basic features first, add complexity later.

**Initial Features:**
- Plugin with Root + Bloc nodes only (no State nodes initially)
- Simple tree layout (dagre, not d3)
- Basic serialization (JSON.stringify with try-catch)
- Minimal animations (position transitions only)

**Later Additions:**
- State nodes (phase 2)
- D3-Hierarchy layout (phase 2)
- Advanced serialization (phase 2)
- Full animations (phase 3)

**Pros:**
- ✅ Faster initial delivery
- ✅ Lower risk (simpler code)
- ✅ Can validate architecture early

**Cons:**
- ⚠️ Doesn't meet full requirements initially
- ⚠️ May require rework later
- ⚠️ User sees incomplete feature

**Scoring:**
| Category | Score | Notes |
|----------|-------|-------|
| Architecture | 9/10 | Clean, but incomplete initially |
| Maintainability | 8/10 | May need refactoring in phase 2 |
| Performance | 10/10 | Minimal overhead initially |
| User Experience | 6/10 | Missing key features (state nodes) |
| Migration Complexity | 7/10 | Breaking change still needed |
| Implementation Time | 9/10 | Fast initial delivery (~2 days) |
| **TOTAL** | **49/60** | **82%** |

---

## Council Discussion

### Butler Lampson (Simplicity)
> "Option 1 is the simplest long-term solution. Yes, it's more work upfront, but we avoid the complexity of maintaining dual codepaths (Option 2) or incomplete features (Option 4). The user explicitly allowed breaking changes—take advantage of that. Do it right the first time."

### Barbara Liskov (Invariants)
> "What happens to graph subscribers when the plugin isn't registered? Option 1 must handle this gracefully—`useBlocGraph()` should return empty snapshot or throw clear error. Don't let the app silently fail. Also, the graph state inside the plugin is a new invariant to maintain—ensure disposal cleanup is correct."

### Nancy Leveson (Safety & Failure)
> "The worst failure mode is memory leaks from circular references in state serialization. Option 1's custom WeakSet approach is correct. Also consider: what if a Bloc's state is gigabytes of data? Enforce limits (2-level depth is good) and add safeguards against serialization taking >100ms."

### Alan Kay (Problem Solving)
> "Are we solving the right problem? The grid layout was bad because it had no structure. Option 1's hierarchy (Blac → Blocs → State) directly addresses this. But I'm concerned about Option 4's 'MVP' approach—it postpones showing state nodes, which is half the value proposition. Don't ship half a solution."

### Martin Kleppmann (Data & Consistency)
> "Graph updates are eventually consistent due to 100ms throttling—that's fine. But ensure nodes can't appear before their parents (Blac root must exist first). Also, when a Bloc disposes, remove its State nodes atomically in the same update. Partial graph states will confuse users."

### Don Norman (Usability)
> "The flash animation on state change is critical for usability—users need to see *what* changed. Make sure the flash is obvious (300-500ms is good) but not annoying. Also, the hover tooltip with full JSON is great, but format it properly with indentation—raw JSON strings are unreadable."

### **Council Consensus:**
- ✅ **Option 1 (Clean Break)** is the recommended approach
- ⚠️ Must handle missing plugin gracefully
- ⚠️ Add safeguards for large state serialization
- ✅ 2-level depth is good starting point
- ✅ Flash animations are essential for UX
- ⚠️ Ensure atomic graph updates (parent before children)

---

## Comparison Summary

| Criteria | Option 1 (Clean) | Option 2 (Phased) | Option 3 (Hybrid) | Option 4 (MVP) |
|----------|------------------|-------------------|-------------------|----------------|
| **Architecture Quality** | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★★★★ |
| **Meets Requirements** | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| **Maintainability** | ★★★★★ | ★★★☆☆ | ★★★★☆ | ★★★★☆ |
| **Implementation Speed** | ★★★☆☆ | ★★☆☆☆ | ★★★★☆ | ★★★★★ |
| **Risk Level** | ★★★☆☆ | ★★★★☆ | ★★★☆☆ | ★★★★☆ |
| **User Experience** | ★★★★★ | ★★★★★ | ★★★★★ | ★★★☆☆ |
| **Total Score** | 52/60 (87%) | 45/60 (75%) | 47/60 (78%) | 49/60 (82%) |

---

## Recommendation Preview

**Recommended:** Option 1 (Clean Break)

**Rationale:**
1. ✅ Best long-term architecture (Council consensus)
2. ✅ Meets all requirements immediately
3. ✅ Breaking changes explicitly allowed by user
4. ✅ Avoids complexity of partial solutions
5. ✅ Clean separation of concerns

**Implementation Approach:**
- Use D3-Hierarchy for tree layout (confirmed by user)
- Custom state serialization (depth: 2 levels, confirmed by user)
- Full animation suite from start
- Comprehensive error handling for missing plugin
- Safeguards for large state objects

**Estimated Timeline:** 3-5 days for complete implementation

---

**Document Version**: 1.0
**Created**: 2025-10-12
**Status**: Complete - Ready for Recommendation
