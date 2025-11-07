# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BlaC is a TypeScript state management library with React integration that uses proxy-based dependency tracking for optimal re-renders. The architecture has been simplified from ~3000 lines to ~1000 lines by removing complex features and focusing on clean, minimal state management.

## Build & Development Commands

### Monorepo Root Commands
```bash
# Install dependencies (requires pnpm 10.14.0, Node >=22)
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix

# Clean build artifacts
pnpm clean

# Create changeset for release
pnpm changeset

# Version packages
pnpm version-packages

# Release packages (builds, tests, typechecks, then publishes)
pnpm release
```

### Package-Specific Commands

#### @blac/core (packages/blac/)
```bash
# Run tests
pnpm --filter @blac/core test

# Run specific test file
pnpm --filter @blac/core test src/core/Cubit.test.ts

# Run tests in watch mode
pnpm --filter @blac/core test:watch

# Build package
pnpm --filter @blac/core build

# Type check
pnpm --filter @blac/core typecheck
```

#### @blac/react (packages/blac-react/)
```bash
# Run tests (without React Compiler)
pnpm --filter @blac/react test

# Run tests with React 19 Compiler enabled
pnpm --filter @blac/react test:compiler

# Run both test suites
pnpm --filter @blac/react test:both

# Run specific test
pnpm --filter @blac/react test useBloc.test

# Performance tests
pnpm --filter @blac/react test:performance

# Memory leak tests
NODE_OPTIONS='--expose-gc' pnpm --filter @blac/react test:memory

# Build package
pnpm --filter @blac/react build
```

### Running Single Tests
```bash
# Using vitest directly for more control
pnpm --filter @blac/core exec vitest run src/core/Cubit.test.ts

# Run specific test case
pnpm --filter @blac/react exec vitest run src/__tests__/useBloc.test.tsx -t "should track dependencies"

# Run with verbose output
pnpm --filter @blac/react test dependency-tracking --reporter=verbose
```

## Architecture Overview

### Core State Management Architecture

The library follows a layered architecture:

1. **StateContainer (Base Layer)**
   - Foundation class for all state management
   - Provides protected `emit()` and `update()` methods
   - Handles subscriptions, lifecycle, and disposal
   - Supports instance registry for shared/isolated instances
   - Located in: `packages/blac/src/core/StateContainer.ts`

2. **Cubit (Simple State Pattern)**
   - Extends StateContainer with public state mutation methods
   - Direct state emission pattern: `emit(newState)`
   - Includes `patch()` for shallow object updates
   - Located in: `packages/blac/src/core/Cubit.ts`

3. **Vertex (Event-Driven Pattern)**
   - Extends StateContainer for event-based state transitions
   - Implements Bloc pattern with event handlers
   - Processes events synchronously with queueing
   - Located in: `packages/blac/src/core/Vertex.ts`

### React Integration Architecture

The React integration uses sophisticated proxy-based tracking:

1. **Proxy-Based Dependency Tracking**
   - `useBloc` hook creates proxies of both state and bloc instances
   - Tracks property access during render to determine dependencies
   - Only re-renders when accessed properties change
   - Located in: `packages/blac-react/src/useBloc.ts`

2. **Fine-Grained Dependency Tracking**
   - Automatically removes redundant parent paths from tracking
   - Accessing `state.user.profile.bio` tracks only `'user.profile.bio'`, not parent paths
   - Sibling properties are independent: `user.name` changes don't affect `user.age` tracking
   - Implemented in `optimizeTrackedPaths()` in `dependency-tracker.ts`
   - Results in ~60% fewer tracked paths and ~30-50% fewer unnecessary re-renders

3. **Dual Tracking System**
   - **State Property Tracking**: Uses `TrackerState` from core with fine-grained optimization
   - **Getter Tracking**: Separate system for computed properties
   - Both systems work together to minimize re-renders
   - Getter values are cached per render cycle for performance

4. **Instance Management**
   - **Shared Instances** (default): Multiple components share same bloc
   - **Isolated Instances**: Each component gets its own bloc (mark with `static isolated = true`)
   - Registry manages instance lifecycle and reference counting
   - **Three Access Patterns:**
     - `.resolve()`: Ownership (increments ref count) - use in React hooks
     - `.get()`: Borrowing (no ref count change, throws if not found) - use in bloc-to-bloc communication
     - `.getSafe()`: Safe borrowing (returns discriminated union) - use for conditional access
   - **Prevents Memory Leaks**: Using `.get()` in bloc-to-bloc calls prevents ref count buildup

### Key Architectural Decisions

1. **Removed Complexity**
   - No subscription pipeline system
   - No version tracking or state history
   - No StateStream/EventStream abstractions
   - Single disposal state instead of complex lifecycle

2. **Performance Optimizations**
   - Proxy caching per bloc instance (shared across components)
   - Getter computation caching per render cycle
   - Early exit strategies in change detection
   - Reference equality checks (`Object.is()`)

3. **TypeScript-First Design**
   - Full type inference without explicit type annotations
   - Constructor-based API for better TypeScript support
   - Branded types for type-safe IDs

### Testing Strategy

The codebase has three test configurations for React:

1. **Standard Tests** (`vitest.config.ts`): Tests without React Compiler
2. **Compiler Tests** (`vitest.config.compiler.ts`): Tests with React 19 Compiler
3. **Performance Tests** (`vitest.config.performance.ts`): Memory and performance benchmarks

Tests focus on:
- Dependency tracking accuracy
- Instance lifecycle management
- Memory leak prevention
- Re-render optimization
- Concurrent mode compatibility

### Package Structure

```
blac/
├── packages/
│   ├── blac/                 # Core state management
│   │   └── src/
│   │       ├── core/         # StateContainer, Cubit, Vertex
│   │       ├── tracking/     # Proxy tracking utilities
│   │       ├── logging/      # Logger implementation
│   │       └── types/        # TypeScript types
│   ├── blac-react/          # React integration
│   │   └── src/
│   │       ├── useBloc.ts   # Main hook with tracking
│   │       └── useBlocActions.ts # Actions-only hook
│   └── devtools-connect/    # DevTools integration
├── apps/
│   ├── docs/               # Documentation site
│   ├── examples/           # Example implementations
│   └── perf/              # Performance benchmarks
└── turbo.json            # Turbo configuration
```

### Development Workflow

1. **Making Changes to Core**: Changes in `packages/blac/src` affect all consumers
2. **Making Changes to React**: Test with both standard and compiler configs
3. **Testing Proxy Tracking**: Focus on `useBloc.proxyTracking.test.tsx` and `dependency-tracking.test.tsx`
4. **Performance Impact**: Run performance tests before/after changes
5. **Cross-Package Changes**: Use turbo to ensure proper build order

### Important Implementation Details

1. **Arrow Functions Required**: All methods in Cubit/Vertex must use arrow functions for React compatibility
2. **Shallow vs Deep Updates**: `patch()` only does shallow merge, use `update()` for nested changes
3. **Getter Tracking**: Getters are tracked separately and cached per render
4. **Instance Keys**: Custom instanceId or auto-generated for isolated instances
5. **Disposal**: Isolated instances disposed manually, shared instances use ref counting

### Common Debugging Patterns

```typescript
// Enable debug logging
configureLogger({ enabled: true, level: LogLevel.DEBUG });

// Check instance management
StateContainer.getStats(); // See all instances
CounterCubit.getRefCount('main'); // Check references

// Test specific dependency tracking
const [state, bloc] = useBloc(MyBloc, {
  dependencies: (s) => [s.field], // Manual tracking for debugging
});
```

### Production App Analysis

**TempDoc Reference:**
- **Analysis Report:** `/Users/brendanmullins/Documents/Log/TempDoc/blac/2025-11/04/production-apps-analysis.md`
- **Date:** 2025-11-04
- **Apps Analyzed:** PMP & user-app (from user-fe-reviews project)
- **Key Findings:**
  - Both apps use 3 BlaC versions simultaneously (v0, v1, v2)
  - Critical memory leaks: 0/34 disposals in PMP, 1/75 in user-app
  - Missing instance management: Only 1 of 109 blocs marked `static isolated`
  - Direct state access anti-pattern in ~35 files total
  - No dependency tracking usage in either app
  - 109 total Cubit/Bloc classes across both apps
  - Migration plan: 11-14 weeks in 3 phases

**Top Anti-Patterns Identified:**
1. Missing disposal lifecycle (timers, observers, event listeners not cleaned up)
2. Direct state access bypassing reactivity
3. God objects (UserCubit: 161 lines, LayoutCubit: 199 lines)
4. Complex nested state structures requiring deep spreading
5. No dependency tracking optimization

**Migration Priority:**
1. Add disposal to prevent memory leaks (CRITICAL)
2. Fix direct state access (CRITICAL)
3. Mark instance isolation strategy (HIGH)
4. Complete v2 migration (HIGH)

### DevTools Extension Development

**TempDoc Reference:**
- **Redux DevTools Learnings:** `/Users/brendanmullins/Documents/Log/TempDoc/blac/2025-11/06/redux-devtools-learnings.md`
- **Date:** 2025-11-06
- **Status:** 🚧 In Progress

**Key Insights from Redux DevTools:**
- Message chunking for large payloads (>32MB)
- Throttled state updates for performance
- Strict source validation and security checks
- Mock Chrome API for testing
- Clear separation: content script → inject script → page API

**Our Advantages:**
- Cleaner plugin architecture (more decoupled)
- Modern TypeScript with better type safety
- Simpler communication pattern
- Framework agnostic (not Redux-specific)

**Extension Location:** `apps/devtools-extension/`

### Local Instance Management Architecture

**TempDoc Reference:**
- **Summary:** `/Users/brendanmullins/Documents/Log/TempDoc/blac/2025-11/04/local-instance-management-implementation-summary.md`
- **Progress Log:** `/Users/brendanmullins/Documents/Log/TempDoc/blac/2025-11/04/implementation-progress-log.md`
- **Date:** 2025-11-04
- **Status:** ✅ Completed (356/358 tests passing - 99.4%)

**Architecture Change:**
Refactored from centralized registry to local per-class instance storage. Each `StateContainer` subclass now owns and manages its own instances in a static Map.

**Key Benefits:**
- **Performance:** 5-10x faster for type-specific queries (direct Map access vs string matching)
- **Memory:** 67% reduction in overhead
- **Simplicity:** Intuitive ownership model (each class owns its instances)
- **Compatibility:** Zero breaking changes, full backward compatibility

**Implementation:**
```typescript
abstract class StateContainer<S> {
  // Each subclass gets its own Map automatically via TypeScript static inheritance
  private static instances = new Map<string, InstanceEntry>()

  static resolve(key, ...args) {
    // Direct O(1) access to this class's instances
    const entry = this.instances.get(key || 'default')
    // ...
  }

  static getAll() {
    // O(n) where n = instances of THIS type only
    return Array.from(this.instances.values()).map(e => e.instance)
  }
}

// Registry simplified to coordination layer
StateContainerRegistry {
  types: Set<typeof StateContainer>  // Track types for clearAll()
  listeners: Map<LifecycleEvent, Set<Function>>  // Plugin system only
}
```

### Instance Management API Redesign

**TempDoc Reference:**
- **Design Document:** `/Users/brendanmullins/Documents/Log/TempDoc/blac/2025-11/04/instance-management-api-redesign.md`
- **Date:** 2025-11-04
- **Status:** Implemented (part of Local Instance Management refactor)

**New API Methods:**
- `.resolve()`: Get/create with ownership (increments ref count) - primary API for React hooks
- `.get()`: Get without ownership (throws if not found) - for bloc-to-bloc communication
- `.getSafe()`: Get without ownership (returns discriminated union) - for conditional access

**Key Benefits:**
- Prevents memory leaks in bloc-to-bloc communication patterns
- Makes ownership semantics explicit (`.resolve()` clearly indicates instance resolution)
- Familiar pattern from DI containers (similar to dependency injection)
- Provides type-safe conditional access with `.getSafe()`
- Clean break from deprecated `.getOrCreate()` API

**Usage Examples:**
```typescript
// React component (ownership)
const counter = CounterCubit.resolve('main', 0);

// Bloc-to-bloc communication (borrowing - no memory leak!)
class UserBloc {
  loadProfile = () => {
    const analytics = AnalyticsBloc.get('main');
    analytics.trackEvent('profile_loaded');
  };
}

// Conditional access (safe borrowing)
const result = NotificationCubit.getSafe('user-123');
if (!result.error) {
  result.instance.markAsRead();
}
```

### Instance Query APIs (getAll/forEach)

**TempDoc Reference:**
- **Implementation Document:** `/Users/brendanmullins/Documents/Log/TempDoc/blac/2025-11/04/foreach-getall-api-implementation.md`
- **Date:** 2025-11-04
- **Status:** Implemented & Tested

**New Query Methods:**
- `.getAll()`: Returns all instances as an array
- `.forEach(callback)`: Safely iterates over all instances with disposal protection

**Key Features:**
- **Disposal Safety**: `forEach()` automatically skips instances disposed during iteration
- **Memory Efficient**: `forEach()` uses generator pattern (no intermediate array)
- **Error Handling**: Catches callback errors without stopping iteration
- **Ideal for large instance counts**: Use `forEach()` when working with 100+ instances

**Usage Examples:**
```typescript
// Broadcast to all sessions
UserSessionBloc.forEach((session) => {
  session.notify('Server maintenance in 5 minutes');
});

// Cleanup stale sessions
UserSessionBloc.forEach((session) => {
  if (session.state.lastActivity < threshold) {
    UserSessionBloc.release(session.instanceId);
  }
});

// Collect statistics
let totalMessages = 0;
ChatRoomBloc.forEach((room) => {
  totalMessages += room.state.messageCount;
});

// Get all instances as array (when you need array operations)
const allSessions = UserSessionBloc.getAll();
const activeSessions = allSessions.filter(s => s.state.isActive);
```

### DevTools Extension: Simple Instance Grouping & Diff

**TempDoc Reference:**
- **Implementation Plan:** `/Users/brendanmullins/Documents/Log/TempDoc/blac/2025-11/07/devtools-simple-plan.md`
- **Date:** 2025-11-07
- **Status:** ✅ Completed

**Features (KISS approach):**
1. **Visual Instance Grouping + Search**
   - Always-visible flat list sorted by className
   - Color-coded 4px left border per className (generated from className seed)
   - Simple search filter (className or instanceId)
   - Visual grouping without collapsible headers

2. **Simple Diff View**
   - Track just previous state (1 snapshot per instance)
   - Side-by-side comparison (Previous | Current)
   - Color-coded borders (red for previous, green for current)
   - Auto-shows when state changes detected

**Color Generation:**
- Consistent HSL colors generated from className using hash function
- 70% saturation, 60% lightness for good visibility on dark theme
- Same className = same color across all instances

**Implementation:** All inline in `apps/devtools-extension/src/panel/index.tsx` (~265 lines total)