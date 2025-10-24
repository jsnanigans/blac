# BlaC Core (@blac/core) Documentation

This directory contains comprehensive documentation for the @blac/core v2 state management library.

## Documentation Files

### 1. BLAC_CORE_FEATURE_OVERVIEW.md (16 KB, 456 lines)
**Purpose**: Complete feature inventory and capability assessment

**Contents**:
- Executive summary of the library
- 8 major feature areas with detailed explanations:
  1. State Management Foundation (StateContainer, StateStream, Cubit, Vertex)
  2. Lifecycle Management (LifecycleManager, generation counter pattern)
  3. Subscription System (Advanced pipeline with 7 stages)
  4. Event System (Type-safe events, TypedEventEmitter, EventStream)
  5. Registry & Instance Management (BlocRegistry with auto-registration)
  6. Proxy-Based Dependency Tracking (ProxyTracker)
  7. Type Safety & Branded Types (Nominal typing system)
  8. Logging System (BlacLogger with levels and custom output)
- Architecture patterns and design decisions
- Plugin ecosystem (4 plugins: persistence, graph, graph-react, render-logging)
- Testing infrastructure and utilities
- Configuration options with code examples
- Performance characteristics and optimizations
- Current gaps and limitations (14+ areas analyzed)
- Code quality observations
- Usage patterns and examples
- Integration points with React and DevTools

**Best For**: Understanding what's implemented, what's missing, and why certain design decisions were made.

### 2. BLAC_CORE_ARCHITECTURE.md (19 KB, 459 lines)
**Purpose**: Deep technical architecture and implementation details

**Contents**:
- Detailed project structure with all 38 source files mapped
- Dependency graphs showing class relationships
- Core class hierarchy (StateContainer → Cubit/Vertex)
- Data flow diagrams:
  - State change flow (8 steps)
  - Lifecycle flow (state machine diagram)
  - Disposal race condition prevention (timeline analysis)
- Subscription pipeline stages in detail:
  - 7 processing stages with skip conditions
  - Input/output flow
- Memory management patterns:
  - WeakRef-based consumer tracking
  - Generation counter mechanism
- Type safety architecture:
  - Branded types and nominal typing
  - Generic type safety throughout
- Configuration cascade (4 levels)
- Event flow architecture
- Technical design patterns explained

**Best For**: Understanding how the system works internally, data flow, memory management, and architectural patterns.

---

## Quick Navigation

### I want to understand...

| Question | Document | Section |
|----------|----------|---------|
| What features are implemented? | Feature Overview | "Core Features Currently Implemented" |
| What's missing or incomplete? | Feature Overview | "Current Gaps & Limitations" |
| How does disposal work? | Architecture | "Disposal Race Condition Prevention" |
| How are memory leaks prevented? | Architecture | "Memory Management" |
| What are the lifecycle states? | Architecture | "Lifecycle Flow" |
| How do subscriptions work? | Both | "Subscription System" / "Subscription Pipeline Stages" |
| What's the file structure? | Architecture | "Project Structure" |
| How is type safety achieved? | Both | "Type Safety" sections |
| What configuration options exist? | Both | "Configuration" sections |
| How do events work? | Feature Overview | "Event System" |
| What's the plugin ecosystem? | Feature Overview | "Plugin Ecosystem" |
| How should I test my code? | Feature Overview | "Testing Infrastructure" |

---

## Key Insights

### Architectural Strengths
1. **Generation Counter Pattern**: Elegant solution to React Strict Mode race conditions
2. **Staged Pipeline**: Flexible, composable subscription system with clear separation of concerns
3. **Type Safety**: Branded types + generics throughout prevent subtle bugs
4. **Memory Management**: WeakRef-based tracking + automatic cleanup prevents memory leaks
5. **Clean Code**: No TODOs/FIXMEs, well-documented, consistent patterns

### Main Gaps
1. **No global error handling/recovery** - Error events exist but no circuit breaker
2. **No middleware system** - Can't intercept operations before/after
3. **No time-travel debugging** - History tracked but no snapshots API
4. **Limited async management** - Events support async but no loading/error states
5. **No built-in persistence** - Plugin exists but not core

### Performance Optimization Options
1. **Selector-based subscriptions** - Only transform needed state
2. **Path-based filtering** - Skip unrelated changes
3. **Debounce/Throttle** - Reduce callback frequency
4. **Batching** - Collect multiple changes
5. **Priority ordering** - Execute critical subscriptions first

---

## Architecture Overview Diagram

```
┌─────────────────────────────────────────┐
│         User Application               │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────┴──────────────────────┐
│    Public API (Cubit, Vertex)          │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
    ┌─────────┐        ┌──────────────┐
    │  Cubit  │        │   Vertex     │
    │ Simple  │        │ Event-driven │
    └────┬────┘        └──────┬───────┘
         │                    │
         └────────┬───────────┘
                  │
            ┌─────▼──────────┐
            │ StateContainer │
            │  (Base class)  │
            └────┬─────┬────┬┘
                 │     │    │
        ┌────────┘     │    └──────────┐
        │              │               │
        ▼              ▼               ▼
    StateStream   LifecycleManager  SubscriptionSystem
    (Immutable)   (State Machine)    (Pipeline stages)
        │          (Gen Counter)            │
        │                                   ▼
        │                          ┌──────────────────┐
        └──────────────┬───────────┤ 7-Stage Pipeline │
                       │           │ With metrics &   │
                       │           │ optimization     │
                       ▼           └──────────────────┘
                  EventStream
                  (Type-safe)
```

---

## File Organization

```
docs/
├── README.md (this file)                     # Navigation and overview
├── BLAC_CORE_FEATURE_OVERVIEW.md            # What's implemented
└── BLAC_CORE_ARCHITECTURE.md                # How it works internally

Source Code (packages/blac/src/):
├── core/                                     # State management foundation
├── subscription/                             # Advanced pipeline system
├── registry/                                 # Instance management
├── proxy/                                    # Dependency tracking
├── logging/                                  # Logging system
├── types/                                    # Type definitions
└── test-utils/                              # Testing utilities
```

---

## Usage Examples

### Basic Cubit
```typescript
class CounterCubit extends Cubit<number> {
  constructor() { super(0); }
  increment = () => this.emitState(this.state + 1);
}

const counter = new CounterCubit();
counter.subscribe(state => console.log(`Count: ${state}`));
counter.increment(); // "Count: 1"
```

### Event-Driven Bloc
```typescript
class LoginEvent { constructor(public email: string, public password: string) {} }

class AuthVertex extends Vertex<AuthState> {
  constructor() {
    super(initialState);
    this.on(LoginEvent, (event, emit) => {
      // Handle async login
      emit(newAuthState);
    });
  }
  login = (email: string, password: string) => {
    this.add(new LoginEvent(email, password));
  };
}
```

### Advanced Subscriptions
```typescript
const subscription = container.subscribeAdvanced({
  selector: (state) => state.user?.name,  // Only this property
  filter: (current, previous) => current !== previous,  // Only on change
  debounce: 300,  // Debounce 300ms
  priority: SubscriptionPriority.HIGH,  // Execute first
  callback: (name) => console.log(`User: ${name}`)
});
```

---

## Related Documentation

- **Playground**: `/apps/playground/` - Interactive examples with Monaco editor
- **React Integration**: `/packages/blac-react/` - React 18+ hooks and Adapter Pattern
- **Plugins**: `/packages/plugins/` - Extensible ecosystem
- **DevTools**: `/packages/devtools-connect/` - Debugging integration
- **Specs**: `/spec/` - Architecture Decision Records (ADRs)

---

## For Library Contributors

If you're working on extending or modifying @blac/core:

1. **Read Architecture first** - Understand the design before making changes
2. **Check Feature Overview** - Know what exists to avoid duplication
3. **Review patterns** - Follow established patterns (arrow functions, immutability, etc.)
4. **Add tests** - Use test-utils for consistent test patterns
5. **Update docs** - Keep these files current as you change the system

---

## Questions & Further Reading

| If you want to... | Start with... |
|---|---|
| Learn the system | Feature Overview (executive summary) |
| Understand the design | Architecture (patterns section) |
| Build with it | Feature Overview (usage patterns) |
| Debug issues | Architecture (data flow diagrams) |
| Extend it | Feature Overview (gaps & limitations) + Architecture (patterns) |
| Optimize performance | Feature Overview (performance characteristics) |
| Test it | Feature Overview (testing infrastructure) |
| Integrate with React | Feature Overview (integration points) |

---

## Document Metadata

- **Created**: October 24, 2025
- **Library Version**: @blac/core v2.0.0-rc.2
- **Language**: TypeScript (strict mode)
- **Test Framework**: Vitest
- **Total Documentation**: 915 lines, 35 KB

Last Updated: October 24, 2025
