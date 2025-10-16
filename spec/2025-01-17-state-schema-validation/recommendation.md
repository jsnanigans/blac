# State Schema Validation - Implementation Recommendation

**Feature**: Integrate Standard Schema-based state validation into BlaC
**Date**: 2025-01-17
**Status**: Recommended Approach
**Decision**: Option A - Static Schema Property

---

## Executive Summary

This document provides the detailed implementation plan for integrating Standard Schema validation into BlaC using a **static schema property** pattern. This approach provides runtime state integrity checking with zero dependencies, minimal overhead, and excellent developer experience.

### Key Benefits

✅ **Simple**: Matches existing BlaC patterns (`static isolated`, `static keepAlive`)
✅ **Zero Overhead**: No schema = no validation checks
✅ **Type Safe**: Enhanced with type helper utilities
✅ **Flexible**: Works with any Standard Schema library (Zod, Valibot, etc.)
✅ **Robust**: Graceful degradation when schema not defined
✅ **Persistence Ready**: Easy integration with persistence plugin

---

## Architecture Overview

### Core Integration Points

```
User Bloc/Cubit
    ↓
1. Define: static schema = MySchema
    ↓
2. Constructor: Load schema, validate initial state
    ↓
3. emit(): Validate → Transform → Notify
    ↓
4. PersistencePlugin: Access schema for save/restore
```

### Validation Flow

```typescript
emit(newState) {
  // 1. Identity check (Object.is)
  if (Object.is(newState, this.state)) return;

  // 2. Lifecycle check (ACTIVE?)
  if (!isActive) return;

  // 3. Undefined check
  if (newState === undefined) return;

  // 4. 🔍 SCHEMA VALIDATION (NEW)
  if (this._schema) {
    newState = this._validateState(newState);
    // Throws BlocValidationError on failure
  }

  // 5. Update internal state
  this._state = newState;

  // 6. Plugin transform
  const transformed = this._plugins.transformState(oldState, newState);

  // 7. Notifications...
}
```

---

## Detailed Implementation

### 1. Standard Schema Type Definitions

**File**: `packages/blac/src/validation/types.ts`

```typescript
/**
 * Standard Schema V1 type definitions
 * Based on: https://github.com/standard-schema/standard-schema
 */

/**
 * Standard Schema V1 interface
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}

export namespace StandardSchemaV1 {
  /**
   * Standard Schema properties
   */
  export interface Props<Input = unknown, Output = Input> {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown
    ) => Result<Output> | Promise<Result<Output>>;
    readonly types?: Types<Input, Output> | undefined;
  }

  /**
   * Validation result types
   */
  export type Result<Output> = SuccessResult<Output> | FailureResult;

  export interface SuccessResult<Output> {
    readonly value: Output;
    readonly issues?: undefined;
  }

  export interface FailureResult {
    readonly issues: ReadonlyArray<Issue>;
  }

  /**
   * Validation issue
   */
  export interface Issue {
    readonly message: string;
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
  }

  export interface PathSegment {
    readonly key: PropertyKey;
  }

  /**
   * Type information for static inference
   */
  export interface Types<Input = unknown, Output = Input> {
    readonly input: Input;
    readonly output: Output;
  }
}

/**
 * Extract input type from Standard Schema
 */
export type InferInput<TSchema> = TSchema extends StandardSchemaV1<
  infer Input,
  any
>
  ? Input
  : never;

/**
 * Extract output type from Standard Schema
 */
export type InferOutput<TSchema> = TSchema extends StandardSchemaV1<
  any,
  infer Output
>
  ? Output
  : never;

/**
 * Type helper to validate schema matches state type
 * Usage: static schema: ValidateSchema<number, typeof MySchema> = MySchema;
 */
export type ValidateSchema<
  TState,
  TSchema extends StandardSchemaV1<any, TState>
> = TSchema;

/**
 * Type guard to check if value is a Standard Schema
 */
export function isStandardSchema(
  value: unknown
): value is StandardSchemaV1<unknown, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    '~standard' in value &&
    typeof (value as any)['~standard'] === 'object' &&
    (value as any)['~standard'].version === 1 &&
    typeof (value as any)['~standard'].validate === 'function'
  );
}
```

---

### 2. Validation Error Class

**File**: `packages/blac/src/validation/BlocValidationError.ts`

```typescript
import { StandardSchemaV1 } from './types';

/**
 * Error thrown when state validation fails
 */
export class BlocValidationError extends Error {
  readonly name = 'BlocValidationError';

  constructor(
    public readonly issues: readonly StandardSchemaV1.Issue[],
    public readonly attemptedState: unknown,
    public readonly currentState: unknown,
    public readonly blocName: string
  ) {
    const summary = BlocValidationError.formatIssues(issues);
    super(`[${blocName}] State validation failed: ${summary}`);

    // Maintain proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BlocValidationError);
    }
  }

  /**
   * Get the first validation issue
   */
  get firstIssue(): StandardSchemaV1.Issue {
    return this.issues[0]!;
  }

  /**
   * Check if a specific path has a validation issue
   */
  hasIssueAt(path: string): boolean {
    return this.issues.some(
      (issue) => issue.path && this.formatPath(issue.path) === path
    );
  }

  /**
   * Get all issues for a specific path
   */
  getIssuesAt(path: string): StandardSchemaV1.Issue[] {
    return this.issues.filter(
      (issue) => issue.path && this.formatPath(issue.path) === path
    );
  }

  /**
   * Format issue path as string (e.g., "user.address.city")
   */
  private formatPath(path: readonly (PropertyKey | StandardSchemaV1.PathSegment)[]): string {
    return path
      .map((segment) => {
        if (typeof segment === 'object' && 'key' in segment) {
          return String(segment.key);
        }
        return String(segment);
      })
      .join('.');
  }

  /**
   * Format multiple issues into readable summary
   */
  private static formatIssues(issues: readonly StandardSchemaV1.Issue[]): string {
    if (issues.length === 0) {
      return 'Unknown validation error';
    }

    if (issues.length === 1) {
      const issue = issues[0]!;
      if (issue.path && issue.path.length > 0) {
        const path = issue.path
          .map((p) => (typeof p === 'object' && 'key' in p ? p.key : p))
          .join('.');
        return `${path}: ${issue.message}`;
      }
      return issue.message;
    }

    // Multiple issues
    return `${issues.length} validation issue(s)`;
  }

  /**
   * Convert to JSON-serializable format
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      blocName: this.blocName,
      issues: this.issues.map((issue) => ({
        message: issue.message,
        path: issue.path
          ? issue.path.map((p) =>
              typeof p === 'object' && 'key' in p ? p.key : p
            )
          : undefined,
      })),
      attemptedState: this.attemptedState,
      currentState: this.currentState,
    };
  }
}
```

---

### 3. BlocBase Integration

**File**: `packages/blac/src/BlocBase.ts` (modifications)

```typescript
import { StandardSchemaV1, isStandardSchema } from './validation/types';
import { BlocValidationError } from './validation/BlocValidationError';

interface BlocStaticProperties {
  isolated: boolean;
  keepAlive: boolean;
  plugins?: BlocPlugin<any, any>[];
  schema?: StandardSchemaV1<any>; // ← NEW
}

export abstract class BlocBase<S> {
  // ... existing properties ...

  /**
   * Schema for state validation (optional)
   */
  protected _schema?: StandardSchemaV1<any, S>;

  constructor(initialState: S) {
    // ... existing initialization ...

    // Initialize schema from static property
    const Constructor = this.constructor as typeof BlocBase &
      BlocStaticProperties;

    if (Constructor.schema) {
      if (!isStandardSchema(Constructor.schema)) {
        throw new Error(
          `[${this._name}] Schema must implement StandardSchemaV1 interface`
        );
      }
      this._schema = Constructor.schema;
    }

    // Validate initial state if schema defined
    if (this._schema) {
      initialState = this._validateState(initialState);
    }

    this._state = initialState;

    // ... rest of initialization ...
  }

  /**
   * Validate state against schema
   * @internal
   */
  protected _validateState(state: S): S {
    if (!this._schema) {
      return state;
    }

    const result = this._schema['~standard'].validate(state);

    // Check if validation is async (not supported)
    if (result instanceof Promise) {
      throw new Error(
        `[${this._name}] Async schema validation not supported. ` +
          `State validation must be synchronous. ` +
          `Use async validation in event handlers before calling emit().`
      );
    }

    // Check if validation failed
    if ('issues' in result) {
      throw new BlocValidationError(
        result.issues,
        state,
        this._state,
        this._name
      );
    }

    // Return validated value (may differ due to coercion/defaults)
    return result.value;
  }

  /**
   * Internal state push method (MODIFIED)
   */
  _pushState(newState: S, oldState: S, action?: unknown): void {
    const currentState = this._lifecycleManager.currentState;

    // Lifecycle check
    if (currentState !== BlocLifecycleState.ACTIVE) {
      this.blacInstance?.error(
        `[${this._name}:${this._id}] Cannot emit state on ${currentState} bloc. ` +
          `State update ignored.`
      );
      return;
    }

    // Undefined check
    if (newState === undefined) {
      return;
    }

    // 🔍 VALIDATION (NEW)
    if (this._schema) {
      try {
        newState = this._validateState(newState);
      } catch (error) {
        // Re-throw validation errors
        if (error instanceof BlocValidationError) {
          throw error;
        }
        // Wrap other errors
        throw new Error(
          `[${this._name}] State validation failed: ${error}`
        );
      }
    }

    // Update internal state
    this._state = newState;

    // Apply plugins (transform may occur after validation)
    const transformedState = this._plugins.transformState(
      oldState,
      newState
    ) as S;
    this._state = transformedState;

    // ... rest of method unchanged ...
  }

  // ========================================
  // Public validation helper methods (NEW)
  // ========================================

  /**
   * Validate a value against the bloc's schema without emitting
   * @param value - Value to validate
   * @returns Validation result object
   * @throws {Error} If no schema is defined
   */
  validate(value: unknown): ValidationResult<S> {
    if (!this._schema) {
      throw new Error(
        `[${this._name}] Cannot validate: No schema defined. ` +
          `Define 'static schema' property to enable validation.`
      );
    }

    const result = this._schema['~standard'].validate(value);

    if (result instanceof Promise) {
      throw new Error(
        `[${this._name}] Async validation not supported in validate() method`
      );
    }

    if ('issues' in result) {
      return {
        success: false,
        issues: result.issues,
      };
    }

    return {
      success: true,
      value: result.value,
    };
  }

  /**
   * Check if a value is valid according to the bloc's schema
   * @param value - Value to check
   * @returns true if valid or no schema defined, false if invalid
   */
  isValid(value: unknown): value is S {
    if (!this._schema) {
      return true; // No schema = always valid
    }

    const result = this._schema['~standard'].validate(value);

    if (result instanceof Promise) {
      return false; // Async validation considered invalid
    }

    return !('issues' in result);
  }

  /**
   * Parse and validate a value, throwing on error
   * Mirrors Zod's parse() / Valibot's parse()
   * @param value - Value to parse
   * @returns Validated value
   * @throws {BlocValidationError} If validation fails
   * @throws {Error} If no schema defined
   */
  parse(value: unknown): S {
    const result = this.validate(value);

    if (!result.success) {
      throw new BlocValidationError(
        result.issues,
        value,
        this._state,
        this._name
      );
    }

    return result.value;
  }

  /**
   * Parse and validate a value, returning result object
   * Mirrors Zod's safeParse() / Valibot's safeParse()
   * @param value - Value to parse
   * @returns Result object with success flag
   */
  safeParse(value: unknown): SafeParseResult<S> {
    try {
      const result = this.validate(value);

      if (!result.success) {
        return {
          success: false,
          error: new BlocValidationError(
            result.issues,
            value,
            this._state,
            this._name
          ),
        };
      }

      return {
        success: true,
        value: result.value,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get the schema for this bloc (if defined)
   * @returns Schema or undefined
   */
  get schema(): StandardSchemaV1<any, S> | undefined {
    return this._schema;
  }
}

// Type definitions for validation results
export type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; issues: readonly StandardSchemaV1.Issue[] };

export type SafeParseResult<T> =
  | { success: true; value: T }
  | { success: false; error: Error };
```

---

### 4. Persistence Plugin Integration

**File**: `packages/plugins/bloc/persistence/src/PersistencePlugin.ts` (modifications)

```typescript
import { StandardSchemaV1, isStandardSchema } from '@blac/core';

export interface PersistenceOptions<T> extends SerializationOptions<T> {
  // ... existing options ...

  /**
   * Schema for state validation
   * - If provided: Use this schema (overrides bloc's schema)
   * - If undefined: Use bloc's schema if available
   * - If null: Disable validation even if bloc has schema
   */
  schema?: StandardSchemaV1<any, T> | null;

  /**
   * When to validate persisted state
   */
  validation?: {
    /**
     * Validate before saving state
     * @default true
     */
    onSave?: boolean;

    /**
     * Validate after restoring state
     * @default true
     */
    onRestore?: boolean;
  };
}

export class PersistencePlugin<TState> implements BlocPlugin<TState> {
  // ... existing properties ...

  private schema?: StandardSchemaV1<any, TState> | null;
  private validateOnSave: boolean;
  private validateOnRestore: boolean;

  constructor(options: PersistenceOptions<TState>) {
    this.options = options;
    this.schema = options.schema;
    this.validateOnSave = options.validation?.onSave ?? true;
    this.validateOnRestore = options.validation?.onRestore ?? true;

    // ... existing initialization ...
  }

  /**
   * Get effective schema (plugin schema or bloc schema)
   */
  private getSchema(bloc: BlocBase<TState>): StandardSchemaV1<any, TState> | undefined {
    // If plugin explicitly sets schema to null, disable validation
    if (this.schema === null) {
      return undefined;
    }

    // If plugin provides schema, use it
    if (this.schema !== undefined) {
      return this.schema;
    }

    // Otherwise, try to get bloc's schema
    return (bloc as any)._schema || (bloc.constructor as any).schema;
  }

  async onAttach(bloc: BlocBase<TState>): Promise<void> {
    if (this.isHydrating) {
      return;
    }

    this.isHydrating = true;

    try {
      // Try migrations first
      if (this.options.migrations) {
        const migrated = await this.tryMigrations(bloc);
        if (migrated) {
          (bloc as any).emit(migrated);
          return;
        }
      }

      // Try to restore state from storage
      const storedData = await Promise.resolve(this.storage.getItem(this.key));
      if (storedData) {
        let state: TState | Partial<TState>;

        // Handle encryption
        if (this.options.encrypt) {
          const decrypted = await Promise.resolve(
            this.options.encrypt.decrypt(storedData)
          );
          state = this.deserialize(decrypted);
        } else {
          state = this.deserialize(storedData);
        }

        // Validate restored state
        if (this.validateOnRestore) {
          const schema = this.getSchema(bloc);
          if (schema) {
            const result = schema['~standard'].validate(state);

            if (result instanceof Promise) {
              throw new Error('Async validation not supported in persistence');
            }

            if ('issues' in result) {
              const error = new Error(
                `Persisted state validation failed: ${result.issues.length} issue(s)`
              );
              this.handleError(error, 'load');
              // Don't restore invalid state
              return;
            }

            // Use validated state (may have coerced values)
            state = result.value;
          }
        }

        // Handle selective persistence
        if (this.options.select && this.options.merge) {
          const mergedState = this.options.merge(
            state as Partial<TState>,
            bloc.state
          );
          (bloc as any).emit(mergedState);
        } else {
          (bloc as any).emit(state);
        }
      }
    } catch (error) {
      this.handleError(error as Error, 'load');
    } finally {
      this.isHydrating = false;
    }
  }

  private async saveState(state: TState): Promise<void> {
    if (this.isSaving) {
      // Queue another save
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
      }
      this.saveTimer = setTimeout(() => {
        void this.saveState(state);
      }, this.debounceMs || 10);
      return;
    }

    this.isSaving = true;

    try {
      let dataToStore: string;

      // Handle selective persistence
      const stateToSave = this.options.select
        ? (this.options.select(state) ?? state)
        : state;

      // Validate before saving
      if (this.validateOnSave) {
        const schema = this.getSchema(this.bloc!);
        if (schema) {
          const result = schema['~standard'].validate(stateToSave);

          if (result instanceof Promise) {
            throw new Error('Async validation not supported in persistence');
          }

          if ('issues' in result) {
            const error = new Error(
              `State validation failed before save: ${result.issues.length} issue(s)`
            );
            this.handleError(error, 'save');
            return; // Don't save invalid state
          }

          // Use validated state
          const serialized = this.serialize(result.value as TState);
          dataToStore = serialized;
        } else {
          // No schema, serialize as-is
          const serialized = this.serialize(stateToSave as TState);
          dataToStore = serialized;
        }
      } else {
        // No validation, serialize as-is
        const serialized = this.serialize(stateToSave as TState);
        dataToStore = serialized;
      }

      // Handle encryption
      if (this.options.encrypt) {
        dataToStore = await Promise.resolve(
          this.options.encrypt.encrypt(dataToStore)
        );
      }

      // Save state
      await Promise.resolve(this.storage.setItem(this.key, dataToStore));

      // ... rest of method unchanged ...
    } catch (error) {
      this.handleError(error as Error, 'save');
    } finally {
      this.isSaving = false;
    }
  }

  private async tryMigrations(bloc: BlocBase<TState>): Promise<TState | null> {
    if (!this.options.migrations) return null;

    for (const migration of this.options.migrations) {
      try {
        const oldData = await Promise.resolve(
          this.storage.getItem(migration.from)
        );
        if (oldData) {
          const parsed = JSON.parse(oldData);
          const migrated = migration.transform
            ? migration.transform(parsed)
            : parsed;

          // Validate migrated data
          if (migration.schema) {
            const result = migration.schema['~standard'].validate(migrated);

            if (result instanceof Promise) {
              throw new Error('Async validation not supported in migrations');
            }

            if ('issues' in result) {
              throw new Error(
                `Migration validation failed: ${result.issues.length} issue(s)`
              );
            }

            // Use validated migrated data
            const serialized = this.serialize(result.value);
            await Promise.resolve(this.storage.setItem(this.key, serialized));
            await Promise.resolve(this.storage.removeItem(migration.from));

            return result.value;
          } else {
            // No schema validation for migration
            const serialized = this.serialize(migrated);
            await Promise.resolve(this.storage.setItem(this.key, serialized));
            await Promise.resolve(this.storage.removeItem(migration.from));

            return migrated;
          }
        }
      } catch (error) {
        this.handleError(error as Error, 'migrate');
      }
    }

    return null;
  }
}
```

**Update migration type**:

```typescript
export interface PersistenceMigration<T> {
  from: string;
  transform?: (oldData: any) => T;
  schema?: StandardSchemaV1<any, T>; // ← NEW: Optional validation for migration output
}
```

---

### 5. Export Updates

**File**: `packages/blac/src/index.ts`

```typescript
// ... existing exports ...

// Validation
export {
  StandardSchemaV1,
  InferInput,
  InferOutput,
  ValidateSchema,
  isStandardSchema,
} from './validation/types';

export { BlocValidationError } from './validation/BlocValidationError';

export type { ValidationResult, SafeParseResult } from './BlocBase';
```

---

## Usage Examples

### Basic Usage

```typescript
import { z } from 'zod';
import { Cubit } from '@blac/core';

// Define schema
const CounterSchema = z.number().int().min(0).max(100);

// Define Cubit with validation
class CounterCubit extends Cubit<number> {
  static schema = CounterSchema;

  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };

  reset = () => {
    this.emit(0);
  };
}

// Usage
const counter = new CounterCubit();
counter.increment(); // ✓ Valid: 1
counter.emit(50);    // ✓ Valid: 50
counter.emit(200);   // ✗ Throws: BlocValidationError (max is 100)
counter.emit(-5);    // ✗ Throws: BlocValidationError (min is 0)
```

### Complex State Schema

```typescript
import { z } from 'zod';
import { Bloc } from '@blac/core';

// Define complex state schema
const UserStateSchema = z.object({
  user: z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().int().min(0).max(150),
    })
    .nullable(),
  isAuthenticated: z.boolean(),
  lastLogin: z.date().optional(),
});

type UserState = z.infer<typeof UserStateSchema>;

// Define events
class LoginEvent {
  constructor(public user: UserState['user']) {}
}

class LogoutEvent {}

// Define Bloc with validation
class AuthBloc extends Bloc<UserState, LoginEvent | LogoutEvent> {
  static schema = UserStateSchema;

  constructor() {
    super({
      user: null,
      isAuthenticated: false,
    });

    this.on(LoginEvent, (event, emit) => {
      emit({
        user: event.user,
        isAuthenticated: true,
        lastLogin: new Date(),
      });
    });

    this.on(LogoutEvent, (event, emit) => {
      emit({
        user: null,
        isAuthenticated: false,
      });
    });
  }
}
```

### Error Handling

```typescript
const counter = new CounterCubit();

try {
  counter.emit(200);
} catch (error) {
  if (error instanceof BlocValidationError) {
    console.error('Validation failed:', error.message);
    console.error('Issues:', error.issues);
    console.error('Attempted state:', error.attemptedState);
    console.error('Current state:', error.currentState);

    // Access specific issue
    const firstIssue = error.firstIssue;
    console.error('First issue:', firstIssue.message);

    // Check if specific field has error
    if (error.hasIssueAt('count')) {
      console.error('Count field has validation error');
    }

    // Get all issues for specific field
    const issues = error.getIssuesAt('user.email');
    issues.forEach((issue) => console.error(issue.message));
  }
}
```

### Helper Methods

```typescript
const counter = new CounterCubit();

// Check if value is valid
if (counter.isValid(50)) {
  counter.emit(50); // Safe to emit
}

// Validate without emitting
const result = counter.validate(200);
if (result.success) {
  console.log('Valid:', result.value);
} else {
  console.error('Invalid:', result.issues);
}

// Parse with error
try {
  const validated = counter.parse(userInput);
  counter.emit(validated);
} catch (error) {
  console.error('Parsing failed:', error);
}

// Safe parse (no throw)
const safeResult = counter.safeParse(userInput);
if (safeResult.success) {
  counter.emit(safeResult.value);
} else {
  console.error('Validation failed:', safeResult.error);
}
```

### With Persistence

```typescript
import { PersistencePlugin } from '@blac/plugin-persistence';

const CounterSchema = z.number().int().min(0);

class CounterCubit extends Cubit<number> {
  static schema = CounterSchema;

  static plugins = [
    new PersistencePlugin({
      key: 'counter',
      // Plugin uses bloc's schema automatically
      // Can override with: schema: CounterSchema
      validation: {
        onSave: true,    // Validate before saving
        onRestore: true, // Validate after restoring
      },
    }),
  ];

  constructor() {
    super(0);
  }
}
```

### Schema Migrations

```typescript
// Old schema (v1)
const UserSchemaV1 = z.object({
  name: z.string(),
  email: z.string(),
});

// New schema (v2)
const UserSchemaV2 = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().default(0), // New field with default
});

class UserCubit extends Cubit<z.infer<typeof UserSchemaV2>> {
  static schema = UserSchemaV2;

  static plugins = [
    new PersistencePlugin({
      key: 'user',
      migrations: [
        {
          from: 'user-v1',
          transform: (oldData) => ({
            ...oldData,
            age: 0, // Add missing field
          }),
          schema: UserSchemaV2, // Validate migration output
        },
      ],
    }),
  ];
}
```

---

## Testing Strategy

### Unit Tests

**File**: `packages/blac/src/__tests__/validation.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { Cubit } from '../Cubit';
import { BlocValidationError } from '../validation/BlocValidationError';
import { StandardSchemaV1 } from '../validation/types';

// Mock schema for testing
function createNumberSchema(): StandardSchemaV1<number> {
  return {
    '~standard': {
      version: 1,
      vendor: 'test',
      validate: (value) => {
        if (typeof value !== 'number') {
          return {
            issues: [{ message: 'Expected number' }],
          };
        }
        if (value < 0) {
          return {
            issues: [{ message: 'Number must be >= 0' }],
          };
        }
        return { value };
      },
    },
  };
}

describe('State Schema Validation', () => {
  describe('Schema Definition', () => {
    it('should accept valid initial state', () => {
      class TestCubit extends Cubit<number> {
        static schema = createNumberSchema();
      }

      const cubit = new TestCubit(0);
      expect(cubit.state).toBe(0);
    });

    it('should reject invalid initial state', () => {
      class TestCubit extends Cubit<number> {
        static schema = createNumberSchema();
      }

      expect(() => new TestCubit(-1)).toThrow(BlocValidationError);
    });
  });

  describe('State Emission', () => {
    it('should validate on emit', () => {
      class TestCubit extends Cubit<number> {
        static schema = createNumberSchema();
        constructor() {
          super(0);
        }
      }

      const cubit = new TestCubit();
      cubit.emit(5); // Valid
      expect(cubit.state).toBe(5);
    });

    it('should throw on invalid emit', () => {
      class TestCubit extends Cubit<number> {
        static schema = createNumberSchema();
        constructor() {
          super(0);
        }
      }

      const cubit = new TestCubit();
      expect(() => cubit.emit(-1)).toThrow(BlocValidationError);
      expect(cubit.state).toBe(0); // State unchanged
    });

    it('should not validate without schema', () => {
      class TestCubit extends Cubit<number> {
        constructor() {
          super(0);
        }
      }

      const cubit = new TestCubit();
      cubit.emit(-1); // No validation
      expect(cubit.state).toBe(-1); // Accepts invalid value
    });
  });

  describe('Helper Methods', () => {
    class TestCubit extends Cubit<number> {
      static schema = createNumberSchema();
      constructor() {
        super(0);
      }
    }

    it('validate() should return success for valid value', () => {
      const cubit = new TestCubit();
      const result = cubit.validate(5);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(5);
      }
    });

    it('validate() should return failure for invalid value', () => {
      const cubit = new TestCubit();
      const result = cubit.validate(-1);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.length).toBeGreaterThan(0);
      }
    });

    it('isValid() should return true for valid value', () => {
      const cubit = new TestCubit();
      expect(cubit.isValid(5)).toBe(true);
    });

    it('isValid() should return false for invalid value', () => {
      const cubit = new TestCubit();
      expect(cubit.isValid(-1)).toBe(false);
    });

    it('parse() should return value for valid input', () => {
      const cubit = new TestCubit();
      expect(cubit.parse(5)).toBe(5);
    });

    it('parse() should throw for invalid input', () => {
      const cubit = new TestCubit();
      expect(() => cubit.parse(-1)).toThrow(BlocValidationError);
    });

    it('safeParse() should return success for valid input', () => {
      const cubit = new TestCubit();
      const result = cubit.safeParse(5);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(5);
      }
    });

    it('safeParse() should return error for invalid input', () => {
      const cubit = new TestCubit();
      const result = cubit.safeParse(-1);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(BlocValidationError);
      }
    });
  });

  describe('BlocValidationError', () => {
    it('should contain all error information', () => {
      class TestCubit extends Cubit<number> {
        static schema = createNumberSchema();
        constructor() {
          super(0);
        }
      }

      const cubit = new TestCubit();
      try {
        cubit.emit(-1);
      } catch (error) {
        expect(error).toBeInstanceOf(BlocValidationError);
        if (error instanceof BlocValidationError) {
          expect(error.blocName).toBe('TestCubit');
          expect(error.attemptedState).toBe(-1);
          expect(error.currentState).toBe(0);
          expect(error.issues.length).toBeGreaterThan(0);
          expect(error.firstIssue.message).toBeTruthy();
        }
      }
    });
  });
});
```

### Integration Tests with Real Schemas

**File**: `packages/blac/src/__tests__/validation.integration.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Cubit } from '../Cubit';
import { BlocValidationError } from '../validation/BlocValidationError';

describe('Schema Validation Integration (Zod)', () => {
  it('should work with Zod schemas', () => {
    const CounterSchema = z.number().int().min(0).max(100);

    class CounterCubit extends Cubit<number> {
      static schema = CounterSchema;
      constructor() {
        super(0);
      }
    }

    const cubit = new CounterCubit();
    cubit.emit(50); // Valid
    expect(cubit.state).toBe(50);

    expect(() => cubit.emit(200)).toThrow(BlocValidationError);
    expect(() => cubit.emit(-1)).toThrow(BlocValidationError);
  });

  it('should work with complex object schemas', () => {
    const UserSchema = z.object({
      name: z.string().min(1),
      age: z.number().int().min(0),
      email: z.string().email(),
    });

    type User = z.infer<typeof UserSchema>;

    class UserCubit extends Cubit<User> {
      static schema = UserSchema;
      constructor() {
        super({ name: 'Alice', age: 30, email: 'alice@example.com' });
      }
    }

    const cubit = new UserCubit();

    // Valid update
    cubit.emit({ name: 'Bob', age: 25, email: 'bob@example.com' });
    expect(cubit.state.name).toBe('Bob');

    // Invalid email
    expect(() =>
      cubit.emit({ name: 'Charlie', age: 35, email: 'invalid' })
    ).toThrow(BlocValidationError);
  });
});
```

---

## Documentation Requirements

### 1. Feature Guide

**File**: `apps/docs/src/content/guide/state-validation.mdx`

```markdown
# State Validation

Ensure your state is always valid with runtime schema validation.

## Overview

BlaC supports optional state validation using the Standard Schema specification. This allows you to use validation libraries like Zod, Valibot, or any other Standard Schema-compliant library to ensure your state is always correct.

## Quick Start

\`\`\`typescript
import { z } from 'zod';
import { Cubit } from '@blac/core';

// 1. Define your schema
const CounterSchema = z.number().int().min(0);

// 2. Add schema to your Cubit
class CounterCubit extends Cubit<number> {
  static schema = CounterSchema;

  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1); // Validated automatically!
  };
}
\`\`\`

## Benefits

- **Runtime Safety**: Catch invalid state at runtime
- **Type Inference**: Use `z.infer` to keep types and schemas in sync
- **Zero Overhead**: No validation if schema not defined
- **Library Agnostic**: Works with Zod, Valibot, ArkType, and more

## When to Use

Use state validation when:
- State has complex structure or constraints
- State is persisted and may be corrupted
- State comes from external sources (APIs, user input)
- You want runtime type safety in addition to TypeScript

## When NOT to Use

Skip validation when:
- State is simple (e.g., single primitive)
- Performance is critical and state is always valid
- State structure is trivial and unlikely to be wrong

<!-- More documentation... -->
```

### 2. API Reference

Document all new APIs:
- `BlocBase.validate()`
- `BlocBase.isValid()`
- `BlocBase.parse()`
- `BlocBase.safeParse()`
- `BlocBase.schema` getter
- `BlocValidationError` class
- Standard Schema types

### 3. Migration Guide

For users upgrading from non-validated Blocs:

```markdown
# Migration Guide: Adding Validation

## Step 1: Install validation library

\`\`\`bash
pnpm add zod
\`\`\`

## Step 2: Define schema

\`\`\`typescript
import { z } from 'zod';

const MySchema = z.object({
  // ... your state structure
});
\`\`\`

## Step 3: Add to Bloc

\`\`\`typescript
class MyBloc extends Bloc<MyState> {
  static schema = MySchema; // ← Add this line
}
\`\`\`

That's it! Your state is now validated on every emit.
```

---

## Implementation Checklist

### Core Implementation
- [ ] Create `packages/blac/src/validation/types.ts`
- [ ] Create `packages/blac/src/validation/BlocValidationError.ts`
- [ ] Modify `packages/blac/src/BlocBase.ts`:
  - [ ] Add `_schema` property
  - [ ] Add schema initialization in constructor
  - [ ] Add `_validateState()` method
  - [ ] Modify `_pushState()` to validate
  - [ ] Add `validate()` helper method
  - [ ] Add `isValid()` helper method
  - [ ] Add `parse()` helper method
  - [ ] Add `safeParse()` helper method
  - [ ] Add `schema` getter
- [ ] Update `packages/blac/src/index.ts` exports

### Persistence Plugin
- [ ] Modify `packages/plugins/bloc/persistence/src/types.ts`:
  - [ ] Add `schema` option
  - [ ] Add `validation` option
  - [ ] Add `schema` to `PersistenceMigration`
- [ ] Modify `packages/plugins/bloc/persistence/src/PersistencePlugin.ts`:
  - [ ] Add schema properties
  - [ ] Add `getSchema()` method
  - [ ] Validate in `onAttach()` (restore)
  - [ ] Validate in `saveState()` (save)
  - [ ] Validate in `tryMigrations()` (migrations)
- [ ] Update plugin exports

### Testing
- [ ] Unit tests: `packages/blac/src/__tests__/validation.test.ts`
- [ ] Integration tests: `packages/blac/src/__tests__/validation.integration.test.ts`
- [ ] Persistence tests: `packages/plugins/bloc/persistence/src/__tests__/validation.test.ts`
- [ ] Add test fixtures for different schema libraries

### Documentation
- [ ] Feature guide: State validation
- [ ] API reference: Validation methods
- [ ] API reference: BlocValidationError
- [ ] Migration guide: Adding validation to existing Blocs
- [ ] Examples: Basic validation
- [ ] Examples: Complex schemas
- [ ] Examples: Error handling
- [ ] Examples: With persistence

### Examples & Demos
- [ ] Add validation examples to playground
- [ ] Add demo Blocs using Zod
- [ ] Add demo Blocs using Valibot
- [ ] Add error handling examples

---

## Timeline Estimate

- **Phase 1: Core Implementation** (1-2 days)
  - Type definitions
  - BlocValidationError
  - BlocBase integration
  - Helper methods

- **Phase 2: Persistence Integration** (1 day)
  - Plugin modifications
  - Migration support
  - Tests

- **Phase 3: Testing** (1-2 days)
  - Unit tests
  - Integration tests
  - Edge case testing

- **Phase 4: Documentation** (1-2 days)
  - Feature guides
  - API reference
  - Migration guide
  - Examples

**Total: 4-7 days**

---

## Success Metrics

### Must Pass
- [ ] All existing tests still pass
- [ ] Blocs without schemas have zero performance impact
- [ ] Validation errors are thrown correctly
- [ ] Helper methods work as expected
- [ ] Persistence integration works

### Nice to Have
- [ ] Examples in playground
- [ ] Performance benchmarks
- [ ] Community feedback positive

---

**Status**: Ready for implementation
**Next Step**: Begin Phase 1 - Core Implementation
