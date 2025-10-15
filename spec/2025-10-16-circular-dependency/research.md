# Research: Circular Dependency Solutions

**Issue:** Critical-Stability-003
**Date:** 2025-10-16
**Status:** Solution Research

---

## Problem Recap

`Blac` and `BlocBase` have a circular dependency where each imports the other. This creates tight coupling and makes testing difficult.

**Core Challenge:** How to break the circular dependency while preserving all functionality (logging, plugin notifications) with zero performance overhead?

---

## Solution Approaches

### Option A: Context Interface (Dependency Injection) ⭐ RECOMMENDED

**Description:** Extract an interface that defines what BlocBase needs. BlocBase depends on the interface, Blac implements it.

**Implementation:**

```typescript
// NEW FILE: packages/blac/src/types/BlacContext.ts
export interface BlacContext {
  /**
   * Log informational message
   */
  log(...args: unknown[]): void;

  /**
   * Log error message
   */
  error(message: string, ...args: unknown[]): void;

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void;

  /**
   * System plugin registry for notifications
   */
  plugins: {
    notifyStateChanged(bloc: any, oldState: unknown, newState: unknown): void;
    notifyBlocDisposed(bloc: any): void;
  };
}

// BlocBase.ts - NO LONGER IMPORTS Blac
import { BlacContext } from './types/BlacContext';

export abstract class BlocBase<S> {
  blacContext?: BlacContext;  // ← Changed from blacInstance?: Blac

  _pushState(newState: S, oldState: S, action?: unknown): void {
    // Use context instead of instance
    this.blacContext?.error(`Cannot emit state...`);
    this.blacContext?.plugins.notifyStateChanged(this, oldState, newState);
    // ...
  }
}

// Blac.ts - IMPLEMENTS BlacContext
import { BlocBase } from './BlocBase';
import { BlacContext } from './types/BlacContext';

export class Blac implements BlacContext {
  // Implement BlacContext interface
  log = (...args: unknown[]) => { /* ... */ };
  error = (message: string, ...args: unknown[]) => { /* ... */ };
  warn = (message: string, ...args: unknown[]) => { /* ... */ };
  plugins = new SystemPluginRegistry();  // Already has correct methods

  // Existing Blac functionality
  blocInstanceMap: Map<string, BlocBase<unknown>> = new Map();
  // ...

  createNewBlocInstance<B extends BlocConstructor<BlocBase<any>>>(
    blocClass: B,
    id: BlocInstanceId,
    options: GetBlocOptions<InstanceType<B>> = {},
  ): InstanceType<B> {
    const newBloc = new blocClass(constructorParams) as InstanceType<B>;
    newBloc.blacContext = this;  // ← Inject context

    // ...
  }
}
```

**Pros:**
- ✅ **Breaks circular dependency** - BlocBase only depends on interface
- ✅ **Type-safe** - Interface enforces contract
- ✅ **Testable** - Easy to create mock contexts
- ✅ **Zero overhead** - Interfaces are compile-time only
- ✅ **Clear contract** - Interface documents exactly what's needed
- ✅ **Flexible** - Other implementations possible

**Cons:**
- ⚠️ **Migration effort** - Change `blacInstance` to `blacContext` throughout
- ⚠️ **Optional context** - BlocBase can work without context (pro and con)

**Assessment:**
- Correctness: **10/10** - Completely solves circular dependency
- Type Safety: **10/10** - Interface provides strong typing
- Testability: **10/10** - Very easy to test with mocks
- Performance: **10/10** - Zero runtime overhead
- Maintainability: **9/10** - Clear interface, easy to understand
- Migration Effort: **7/10** - Moderate (rename usages)
- Complexity: **9/10** - Simple, well-known pattern

**Score: 9.3/10**

---

### Option B: Event Bus / Publisher-Subscriber Pattern

**Description:** BlocBase emits events (log, stateChanged), Blac listens and handles them.

**Implementation:**

```typescript
// NEW FILE: packages/blac/src/events/BlocEventBus.ts
type BlocEvent =
  | { type: 'log'; args: unknown[] }
  | { type: 'error'; message: string; args: unknown[] }
  | { type: 'warn'; message: string; args: unknown[] }
  | { type: 'stateChanged'; bloc: any; oldState: unknown; newState: unknown }
  | { type: 'blocDisposed'; bloc: any };

export class BlocEventBus {
  private listeners = new Map<string, Set<(event: BlocEvent) => void>>();

  on(eventType: string, listener: (event: BlocEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    return () => this.listeners.get(eventType)?.delete(listener);
  }

  emit(event: BlocEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }
}

// Global or instance-based event bus
export const blocEventBus = new BlocEventBus();

// BlocBase.ts - NO IMPORT of Blac
import { blocEventBus } from './events/BlocEventBus';

export abstract class BlocBase<S> {
  _pushState(newState: S, oldState: S, action?: unknown): void {
    // Emit events instead of calling Blac directly
    blocEventBus.emit({
      type: 'error',
      message: 'Cannot emit state...',
      args: [],
    });

    blocEventBus.emit({
      type: 'stateChanged',
      bloc: this,
      oldState,
      newState,
    });
  }
}

// Blac.ts - Listens to events
import { BlocBase } from './BlocBase';
import { blocEventBus } from './events/BlocEventBus';

export class Blac {
  constructor() {
    // Set up listeners
    blocEventBus.on('log', (event) => {
      if (event.type === 'log') {
        console.log(...event.args);
      }
    });

    blocEventBus.on('error', (event) => {
      if (event.type === 'error') {
        console.error(event.message, ...event.args);
      }
    });

    blocEventBus.on('stateChanged', (event) => {
      if (event.type === 'stateChanged') {
        this.plugins.notifyStateChanged(event.bloc, event.oldState, event.newState);
      }
    });
  }

  // ... rest of Blac
}
```

**Pros:**
- ✅ **Completely decoupled** - No dependency in either direction
- ✅ **Very testable** - Can spy on events
- ✅ **Flexible** - Multiple listeners possible
- ✅ **Extensible** - Easy to add new event types

**Cons:**
- ❌ **Performance overhead** - Event creation and dispatch adds cost
- ❌ **Indirect** - Harder to trace code flow
- ❌ **Global state** - Event bus is global (or needs to be passed around)
- ⚠️ **Type safety** - Event types can become complex
- ⚠️ **Debugging** - Harder to debug event flow

**Assessment:**
- Correctness: **10/10** - Completely solves circular dependency
- Type Safety: **7/10** - Event types can be tricky
- Testability: **9/10** - Very testable with event spies
- Performance: **6/10** - Event dispatch overhead
- Maintainability: **6/10** - Indirect, harder to follow
- Migration Effort: **5/10** - Significant refactoring
- Complexity: **6/10** - Adds event bus layer

**Score: 7.0/10**

---

### Option C: Callback Functions (Inversion of Control)

**Description:** Pass logging and plugin functions to BlocBase as callbacks instead of Blac reference.

**Implementation:**

```typescript
// BlocBase.ts - NO IMPORT of Blac
export interface BlocCallbacks {
  onLog?: (...args: unknown[]) => void;
  onError?: (message: string, ...args: unknown[]) => void;
  onWarn?: (message: string, ...args: unknown[]) => void;
  onStateChanged?: (bloc: any, oldState: unknown, newState: unknown) => void;
  onBlocDisposed?: (bloc: any) => void;
}

export abstract class BlocBase<S> {
  private callbacks: BlocCallbacks = {};

  setCallbacks(callbacks: BlocCallbacks): void {
    this.callbacks = callbacks;
  }

  _pushState(newState: S, oldState: S, action?: unknown): void {
    // Use callbacks
    this.callbacks.onError?.('Cannot emit state...');
    this.callbacks.onStateChanged?.(this, oldState, newState);
  }
}

// Blac.ts - Provides callbacks
import { BlocBase } from './BlocBase';

export class Blac {
  createNewBlocInstance<B extends BlocConstructor<BlocBase<any>>>(
    blocClass: B,
    id: BlocInstanceId,
    options: GetBlocOptions<InstanceType<B>> = {},
  ): InstanceType<B> {
    const newBloc = new blocClass(constructorParams) as InstanceType<B>;

    // Inject callbacks
    newBloc.setCallbacks({
      onLog: (...args) => this.log(...args),
      onError: (message, ...args) => this.error(message, ...args),
      onWarn: (message, ...args) => this.warn(message, ...args),
      onStateChanged: (bloc, oldState, newState) =>
        this.plugins.notifyStateChanged(bloc, oldState, newState),
      onBlocDisposed: (bloc) => this.plugins.notifyBlocDisposed(bloc),
    });

    return newBloc;
  }
}
```

**Pros:**
- ✅ **Breaks circular dependency** - BlocBase doesn't import Blac
- ✅ **Simple** - No complex interfaces or events
- ✅ **Testable** - Easy to provide mock callbacks
- ✅ **Zero overhead** - Direct function calls

**Cons:**
- ⚠️ **Many callbacks** - Need callback for each operation (5+ callbacks)
- ⚠️ **Verbose** - Callback object is large
- ⚠️ **Fragile** - Easy to forget to set callbacks
- ⚠️ **Optional safety** - Optional chaining (`?.`) everywhere

**Assessment:**
- Correctness: **10/10** - Completely solves circular dependency
- Type Safety: **8/10** - Callbacks are typed but optional
- Testability: **9/10** - Easy to provide mock callbacks
- Performance: **10/10** - Zero overhead
- Maintainability: **7/10** - Verbose, many callbacks
- Migration Effort: **6/10** - Moderate refactoring
- Complexity: **8/10** - Simple but verbose

**Score: 8.3/10**

---

### Option D: Service Locator Pattern

**Description:** Use a static service locator to access logging and plugins without direct dependency.

**Implementation:**

```typescript
// NEW FILE: packages/blac/src/services/ServiceLocator.ts
export interface LoggingService {
  log(...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
}

export interface PluginService {
  notifyStateChanged(bloc: any, oldState: unknown, newState: unknown): void;
  notifyBlocDisposed(bloc: any): void;
}

export class ServiceLocator {
  private static loggingService?: LoggingService;
  private static pluginService?: PluginService;

  static setLoggingService(service: LoggingService): void {
    this.loggingService = service;
  }

  static setPluginService(service: PluginService): void {
    this.pluginService = service;
  }

  static getLoggingService(): LoggingService | undefined {
    return this.loggingService;
  }

  static getPluginService(): PluginService | undefined {
    return this.pluginService;
  }
}

// BlocBase.ts - NO IMPORT of Blac
import { ServiceLocator } from './services/ServiceLocator';

export abstract class BlocBase<S> {
  _pushState(newState: S, oldState: S, action?: unknown): void {
    // Use service locator
    ServiceLocator.getLoggingService()?.error('Cannot emit state...');
    ServiceLocator.getPluginService()?.notifyStateChanged(this, oldState, newState);
  }
}

// Blac.ts - Registers services
import { BlocBase } from './BlocBase';
import { ServiceLocator } from './services/ServiceLocator';

export class Blac {
  constructor() {
    // Register this instance as the service provider
    ServiceLocator.setLoggingService(this);
    ServiceLocator.setPluginService({ plugins: this.plugins });
  }

  log(...args: unknown[]): void { /* ... */ }
  error(message: string, ...args: unknown[]): void { /* ... */ }
  warn(message: string, ...args: unknown[]): void { /* ... */ }

  // ... rest of Blac
}
```

**Pros:**
- ✅ **Breaks circular dependency** - BlocBase doesn't import Blac
- ✅ **No dependency injection needed** - Services accessed statically
- ✅ **Simple to use** - Call static methods
- ✅ **Zero overhead** - Direct access

**Cons:**
- ❌ **Global state** - ServiceLocator is global
- ❌ **Testing difficult** - Global state makes tests interfere with each other
- ❌ **Hidden dependencies** - Not clear from API what's needed
- ⚠️ **Multiple Blac instances** - Service locator only holds one
- ⚠️ **Initialization order** - Services must be registered before use

**Assessment:**
- Correctness: **9/10** - Solves circular dep but global state issues
- Type Safety: **8/10** - Services are typed
- Testability: **5/10** - Global state makes testing hard
- Performance: **10/10** - Zero overhead
- Maintainability: **6/10** - Hidden dependencies
- Migration Effort: **7/10** - Moderate
- Complexity: **7/10** - Service locator pattern is known

**Score: 7.4/10**

---

### Option E: Split Interfaces (Two-Way Contracts)

**Description:** Create separate interfaces for what each class needs from the other, breaking the direct import cycle.

**Implementation:**

```typescript
// NEW FILE: packages/blac/src/interfaces/BlocManager.ts
export interface BlocManager {
  disposeBloc(bloc: any): void;
  registerBlocInstance(bloc: any): void;
  unregisterBlocInstance(bloc: any): void;
  // ... other methods BlocBase needs from Blac
}

// NEW FILE: packages/blac/src/interfaces/LoggingContext.ts
export interface LoggingContext {
  log(...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  plugins: {
    notifyStateChanged(bloc: any, oldState: unknown, newState: unknown): void;
    notifyBlocDisposed(bloc: any): void;
  };
}

// BlocBase.ts - Imports interfaces only
import { LoggingContext } from './interfaces/LoggingContext';

export abstract class BlocBase<S> {
  loggingContext?: LoggingContext;

  _pushState(newState: S, oldState: S, action?: unknown): void {
    this.loggingContext?.error('Cannot emit state...');
    this.loggingContext?.plugins.notifyStateChanged(this, oldState, newState);
  }
}

// Blac.ts - Imports BlocBase and implements interface
import { BlocBase } from './BlocBase';
import { LoggingContext } from './interfaces/LoggingContext';

export class Blac implements LoggingContext {
  // Implement LoggingContext
  log(...args: unknown[]): void { /* ... */ }
  error(message: string, ...args: unknown[]): void { /* ... */ }
  warn(message: string, ...args: unknown[]): void { /* ... */ }
  plugins = new SystemPluginRegistry();

  // Blac-specific functionality
  blocInstanceMap: Map<string, BlocBase<unknown>> = new Map();

  createNewBlocInstance(...) {
    const newBloc = new blocClass(...);
    newBloc.loggingContext = this;  // Inject interface
    // ...
  }
}
```

**Pros:**
- ✅ **Breaks circular dependency** - BlocBase imports interface, not Blac
- ✅ **Type-safe** - Interfaces provide strong contracts
- ✅ **Clear separation** - Each interface has specific purpose
- ✅ **Testable** - Easy to mock interfaces
- ✅ **Zero overhead** - Interfaces are compile-time only

**Cons:**
- ⚠️ **Similar to Option A** - This is essentially the same as Context Interface
- ⚠️ **More files** - Separate interface files for each concern
- ⚠️ **Potentially over-engineered** - May not need separate interfaces

**Assessment:**
- Correctness: **10/10** - Completely solves circular dependency
- Type Safety: **10/10** - Strong interface contracts
- Testability: **10/10** - Very testable
- Performance: **10/10** - Zero overhead
- Maintainability: **8/10** - More files to manage
- Migration Effort: **7/10** - Similar to Option A
- Complexity: **8/10** - More interfaces to understand

**Score: 9.0/10**

---

## Comparison Matrix

| Solution | Correctness | Type Safety | Testability | Performance | Maintainability | Migration | Complexity | **Total** |
|----------|-------------|-------------|-------------|-------------|-----------------|-----------|------------|-----------|
| **A: Context Interface** | 10/10 | 10/10 | 10/10 | 10/10 | 9/10 | 7/10 | 9/10 | **9.3/10** |
| **B: Event Bus** | 10/10 | 7/10 | 9/10 | 6/10 | 6/10 | 5/10 | 6/10 | **7.0/10** |
| **C: Callbacks** | 10/10 | 8/10 | 9/10 | 10/10 | 7/10 | 6/10 | 8/10 | **8.3/10** |
| **D: Service Locator** | 9/10 | 8/10 | 5/10 | 10/10 | 6/10 | 7/10 | 7/10 | **7.4/10** |
| **E: Split Interfaces** | 10/10 | 10/10 | 10/10 | 10/10 | 8/10 | 7/10 | 8/10 | **9.0/10** |

---

## Detailed Analysis

### Why Option A (Context Interface) Scores Highest

**Strengths:**
- **Breaks circular dependency cleanly** - BlocBase depends on interface only
- **Type-safe** - Interface enforces contract at compile time
- **Zero performance overhead** - Interfaces don't exist at runtime
- **Industry standard** - Dependency injection via interfaces is well-known
- **Testable** - Trivial to create mock contexts for testing

**Example Test:**
```typescript
describe('BlocBase with mock context', () => {
  it('should call context methods', () => {
    const mockContext: BlacContext = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      plugins: {
        notifyStateChanged: jest.fn(),
        notifyBlocDisposed: jest.fn(),
      },
    };

    const cubit = new TestCubit(0);
    cubit.blacContext = mockContext;

    cubit.increment();  // Causes state change

    expect(mockContext.plugins.notifyStateChanged).toHaveBeenCalled();
  });
});
```

**Main Weakness:**
- **Migration effort** - Need to rename `blacInstance` to `blacContext` throughout codebase

**Why This Is Acceptable:**
- User specified "backwards compatibility is not a concern"
- Migration is mechanical (find/replace with type checking)
- TypeScript will identify all locations needing updates
- Benefits outweigh migration cost

---

### Why Other Options Are Weaker

**Option B (Event Bus):**
- ❌ **Performance overhead** - Event creation and dispatch in hot path
- ❌ **Indirect** - Harder to understand code flow
- Better for loosely-coupled systems, overkill here

**Option C (Callbacks):**
- ⚠️ **Verbose** - Need 5+ callback functions
- ⚠️ **Fragile** - Easy to forget to set callbacks
- Simple but not elegant

**Option D (Service Locator):**
- ❌ **Testing difficulties** - Global state interferes with tests
- ❌ **Hidden dependencies** - Not clear from API
- Anti-pattern in modern TypeScript

**Option E (Split Interfaces):**
- ✅ Good solution, but essentially the same as Option A
- ⚠️ **More files** - Separate interfaces may be overkill
- Could consider if separation of concerns is important

---

## Recommendation

**Primary Recommendation: Option A (Context Interface)**

**Why:**
1. Highest score (9.3/10)
2. Industry-standard pattern (Dependency Injection)
3. Type-safe throughout
4. Zero performance overhead
5. Excellent testability
6. Clean separation of concerns

**Implementation Strategy:**
```typescript
// 1. Create BlacContext interface
export interface BlacContext {
  log(...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  plugins: {
    notifyStateChanged(bloc: any, oldState: unknown, newState: unknown): void;
    notifyBlocDisposed(bloc: any): void;
  };
}

// 2. BlocBase uses BlacContext (not Blac)
blacContext?: BlacContext;

// 3. Blac implements BlacContext
export class Blac implements BlacContext { /* ... */ }

// 4. Migration: blacInstance → blacContext
// Find: this.blacInstance
// Replace: this.blacContext
```

**Alternative:** Option E (Split Interfaces) if we want finer-grained interface separation, but Option A is simpler.

---

**Next Step:** Create discussion.md with Council analysis of Context Interface approach.
