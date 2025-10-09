# Task: Break Circular Dependencies

**Priority:** Critical
**Category:** Immediate Actions
**Estimated Effort:** 1-2 weeks
**Dependencies:** None (but recommended before BlocBase refactoring)

## Overview

Eliminate circular dependencies between core modules, particularly the Blac ↔ BlocBase cycle, to improve testability, maintainability, and reduce initialization order risks.

## Problem Statement

The current architecture has circular dependencies that violate modularity principles:

**Primary Cycle:**
- `Blac.ts` imports `BlocBase.ts`
- `BlocBase.ts` imports `Blac.ts`

This creates:
- **Initialization order risks** - Uncertain which module initializes first
- **Testing difficulties** - Hard to test modules in isolation
- **Tight coupling** - Changes in one module ripple through others
- **Code navigation complexity** - Harder to understand data flow
- **Potential runtime errors** - Module initialization race conditions

## Specific Problem Areas

### 1. Blac ↔ BlocBase Circular Dependency

**File:** `packages/blac/src/Blac.ts`
```typescript
import { BlocBase } from './BlocBase';

class Blac {
  static instances = new Map<string, BlocBase>();
  // ... uses BlocBase extensively
}
```

**File:** `packages/blac/src/BlocBase.ts`
```typescript
import { Blac } from './Blac';

class BlocBase {
  constructor() {
    Blac.registerInstance(this); // Depends on Blac
  }
}
```

### 2. Mixed Instance and Static Method Delegation

The API surface is confusing with both instance and static methods:
```typescript
// Instance method delegates to global
blocInstance.someMethod() → Blac.someMethod()
```

This creates tight coupling without clear separation of concerns.

## Goals

1. **Eliminate circular imports** between Blac and BlocBase
2. **Improve testability** through dependency injection
3. **Clarify module boundaries** with well-defined interfaces
4. **Maintain API compatibility** where possible
5. **Document architecture** to prevent future circular dependencies

## Acceptance Criteria

### Must Have
- [ ] No circular dependencies between core modules (verified with dependency graph tool)
- [ ] `BlocBase` can be imported and tested without importing `Blac`
- [ ] `Blac` can be imported and tested without importing `BlocBase` directly
- [ ] All existing tests pass without modification
- [ ] TypeScript compilation succeeds with strict module resolution

### Should Have
- [ ] Clear dependency hierarchy documented
- [ ] Dependency injection pattern implemented where appropriate
- [ ] ESLint rule to prevent future circular dependencies
- [ ] Improved test isolation for all core modules

### Nice to Have
- [ ] Automated dependency graph visualization in CI
- [ ] Architecture Decision Record (ADR) documenting the solution
- [ ] Performance benchmarks showing no regression

## Implementation Strategy

### Approach 1: Interface Extraction (Recommended)

Extract interfaces to break the cycle:

```typescript
// packages/blac/src/interfaces/IBlocRegistry.ts
export interface IBlocRegistry {
  registerInstance<T>(instance: IBlocInstance<T>): void;
  unregisterInstance(id: string): void;
  getInstance<T>(id: string): IBlocInstance<T> | undefined;
}

export interface IBlocInstance<TState> {
  readonly _id: string;
  readonly _name: string;
  readonly state: TState;
  dispose(): void;
}
```

```typescript
// packages/blac/src/BlocBase.ts
import { IBlocRegistry, IBlocInstance } from './interfaces';

export abstract class BlocBase<TState> implements IBlocInstance<TState> {
  constructor(
    initialState: TState,
    private registry?: IBlocRegistry // Dependency injection
  ) {
    this._state = initialState;
    this.registry?.registerInstance(this);
  }
}
```

```typescript
// packages/blac/src/Blac.ts
import { IBlocRegistry, IBlocInstance } from './interfaces';

export class Blac implements IBlocRegistry {
  private static instances = new Map<string, IBlocInstance<any>>();

  registerInstance<T>(instance: IBlocInstance<T>): void {
    Blac.instances.set(instance._id, instance);
  }
}
```

**Benefits:**
- Clean separation of concerns
- Easy to test with mock registries
- No circular dependencies
- Type-safe interfaces

### Approach 2: Event-Based Communication

Use event emitters instead of direct coupling:

```typescript
// packages/blac/src/events/BlocEvents.ts
export enum BlocEvent {
  INSTANCE_CREATED = 'instance_created',
  INSTANCE_DISPOSED = 'instance_disposed',
  STATE_CHANGED = 'state_changed'
}

export class BlocEventBus {
  private static emitter = new EventEmitter();

  static emit(event: BlocEvent, data: any): void {
    this.emitter.emit(event, data);
  }

  static on(event: BlocEvent, handler: (data: any) => void): void {
    this.emitter.on(event, handler);
  }
}
```

**Benefits:**
- Loose coupling
- Easy to add new subscribers
- Good for cross-cutting concerns

**Drawbacks:**
- Harder to trace data flow
- Potential for event handler leaks
- Less type safety

### Approach 3: Service Locator Pattern

Use a service locator for global state:

```typescript
// packages/blac/src/ServiceLocator.ts
export class ServiceLocator {
  private static services = new Map<string, any>();

  static register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  static get<T>(key: string): T | undefined {
    return this.services.get(key) as T;
  }
}

// Usage in BlocBase
export abstract class BlocBase<TState> {
  constructor(initialState: TState) {
    const registry = ServiceLocator.get<IBlocRegistry>('registry');
    registry?.registerInstance(this);
  }
}
```

**Benefits:**
- Centralized dependency management
- No circular dependencies

**Drawbacks:**
- Hidden dependencies
- Runtime dependency resolution
- Service locator is an anti-pattern in some contexts

## Recommended Solution

**Use Approach 1 (Interface Extraction) with Dependency Injection:**

1. Extract `IBlocRegistry` and `IBlocInstance` interfaces
2. Make registry optional in BlocBase constructor (defaults to global Blac)
3. Use dependency injection in tests
4. Maintain backwards compatibility with static Blac access

## Implementation Steps

### Phase 1: Create Interfaces (Days 1-2)

1. **Create interface definitions**
   ```bash
   mkdir -p packages/blac/src/interfaces
   touch packages/blac/src/interfaces/IBlocRegistry.ts
   touch packages/blac/src/interfaces/IBlocInstance.ts
   touch packages/blac/src/interfaces/index.ts
   ```

2. **Define interfaces**
   - Extract common properties from BlocBase
   - Define registry contract
   - Add lifecycle hooks

3. **Export from main index**
   ```typescript
   // packages/blac/src/index.ts
   export * from './interfaces';
   ```

### Phase 2: Refactor BlocBase (Days 3-5)

1. **Implement IBlocInstance**
   ```typescript
   export abstract class BlocBase<TState> implements IBlocInstance<TState> {
     constructor(
       initialState: TState,
       protected registry: IBlocRegistry = Blac.instance
     ) {
       // ...
     }
   }
   ```

2. **Update all BlocBase references to use registry**
   - Replace `Blac.registerInstance()` → `this.registry.registerInstance()`
   - Replace `Blac.unregisterInstance()` → `this.registry.unregisterInstance()`
   - Add registry getter for subclasses if needed

3. **Update tests**
   - Create mock registry for isolated tests
   - Inject mock in BlocBase constructor
   - Remove Blac dependencies from BlocBase tests

### Phase 3: Refactor Blac (Days 5-7)

1. **Implement IBlocRegistry**
   ```typescript
   export class Blac implements IBlocRegistry {
     private static _instance: Blac;

     static get instance(): Blac {
       if (!this._instance) {
         this._instance = new Blac();
       }
       return this._instance;
     }

     registerInstance<T>(instance: IBlocInstance<T>): void {
       // Implementation
     }
   }
   ```

2. **Remove direct BlocBase imports**
   - Use IBlocInstance interface instead
   - Type guards for instance checks

3. **Update tests**
   - Test Blac in isolation
   - Use mock instances

### Phase 4: Update Dependent Code (Days 8-10)

1. **Update Bloc and Cubit classes**
   - Pass registry through super() call if needed
   - Ensure compatibility

2. **Update React integration**
   - Check for any direct dependencies
   - Update if necessary

3. **Update plugins**
   - Use interfaces instead of concrete types
   - Update type signatures

### Phase 5: Verification & Documentation (Days 10-12)

1. **Verify no circular dependencies**
   ```bash
   npm install -g madge
   madge --circular packages/blac/src
   ```

2. **Add dependency checks to CI**
   ```json
   {
     "scripts": {
       "check-circular": "madge --circular packages/blac/src --exit"
     }
   }
   ```

3. **Document architecture**
   - Create dependency diagram
   - Add to documentation
   - Write ADR (Architecture Decision Record)

4. **Add ESLint rule**
   ```javascript
   // .eslintrc.js
   module.exports = {
     rules: {
       'import/no-cycle': ['error', { maxDepth: 1 }]
     }
   };
   ```

## Testing Strategy

### Unit Tests
```typescript
describe('BlocBase', () => {
  it('should work with custom registry', () => {
    const mockRegistry: IBlocRegistry = {
      registerInstance: jest.fn(),
      unregisterInstance: jest.fn(),
      getInstance: jest.fn()
    };

    class TestBloc extends BlocBase<number> {
      constructor() {
        super(0, mockRegistry);
      }
    }

    const bloc = new TestBloc();
    expect(mockRegistry.registerInstance).toHaveBeenCalledWith(bloc);
  });

  it('should default to global registry', () => {
    class TestBloc extends BlocBase<number> {
      constructor() {
        super(0); // No registry provided
      }
    }

    const bloc = new TestBloc();
    expect(Blac.instance.getInstance(bloc._id)).toBe(bloc);
  });
});
```

### Integration Tests
- Test full lifecycle with default registry
- Test isolation with custom registry
- Test backwards compatibility

### Circular Dependency Check
```bash
# Should pass
madge --circular packages/blac/src
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking API changes | High | Use dependency injection with sensible defaults, maintain backwards compatibility |
| Increased complexity | Medium | Document clearly, provide examples, gradual migration |
| Performance regression | Low | Benchmark before/after, DI has negligible overhead |
| Test modifications required | Medium | Provide test utilities and examples |

## Migration Guide

### For Library Users
No changes required if using public API normally. Code like this continues to work:
```typescript
class MyBloc extends BlocBase<number> {
  constructor() {
    super(0); // Still works, uses global registry
  }
}
```

### For Advanced Users (Custom Registry)
```typescript
// Now possible:
const customRegistry = new CustomBlocRegistry();

class MyBloc extends BlocBase<number> {
  constructor() {
    super(0, customRegistry); // Custom registry
  }
}
```

### For Plugin Developers
Update type signatures to use interfaces:
```typescript
// Before
import { BlocBase } from '@blac/core';
function myPlugin(bloc: BlocBase<any>) { }

// After
import { IBlocInstance } from '@blac/core';
function myPlugin(bloc: IBlocInstance<any>) { }
```

## Success Metrics

- `madge --circular` reports zero circular dependencies
- All tests pass (100% pass rate)
- TypeScript compilation with no errors
- No performance regression (< 1% overhead)
- Documentation complete with examples
- ESLint rule prevents new circular deps

## Follow-up Tasks

- Apply same pattern to other potential circular dependencies
- Create architecture decision record (ADR)
- Add dependency graph to documentation
- Consider extracting more interfaces for flexibility
- Review plugin system for circular dependencies

## References

- Review Report: `review.md:26-29` (Circular Dependencies section)
- Review Report: `review.md:142-145` (Break Circular Dependencies recommendation)
- Martin Fowler - Dependency Injection: https://martinfowler.com/articles/injection.html
- Circular Dependencies in TypeScript: https://tkdodo.eu/blog/avoiding-use-effect-with-callback-refs
