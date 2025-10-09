# Task: Standardize Patterns

**Priority:** High
**Category:** Short-term Improvements
**Estimated Effort:** 1-2 weeks
**Dependencies:** None

## Overview

Enforce consistent patterns across the codebase for method syntax, return types, and error handling to improve maintainability and reduce developer confusion.

## Problem Statement

The codebase has inconsistent patterns that create confusion and maintenance challenges:

1. **Mixed Method Syntax** - Some methods use arrow functions, others use regular methods
2. **Inconsistent Return Types** - Methods return boolean, void, or throw exceptions unpredictably
3. **No Unified Error Handling** - Different parts of the codebase handle errors differently
4. **Documentation/Implementation Mismatch** - Documentation requires arrow functions but implementation is mixed

These inconsistencies lead to:
- Developer confusion about which pattern to use
- Bugs from incorrect `this` binding
- Unpredictable API behavior
- Difficult code reviews
- Higher learning curve for new contributors

## Specific Problem Areas

### 1. Mixed Method Syntax

**Issue:** Documentation states that arrow functions are required, but implementation mixes both styles.

**Example from review:**
```typescript
// ✅ Arrow function (correct per docs)
increment = () => {
  this.emit(this.state + 1);
};

// ❌ Regular method (works in some contexts, fails in React)
increment() {
  this.emit(this.state + 1);
}
```

**Impact:**
- React hook usage fails with regular methods
- Developers confused about which style to use
- Inconsistent behavior across the codebase

### 2. Inconsistent Return Types

**Examples:**
```typescript
// Returns boolean
function canDispose(): boolean {
  return this._disposalState === DisposalState.ACTIVE;
}

// Returns void
function dispose(): void {
  // ...
}

// Throws exception
function assertActive(): void {
  if (!this.isActive) {
    throw new Error('Not active');
  }
}

// Silent failure (returns void but fails silently)
function emit(state: TState): void {
  if (state === undefined) {
    return; // Silent failure
  }
}
```

**Impact:**
- Difficult to know how to handle errors
- Inconsistent error propagation
- Harder to write robust code

### 3. No Unified Error Handling Strategy

**Current state:**
- Some methods throw exceptions
- Some return error codes/booleans
- Some fail silently
- Some log errors
- No consistent pattern

**Impact:**
- Developers don't know what to expect
- Error handling is incomplete
- Debugging is difficult

## Goals

1. **Enforce arrow function syntax** for all Bloc/Cubit methods
2. **Standardize return types** with clear conventions
3. **Implement unified error handling** strategy
4. **Update documentation** to match implementation
5. **Add linting rules** to enforce standards

## Acceptance Criteria

### Must Have
- [ ] All Bloc/Cubit methods use arrow function syntax
- [ ] Clear return type conventions documented and enforced
- [ ] Unified error handling strategy implemented
- [ ] ESLint rules added to enforce patterns
- [ ] All existing tests updated to match new patterns
- [ ] Documentation updated to reflect standards

### Should Have
- [ ] Migration guide for existing code
- [ ] Code examples demonstrating patterns
- [ ] Pre-commit hooks to enforce standards
- [ ] Codemod/script to auto-migrate existing code

### Nice to Have
- [ ] Interactive documentation showing correct patterns
- [ ] IDE snippets for common patterns
- [ ] Video tutorial on patterns
- [ ] Contribution guide with pattern examples

## Proposed Standards

### Standard 1: Arrow Function Methods

**Rule:** All public methods in Bloc/Cubit classes MUST use arrow function syntax.

**Rationale:**
- Required for proper `this` binding in React
- Consistent with documentation
- Prevents subtle bugs

**Implementation:**
```typescript
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  // ✅ Correct - arrow function
  increment = (): void => {
    this.emit(this.state + 1);
  };

  // ✅ Correct - arrow function with params
  incrementBy = (amount: number): void => {
    this.emit(this.state + amount);
  };

  // ❌ Incorrect - regular method
  decrement() {
    this.emit(this.state - 1);
  }
}
```

**ESLint Rule:**
```javascript
// custom-eslint-rules/arrow-function-bloc-methods.js
module.exports = {
  create(context) {
    return {
      MethodDefinition(node) {
        const className = node.parent.parent.id.name;

        // Check if class extends Bloc or Cubit
        if (extendsBlacClass(className)) {
          if (node.value.type !== 'ArrowFunctionExpression') {
            context.report({
              node,
              message: 'Bloc/Cubit methods must use arrow function syntax'
            });
          }
        }
      }
    };
  }
};
```

### Standard 2: Return Type Conventions

**Rule:** Follow consistent return type patterns based on method purpose.

**Conventions:**

1. **State mutations** → `void`
   ```typescript
   increment = (): void => {
     this.emit(this.state + 1);
   };
   ```

2. **Queries** → Specific type
   ```typescript
   getCount = (): number => {
     return this.state.count;
   };
   ```

3. **Validations** → `boolean` (never throw)
   ```typescript
   canIncrement = (): boolean => {
     return this.state < 100;
   };
   ```

4. **Assertions** → `void` (throws on failure)
   ```typescript
   assertActive = (): void => {
     if (this._disposalState !== DisposalState.ACTIVE) {
       throw new BlocError('Bloc is not active');
     }
   };
   ```

5. **Async operations** → `Promise<void>` or `Promise<T>`
   ```typescript
   dispose = async (): Promise<void> => {
     await this.cleanup();
   };
   ```

**Naming Conventions:**
- Queries: `get*`, `is*`, `has*`
- Validations: `can*`, `should*`, `validate*`
- Assertions: `assert*`, `require*`
- Mutations: Action verbs (`increment`, `update`, `delete`)

### Standard 3: Error Handling Strategy

**Rule:** Use consistent error handling based on error type.

**Conventions:**

1. **Programming errors** (bugs) → Throw immediately
   ```typescript
   emit = (state: TState): void => {
     if (state === undefined) {
       throw new BlocError(
         'Cannot emit undefined state',
         BlocErrorType.INVALID_STATE_UPDATE
       );
     }
     // ...
   };
   ```

2. **Operational errors** (expected) → Error events + return/throw based on strictMode
   ```typescript
   dispose = async (): Promise<void> => {
     if (this._disposalState !== DisposalState.ACTIVE) {
       this.emitError(
         BlocErrorType.DISPOSAL_VIOLATION,
         'Bloc already disposed'
       );

       if (Blac.config.strictMode) {
         throw new BlocError('Bloc already disposed');
       }
       return;
     }
     // ...
   };
   ```

3. **Validation errors** → Return false (never throw)
   ```typescript
   canEmit = (state: TState): boolean => {
     return state !== undefined && this.isActive;
   };
   ```

**Error Class Hierarchy:**
```typescript
// packages/blac/src/errors/BlocError.ts
export class BlocError extends Error {
  constructor(
    message: string,
    public readonly type: BlocErrorType,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'BlocError';
  }
}

export class BlocDisposalError extends BlocError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, BlocErrorType.DISPOSAL_VIOLATION, details);
    this.name = 'BlocDisposalError';
  }
}

export class BlocStateError extends BlocError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, BlocErrorType.INVALID_STATE_UPDATE, details);
    this.name = 'BlocStateError';
  }
}
```

## Implementation Steps

### Phase 1: Audit & Document (Days 1-3)

1. **Audit current codebase**
   ```bash
   # Find all methods in Bloc/Cubit classes
   rg "^\s*(async\s+)?(\w+)\s*\(" packages/blac/src --type ts -A 3

   # Find arrow function methods
   rg "^\s*(\w+)\s*=\s*(\(.*\))?\s*=>" packages/blac/src --type ts -A 3
   ```

2. **Categorize inconsistencies**
   - List all methods using regular syntax
   - List all methods with inconsistent return types
   - List all methods with inconsistent error handling

3. **Document standards**
   - Create style guide
   - Create examples
   - Create decision matrix

### Phase 2: Create Error Classes (Days 3-5)

1. **Define error hierarchy**
   ```typescript
   // packages/blac/src/errors/index.ts
   export * from './BlocError';
   export * from './BlocDisposalError';
   export * from './BlocStateError';
   export * from './BlocLifecycleError';
   ```

2. **Implement error classes**
   - Base BlocError
   - Specific error types
   - Error factory methods

3. **Add error tests**
   - Test error creation
   - Test error properties
   - Test error messages

### Phase 3: Implement ESLint Rules (Days 5-7)

1. **Create custom ESLint rules**
   ```typescript
   // .eslintrc.js
   module.exports = {
     rules: {
       '@blac/arrow-function-methods': 'error',
       '@blac/consistent-return-types': 'warn',
       '@blac/consistent-error-handling': 'warn'
     }
   };
   ```

2. **Test ESLint rules**
   - Create test cases
   - Verify detection
   - Verify auto-fix (where applicable)

3. **Add to CI**
   - Run ESLint in CI
   - Fail on errors
   - Warn on style issues

### Phase 4: Migrate Codebase (Days 7-12)

1. **Create migration script**
   ```typescript
   // scripts/migrate-to-arrow-functions.ts
   import * as ts from 'typescript';

   function migrateMethod(method: ts.MethodDeclaration): string {
     // Convert regular method to arrow function
     const name = method.name.getText();
     const params = method.parameters.map(p => p.getText()).join(', ');
     const returnType = method.type?.getText() ?? 'void';
     const body = method.body?.getText() ?? '{}';

     return `${name} = (${params}): ${returnType} => ${body}`;
   }
   ```

2. **Migrate core packages**
   - Run migration script on packages/blac
   - Run migration script on packages/blac-react
   - Manually review changes

3. **Update tests**
   - Fix any broken tests
   - Add tests for new patterns
   - Verify all tests pass

4. **Migrate examples and demos**
   - Update demo apps
   - Update documentation examples
   - Update README examples

### Phase 5: Documentation & Guidelines (Days 12-14)

1. **Update documentation**
   - Style guide
   - Contribution guide
   - Migration guide
   - API documentation

2. **Create examples**
   - Good/bad examples
   - Before/after examples
   - Common mistakes

3. **Add IDE support**
   - VSCode snippets
   - TypeScript config
   - Prettier config

## Testing Strategy

### ESLint Rule Tests
```typescript
import { RuleTester } from 'eslint';
import arrowFunctionMethods from './arrow-function-methods';

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  }
});

ruleTester.run('arrow-function-methods', arrowFunctionMethods, {
  valid: [
    {
      code: `
        class MyCubit extends Cubit<number> {
          increment = (): void => {
            this.emit(this.state + 1);
          };
        }
      `
    }
  ],
  invalid: [
    {
      code: `
        class MyCubit extends Cubit<number> {
          increment() {
            this.emit(this.state + 1);
          }
        }
      `,
      errors: [{ message: 'Bloc/Cubit methods must use arrow function syntax' }]
    }
  ]
});
```

### Migration Tests
- Test migration script on sample code
- Verify output is valid TypeScript
- Verify runtime behavior unchanged
- Verify tests still pass

### Integration Tests
- Test error handling in real scenarios
- Test return types work as expected
- Test arrow functions work in React

## Style Guide

### Method Patterns

```typescript
class ExampleBloc extends Bloc<State, Events> {
  // ✅ State mutations - void return
  increment = (): void => {
    this.add(new IncrementEvent());
  };

  // ✅ Queries - specific return type
  getCount = (): number => {
    return this.state.count;
  };

  // ✅ Validations - boolean return, never throw
  canIncrement = (): boolean => {
    return this.state.count < 100;
  };

  // ✅ Assertions - void return, throws on failure
  assertActive = (): void => {
    if (!this.isActive) {
      throw new BlocDisposalError('Bloc is not active');
    }
  };

  // ✅ Async operations - Promise return
  loadData = async (): Promise<void> => {
    const data = await fetchData();
    this.emit(data);
  };

  // ❌ Don't mix patterns
  badMethod() { // Should be arrow function
    return true; // Unclear purpose
  }
}
```

### Error Handling Patterns

```typescript
class ExampleCubit extends Cubit<number> {
  // ✅ Programming errors - throw immediately
  emit = (state: number): void => {
    if (state === undefined) {
      throw new BlocStateError('Cannot emit undefined');
    }
    super.emit(state);
  };

  // ✅ Operational errors - emit error event + conditional throw
  dispose = async (): Promise<void> => {
    if (this.isDisposed) {
      this.emitError(
        BlocErrorType.DISPOSAL_VIOLATION,
        'Already disposed'
      );

      if (Blac.config.strictMode) {
        throw new BlocDisposalError('Already disposed');
      }
      return;
    }

    await super.dispose();
  };

  // ✅ Validation - return boolean
  isValidState = (state: number): boolean => {
    return state >= 0 && state <= 100;
  };
}
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes for existing code | High | Provide migration script, deprecation warnings, gradual rollout |
| Arrow functions increase bundle size | Low | Minimal impact, measure and document |
| ESLint rules too strict | Medium | Make some rules warnings, allow escape hatches |
| Migration script introduces bugs | High | Extensive testing, manual review of changes |

## Migration Guide for Users

### Migrating Methods

**Before:**
```typescript
class CounterBloc extends Bloc<number, Events> {
  increment() { // Regular method
    this.add(new IncrementEvent());
  }
}
```

**After:**
```typescript
class CounterBloc extends Bloc<number, Events> {
  increment = (): void => { // Arrow function
    this.add(new IncrementEvent());
  };
}
```

### Migrating Error Handling

**Before:**
```typescript
dispose() {
  if (this.isDisposed) {
    return; // Silent failure
  }
  // ...
}
```

**After:**
```typescript
dispose = async (): Promise<void> => {
  if (this.isDisposed) {
    if (Blac.config.strictMode) {
      throw new BlocDisposalError('Already disposed');
    }
    return;
  }
  // ...
};
```

## Success Metrics

- 100% of Bloc/Cubit methods use arrow functions
- Zero ESLint violations in core packages
- Consistent return types across all methods
- Unified error handling strategy documented and implemented
- Migration guide complete
- All tests passing

## Follow-up Tasks

- Create video tutorial on patterns
- Add interactive documentation
- Create more code examples
- Consider automated migration tool for users
- Gather feedback on patterns

## References

- Review Report: `review.md:96-113` (Inconsistent Patterns section)
- Review Report: `review.md:161-165` (Standardize Patterns recommendation)
- CLAUDE.md:54-71 (Arrow function requirement)
- TypeScript Style Guide: https://google.github.io/styleguide/tsguide.html
