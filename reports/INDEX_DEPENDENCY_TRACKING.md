# BlaC Dependency Tracking Documentation Index

This comprehensive guide explains how dependency tracking works in the BlaC state management library, including the mechanisms, code flows, and practical usage patterns.

## Quick Navigation

### For Understanding Concepts
**Start here if you want to understand WHY and HOW dependency tracking works:**
1. **[DEPENDENCY_TRACKING_SUMMARY.md](./DEPENDENCY_TRACKING_SUMMARY.md)** - 5 min read
   - What is dependency tracking?
   - Two modes explained
   - When to use each mode
   - Common patterns
   - FAQ

### For Visual Learners
**Start here if you prefer diagrams and visual explanations:**
1. **[dependency-flow-diagrams.md](./dependency-flow-diagrams.md)** - Visual reference
   - Hook lifecycle flowchart
   - Dependency comparison logic
   - Storage structure diagrams
   - Complete re-render decision tree
   - Performance characteristics

### For Deep Technical Understanding
**Start here if you want complete implementation details:**
1. **[dependency-tracking-analysis.md](./dependency-tracking-analysis.md)** - Complete technical deep dive
   - How the `dependencies` option works
   - Dependency value storage and comparison
   - Comparison mechanism details
   - Re-render trigger flow
   - Interaction with proxy-based tracking
   - State snapshot mechanism
   - Two-phase tracking system

### For Code Implementation
**Start here if you need specific code references:**
1. **[dependency-code-reference.md](./dependency-code-reference.md)** - Code snippets and references
   - Hook integration code
   - Adapter initialization
   - Comparison logic implementation
   - Subscription creation
   - Two-phase tracking implementation
   - All key code locations with line numbers

---

## Document Overview

### DEPENDENCY_TRACKING_SUMMARY.md
**Length:** ~460 lines | **Read Time:** 10-15 minutes

**What you'll learn:**
- Executive overview of dependency tracking
- Simple examples of each mode
- Step-by-step comparison process
- Key concepts explained simply
- Performance characteristics
- When to use each mode
- Common patterns and pitfalls
- Real-world example

**Best for:** Understanding the big picture, deciding between modes

---

### dependency-tracking-analysis.md
**Length:** ~575 lines | **Read Time:** 20-30 minutes

**What you'll learn:**
- Complete technical analysis
- How `dependencies` option works in useBloc
- Storage structures in BlacAdapter
- Detailed comparison mechanism
- Re-render trigger mechanism
- Proxy-based tracking integration
- Storage and update cycle
- Two-phase tracking architecture
- Step-by-step real-world example
- Memory and performance implications
- Configuration and control points

**Best for:** Deep understanding, debugging, optimization

---

### dependency-flow-diagrams.md
**Length:** ~530 lines | **Read Time:** 15-25 minutes

**What you'll learn:**
- Hook lifecycle flowchart
- Dependency comparison flowchart
- Storage structure diagram
- Detailed comparison walkthrough
- State snapshot mechanism diagram
- Proxy mode explanation
- Two-phase tracking diagram
- Complete re-render decision tree
- Performance characteristics table

**Best for:** Visual thinkers, understanding flow, debugging

---

### dependency-code-reference.md
**Length:** ~680 lines | **Read Time:** 20-30 minutes

**What you'll learn:**
- useBloc hook implementation
- BlacAdapter creation and initialization
- Dependency comparison code
- Generator detection and normalization
- Subscription with selector code
- State snapshot implementation
- Proxy control logic
- Two-phase tracking implementation
- SubscriptionManager notify flow
- Quick implementation checklist
- Type definitions

**Best for:** Implementation details, code review, debugging specific issues

---

## Key File Locations

### Source Code Files

| Component | Location | Purpose |
|-----------|----------|---------|
| useBloc Hook | `packages/blac-react/src/useBloc.ts` | React hook that creates adapters |
| BlacAdapter | `packages/blac/src/adapter/BlacAdapter.ts` | Orchestrates dependency tracking |
| ProxyFactory | `packages/blac/src/adapter/ProxyFactory.ts` | Creates tracking proxies |
| SubscriptionManager | `packages/blac/src/subscription/SubscriptionManager.ts` | Manages notifications |
| BlocBase | `packages/blac/src/BlocBase.ts` | Core subscription methods |

### Test Files

| Test | Location | Coverage |
|------|----------|----------|
| Dependencies | `packages/blac-react/src/__tests__/useBloc.dependencies.test.tsx` | Manual dependency tests |
| Proxy Config | `packages/blac-react/src/__tests__/useBloc.proxyConfig.test.tsx` | Proxy behavior tests |
| Adapter | `packages/blac-react/src/__tests__/useBloc.adapter.test.tsx` | Adapter functionality |

---

## Learning Paths

### Path 1: "I Just Want to Use It" (30 minutes)

1. Read: [DEPENDENCY_TRACKING_SUMMARY.md](./DEPENDENCY_TRACKING_SUMMARY.md)
   - Focus on "When to Use Each Mode"
   - Focus on "Real-World Example"

2. Code: Look at test examples in `useBloc.dependencies.test.tsx`

3. Try: Implement dependencies in your own component

**Outcome:** You can use dependencies effectively

---

### Path 2: "I Want to Understand How It Works" (60 minutes)

1. Read: [DEPENDENCY_TRACKING_SUMMARY.md](./DEPENDENCY_TRACKING_SUMMARY.md)
   - Full read, 10-15 min

2. Look at: [dependency-flow-diagrams.md](./dependency-flow-diagrams.md)
   - Focus on diagrams 1-5, 10 min

3. Read: [dependency-tracking-analysis.md](./dependency-tracking-analysis.md)
   - Sections 1-5, 20-25 min

4. Code review: Open `BlacAdapter.ts` and follow along with section 3

**Outcome:** You understand the mechanism and can debug issues

---

### Path 3: "I'm Implementing or Debugging This" (90 minutes)

1. Quick ref: [dependency-code-reference.md](./dependency-code-reference.md)
   - Sections 1-3, 5 min

2. Deep dive: [dependency-tracking-analysis.md](./dependency-tracking-analysis.md)
   - Full read, 25-30 min

3. Diagrams: [dependency-flow-diagrams.md](./dependency-flow-diagrams.md)
   - Full read, 15-20 min

4. Code walkthrough: All sections of [dependency-code-reference.md](./dependency-code-reference.md)
   - Full read, 25-30 min

5. Hands on: Trace execution in debugger following the code

**Outcome:** You can implement changes, fix bugs, optimize

---

### Path 4: "I Need to Debug Something Specific"

1. **Issue: Component not re-rendering**
   - Read: [DEPENDENCY_TRACKING_SUMMARY.md](./DEPENDENCY_TRACKING_SUMMARY.md) → "Pitfalls" section
   - Check: [dependency-code-reference.md](./dependency-code-reference.md) → section 12 (Notify)
   - Diagram: [dependency-flow-diagrams.md](./dependency-flow-diagrams.md) → diagram 8

2. **Issue: Too many re-renders**
   - Read: [dependency-tracking-analysis.md](./dependency-tracking-analysis.md) → section 8
   - Check: [dependency-code-reference.md](./dependency-code-reference.md) → section 3 (Comparison)

3. **Issue: Memory leak or performance**
   - Read: [dependency-tracking-analysis.md](./dependency-tracking-analysis.md) → section 8
   - Check: [dependency-flow-diagrams.md](./dependency-flow-diagrams.md) → diagram 10

---

## Core Concepts at a Glance

### The Three Key Ideas

1. **Dependencies Function**: Tells BlaC what values to watch
   ```typescript
   dependencies: (bloc) => [bloc.state.userId, bloc.state.status]
   ```

2. **Comparison**: BlaC uses Object.is() to detect changes
   ```typescript
   // When values change from ['alice', 'loading'] to ['alice', 'done']
   // BlaC detects the change and re-renders
   ```

3. **State Snapshot**: Component gets frozen state when deps match
   ```typescript
   // Component doesn't see other state changes
   // Only sees state at moment dependencies changed
   ```

### The Two Modes

| Aspect | Manual Dependencies | Proxy Tracking |
|--------|-------------------|-----------------|
| **You provide** | What to watch | Nothing |
| **BlaC does** | Comparison | Tracks accesses |
| **Performance** | Better | Good |
| **Control** | Full | Automatic |
| **Best for** | Complex apps | Simple apps |

### The Storage Model

```
BlacAdapter stores:
  dependencyValues    → [current, watched, values]
  stateSnapshot       → frozen state at last change
  subscription        → handles notification
  trackedPaths        → (proxy mode) paths accessed
  pendingDependencies → (proxy mode) collected this render
```

---

## Common Questions Answered

### "Does dependency tracking mean my component won't get the latest state?"

No. Your component gets the latest state value (`state.userId` is always current). The dependency tracking only controls *when* the component re-renders, not what state values it receives.

### "Why two modes instead of just one?"

Different apps have different needs. Simple apps benefit from automatic proxy tracking. Complex apps with lots of state benefit from explicit dependencies for performance.

### "What's the performance impact?"

Manual dependencies: ~50-100 bytes per component, negligible impact
Proxy tracking: ~500+ bytes per component, still negligible for most apps
Not worth optimizing unless you have 100+ components

### "Can I mix both modes?"

No. If you provide `dependencies`, proxy tracking is disabled for that component. This is by design to avoid redundancy.

### "How do I know which mode is active?"

If you provided a `dependencies` option, manual mode is active. Otherwise, proxy mode is active (if enabled in config).

---

## Implementation Checklist

### To Use Manual Dependencies:

```typescript
const [state, bloc] = useBloc(MyCubit, {
  dependencies: (bloc) => {
    // 1. Return values you want to watch
    return [bloc.state.userId, bloc.state.status];
  },
  // 2. (Optional) Setup lifecycle
  onMount: (bloc) => {},
  onUnmount: (bloc) => {},
});

// 3. Component re-renders only when returned values change
```

### To Debug:

1. Add console.log to dependencies function
2. Check console during state changes
3. If logged on every change: dependencies are updating
4. If not logged: something else triggered re-render

---

## Technical References

### Key Data Structures

**Subscription**: Connects component to bloc for notifications
- Has selector function (dependencies function)
- Has equality function (Object.is())
- Stores lastValue for comparison
- Stores dependencies set (for proxy mode)

**BlacAdapter**: Orchestrates connection
- Stores dependencyValues
- Maintains stateSnapshot
- Creates subscription
- Manages two-phase tracking

**SubscriptionManager**: Manages all subscriptions
- Notifies subscriptions on state change
- Runs selectors
- Checks equality functions
- Triggers callbacks

### Key Functions

**compareDependencies()**: Detects if dependency values changed
- Uses Object.is() for comparison
- Early exit for generators
- Returns boolean: true = changed, false = unchanged

**normalizeDependencies()**: Converts generators to arrays
- Handles both generators and arrays
- Returns standardized array format

**trackAccess()**: Records property access during render (proxy mode)
- Called from proxy get traps
- Stores in pendingDependencies
- Atomically committed after render

---

## Next Steps

### If You're Learning:
1. Start with [DEPENDENCY_TRACKING_SUMMARY.md](./DEPENDENCY_TRACKING_SUMMARY.md)
2. Look at real examples in test files
3. Try implementing in a simple component

### If You're Debugging:
1. Find your issue in the FAQ section
2. Follow the recommended document sections
3. Use diagrams to trace execution

### If You're Contributing:
1. Understand all of [dependency-tracking-analysis.md](./dependency-tracking-analysis.md)
2. Reference [dependency-code-reference.md](./dependency-code-reference.md) for exact line numbers
3. Use [dependency-flow-diagrams.md](./dependency-flow-diagrams.md) to visualize changes

---

## Document Statistics

| Document | Lines | Diagrams | Code Examples | Estimated Read Time |
|----------|-------|----------|----------------|----------------------|
| DEPENDENCY_TRACKING_SUMMARY.md | 466 | 0 | 20+ | 10-15 min |
| dependency-tracking-analysis.md | 573 | 2 | 15+ | 20-30 min |
| dependency-flow-diagrams.md | 526 | 10 | 0 | 15-25 min |
| dependency-code-reference.md | 677 | 0 | 50+ | 20-30 min |
| INDEX_DEPENDENCY_TRACKING.md | This file | 0 | 10+ | 10-15 min |

**Total:** ~2,240 lines, 12 diagrams, 95+ examples

---

## Related Documentation

- **Main CLAUDE.md**: Project overview and conventions
- **Architecture Review**: `/blac-improvements.md`
- **API Reference**: Inline code comments in source files
- **Test Examples**: `packages/blac-react/src/__tests__/`

---

## Contributing to This Documentation

To update or expand this documentation:

1. Edit the relevant document
2. Keep examples current with code
3. Update the line counts in this index
4. Ensure links are correct
5. Add related diagrams if helpful

---

**Last Updated**: October 18, 2025
**Coverage**: BlaC v1.x dependency tracking system
**Accuracy**: Cross-referenced with source code as of commit ff697ca

