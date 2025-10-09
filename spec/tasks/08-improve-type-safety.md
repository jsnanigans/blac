# Task: Improve Type Safety

**Priority:** Medium
**Category:** Long-term Architecture
**Estimated Effort:** 2-3 weeks
**Dependencies:**
- Recommended: Complete "Refactor BlocBase" first for cleaner refactoring

## Overview

Eliminate `any` types, strengthen generic constraints, and remove unsafe type assertions to improve type safety and developer experience throughout the codebase.

## Problem Statement

The codebase has several type safety issues that reduce the value of TypeScript:

1. **Extensive use of `any`** - Bypasses type checking in critical areas
2. **Unsafe type assertions** - Uses `as any` to bypass type system
3. **Weak generic constraints** - Generic types too permissive
4. **Missing type guards** - Runtime checks without type narrowing
5. **Inconsistent null handling** - Mix of `| undefined`, `| null`, and optional

These issues lead to:
- Runtime errors that should be caught at compile time
- Poor IDE autocomplete and type hints
- Difficult refactoring
- Hidden bugs
- Worse developer experience

## Specific Type Safety Issues

### 1. Extensive Use of `any`

**Examples from codebase:**

```typescript
// packages/blac/src/BlocBase.ts
private _consumerRefs: Map<string, WeakRef<any>>; // any consumer

// packages/blac/src/Blac.ts
static instances = new Map<string, BlocBase<any>>; // any state

// Multiple unsafe casts
if ((globalThis as any).Blac?.enableLog) {
  (globalThis as any).Blac?.log(...);
}
```

**Impact:**
- No type checking for consumer types
- Can store invalid values in instances map
- Unsafe global access

### 2. Unsafe Type Assertions

**Examples:**

```typescript
// Unsafe assertion to access private properties
const disposalState = (bloc as any)._disposalState;

// Unsafe assertion for event types
const event = data as any;

// Bypass type system
const config = options as any;
```

**Impact:**
- Type system can't help catch errors
- Breaking changes not caught by compiler
- Refactoring becomes dangerous

### 3. Weak Generic Constraints

**Example:**

```typescript
// Too permissive
export type BlocEventConstraint = object;

// Could be stronger
export type BlocStateConstraint = any; // No constraint at all!
```

**Impact:**
- Can pass invalid types
- No guarantee of serialization support
- Harder to reason about valid states

### 4. Missing Type Guards

**Example:**

```typescript
function isActive(state: DisposalState): boolean {
  return state === DisposalState.ACTIVE;
  // Should be: state is DisposalState.ACTIVE (type predicate)
}
```

**Impact:**
- TypeScript can't narrow types
- Need manual type assertions
- More verbose code

## Goals

1. **Eliminate all `any` types** (replace with `unknown` or specific types)
2. **Remove unsafe type assertions** (use proper type guards instead)
3. **Strengthen generic constraints** with meaningful bounds
4. **Add type guards** for runtime checks
5. **Standardize null handling** across codebase

## Acceptance Criteria

### Must Have
- [ ] Zero `any` types in public API
- [ ] All `any` types in internal code replaced with `unknown` or specific types
- [ ] Zero `as any` type assertions
- [ ] Generic constraints added for all type parameters
- [ ] Type guards implemented for all runtime checks
- [ ] Consistent null handling strategy (`| undefined` vs `| null`)

### Should Have
- [ ] Type utility functions for common patterns
- [ ] Branded types for IDs and sensitive values
- [ ] Stricter `tsconfig.json` settings
- [ ] Type tests to verify type safety
- [ ] Documentation of type patterns

### Nice to Have
- [ ] Advanced type utilities (conditional types, mapped types)
- [ ] Runtime validation that syncs with types
- [ ] Type-level unit tests
- [ ] Zod or similar for runtime type validation

## Proposed Type Improvements

### 1. Replace `any` with Specific Types

**Before:**
```typescript
private _consumerRefs: Map<string, WeakRef<any>>;
```

**After:**
```typescript
// Define consumer interface
interface BlocConsumer {
  readonly id: string;
  onUpdate?: (state: unknown) => void;
}

private _consumerRefs: Map<string, WeakRef<BlocConsumer>>;
```

### 2. Replace `any` with `unknown`

**Before:**
```typescript
function handleEvent(event: any): void {
  console.log(event.type); // No type safety
}
```

**After:**
```typescript
function handleEvent(event: unknown): void {
  if (isEventObject(event)) {
    console.log(event.type); // Type safe
  }
}

function isEventObject(value: unknown): value is { type: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as any).type === 'string'
  );
}
```

### 3. Strengthen Generic Constraints

**Before:**
```typescript
export type BlocEventConstraint = object;
export type BlocStateConstraint = any;
```

**After:**
```typescript
// State must be serializable
export type SerializableValue =
  | string
  | number
  | boolean
  | null
  | SerializableArray
  | SerializableObject;

interface SerializableArray extends Array<SerializableValue> {}

interface SerializableObject {
  [key: string]: SerializableValue;
}

export type BlocStateConstraint = SerializableValue;

// Events must have minimal structure
export interface BlocEventBase {
  readonly type?: string;
}

export type BlocEventConstraint = BlocEventBase;
```

### 4. Add Type Guards

**Before:**
```typescript
function checkDisposalState(bloc: BlocBase<any>): boolean {
  return (bloc as any)._disposalState === DisposalState.ACTIVE;
}
```

**After:**
```typescript
// Add public accessor
abstract class BlocBase<TState> {
  get disposalState(): DisposalState {
    return this._disposalState;
  }
}

// Type guard
function isActiveBloc<T>(bloc: BlocBase<T>): bloc is BlocBase<T> & { disposalState: DisposalState.ACTIVE } {
  return bloc.disposalState === DisposalState.ACTIVE;
}

// Usage
if (isActiveBloc(bloc)) {
  // TypeScript knows bloc is active
  bloc.emit(newState);
}
```

### 5. Branded Types for IDs

**Pattern:**
```typescript
// Prevent mixing different ID types
type BlocId = string & { readonly __brand: 'BlocId' };
type ConsumerId = string & { readonly __brand: 'ConsumerId' };

function createBlocId(value: string): BlocId {
  return value as BlocId;
}

function createConsumerId(value: string): ConsumerId {
  return value as ConsumerId;
}

// Now these are distinct types
class BlocBase<TState> {
  readonly id: BlocId;

  registerConsumer(id: ConsumerId, consumer: BlocConsumer): void {
    // Type safe - can't pass BlocId
  }
}
```

### 6. Standardized Null Handling

**Pattern:**
```typescript
// Use undefined for optional values (JavaScript standard)
interface Config {
  name?: string;          // Optional, may be undefined
  description?: string;   // Optional, may be undefined
}

// Use null for explicitly absent values
interface State {
  user: User | null;      // Explicitly null when logged out
  error: Error | null;    // Explicitly null when no error
}

// Avoid mixing
interface BadState {
  value?: string | null;  // ❌ Don't use both
}
```

## Implementation Steps

### Phase 1: Audit & Categorize (Days 1-3)

1. **Find all `any` usage**
   ```bash
   # Find explicit any
   rg "\bany\b" packages/blac/src --type ts -n

   # Find type assertions
   rg "as any" packages/blac/src --type ts -n

   # Find function parameters with any
   rg "\(.*:\s*any" packages/blac/src --type ts -n
   ```

2. **Categorize uses**
   - Categorize by file
   - Categorize by purpose (parameter, return, property)
   - Prioritize by impact (public API first)

3. **Create replacement plan**
   - Document each `any` and its replacement
   - Identify type guards needed
   - Identify new interfaces needed

### Phase 2: Create Type Infrastructure (Days 3-7)

1. **Create type utilities**
   ```typescript
   // packages/blac/src/types/utils.ts
   export type SerializableValue = /* ... */;
   export type BlocId = string & { readonly __brand: 'BlocId' };
   export type ConsumerId = string & { readonly __brand: 'ConsumerId' };

   // Type guards
   export function isSerializable(value: unknown): value is SerializableValue {
     // Implementation
   }

   export function isObject(value: unknown): value is Record<string, unknown> {
     return typeof value === 'object' && value !== null;
   }
   ```

2. **Define constraint types**
   ```typescript
   // packages/blac/src/types/constraints.ts
   export type BlocStateConstraint = SerializableValue;
   export interface BlocEventBase { /* ... */ }
   export type BlocEventConstraint = BlocEventBase;
   ```

3. **Create branded type helpers**
   ```typescript
   // packages/blac/src/types/branded.ts
   export function createBlocId(value: string): BlocId { /* ... */ }
   export function createConsumerId(value: string): ConsumerId { /* ... */ }
   ```

### Phase 3: Replace `any` Types (Days 7-14)

1. **Replace in public API first**
   - BlocBase
   - Bloc
   - Cubit
   - React hooks

2. **Replace in internal code**
   - Subscription manager
   - Observer
   - Adapter
   - ProxyFactory

3. **Replace in plugins**
   - Update plugin interfaces
   - Update existing plugins

### Phase 4: Add Type Guards (Days 14-18)

1. **Implement type guards**
   ```typescript
   // packages/blac/src/guards/index.ts
   export function isBlocInstance<T>(value: unknown): value is BlocBase<T> {
     return value instanceof BlocBase;
   }

   export function isActiveBloc<T>(bloc: BlocBase<T>): bloc is BlocBase<T> {
     return bloc.disposalState === DisposalState.ACTIVE;
   }

   export function isSerializableState(value: unknown): value is SerializableValue {
     // Implementation
   }
   ```

2. **Use guards throughout codebase**
   - Replace `as any` casts
   - Add runtime validation
   - Narrow types properly

### Phase 5: Strengthen TypeScript Config (Days 18-20)

1. **Update `tsconfig.json`**
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "strictNullChecks": true,
       "strictFunctionTypes": true,
       "strictPropertyInitialization": true,
       "noImplicitThis": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noImplicitReturns": true,
       "noFallthroughCasesInSwitch": true,
       "noUncheckedIndexedAccess": true
     }
   }
   ```

2. **Fix all new errors**
   - Address each error
   - Add proper types
   - Fix logic bugs revealed

### Phase 6: Add Type Tests (Days 20-21)

1. **Create type tests**
   ```typescript
   // packages/blac/src/__tests__/types.test.ts
   import { expectType, expectError } from 'tsd';
   import { BlocBase, Cubit } from '../';

   // Test that invalid states are rejected
   expectError<BlocBase<Function>>(); // Functions not serializable

   // Test that valid states are accepted
   expectType<BlocBase<number>>(new class extends Cubit<number> {
     constructor() { super(0); }
   });

   // Test branded types
   const blocId: BlocId = createBlocId('test');
   const consumerId: ConsumerId = createConsumerId('test');
   expectError(consumerId = blocId); // Should not be assignable
   ```

2. **Run type tests in CI**
   ```json
   {
     "scripts": {
       "test:types": "tsd"
     }
   }
   ```

## Testing Strategy

### Type Tests
```typescript
// Use tsd for type-level testing
import { expectType, expectError, expectAssignable } from 'tsd';

describe('Type Safety', () => {
  it('should reject non-serializable states', () => {
    expectError<Cubit<Function>>();
    expectError<Cubit<Symbol>>();
  });

  it('should accept serializable states', () => {
    expectType<Cubit<number>>(new class extends Cubit<number> {
      constructor() { super(0); }
    });

    expectType<Cubit<{ name: string }>>(new class extends Cubit<{ name: string }> {
      constructor() { super({ name: 'test' }); }
    });
  });

  it('should enforce branded type safety', () => {
    const blocId = createBlocId('bloc-1');
    const consumerId = createConsumerId('consumer-1');

    // Should not be assignable
    expectError(blocId = consumerId);
  });
});
```

### Runtime Tests
```typescript
describe('Type Guards', () => {
  it('should correctly identify bloc instances', () => {
    class TestBloc extends Cubit<number> {
      constructor() { super(0); }
    }

    const bloc = new TestBloc();
    const notBloc = { state: 0 };

    expect(isBlocInstance(bloc)).toBe(true);
    expect(isBlocInstance(notBloc)).toBe(false);
  });

  it('should correctly identify active blocs', () => {
    class TestBloc extends Cubit<number> {
      constructor() { super(0); }
    }

    const bloc = new TestBloc();

    expect(isActiveBloc(bloc)).toBe(true);

    await bloc.dispose();

    expect(isActiveBloc(bloc)).toBe(false);
  });
});
```

### Integration Tests
- Verify type safety in React hooks
- Verify type safety in real usage patterns
- Verify no runtime errors from type changes

## Stricter TypeScript Configuration

```json
{
  "compilerOptions": {
    // Strict type checking
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    // Additional checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,

    // Module resolution
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes to public API | High | Gradual migration, deprecation warnings, major version bump |
| Over-constrained generics | Medium | Start conservative, loosen if needed based on feedback |
| Increased complexity | Medium | Good documentation, helper utilities, examples |
| Performance overhead from type guards | Low | Benchmark, make guards efficient, cache results |

## Success Metrics

- Zero `any` types in public API
- <10 `any` types in internal code (documented exceptions)
- Zero `as any` type assertions
- 100% of generic type parameters have constraints
- Type test coverage for all public API
- All TypeScript strict mode checks enabled
- Zero TypeScript errors in CI

## Follow-up Tasks

- Consider runtime validation library (Zod, io-ts)
- Add more advanced type utilities
- Create type-safe plugin system
- Generate TypeScript definitions from runtime schemas
- Consider gradual typing migration guide for users

## References

- Review Report: `review.md:88-95` (Type Safety Issues section)
- Review Report: `review.md:168-172` (Improve Type Safety recommendation)
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/
- TypeScript Deep Dive: https://basarat.gitbook.io/typescript/
- Advanced TypeScript Patterns: https://www.typescriptlang.org/docs/handbook/advanced-types.html
