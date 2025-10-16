# State Schema Validation Research

**Feature**: Integrate Standard Schema-based state validation into BlaC
**Date**: 2025-01-17
**Status**: Completed

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Standard Schema Specification](#standard-schema-specification)
3. [Type Inference Patterns](#type-inference-patterns)
4. [BlaC Integration Points](#blac-integration-points)
5. [Error Handling Patterns](#error-handling-patterns)
6. [Library Implementations](#library-implementations)
7. [Proxy System Considerations](#proxy-system-considerations)
8. [Performance Analysis](#performance-analysis)
9. [Recommendations](#recommendations)

---

## Executive Summary

### Key Findings

1. **Standard Schema is production-ready**: Collaborative effort by Zod, Valibot, and ArkType creators
2. **Minimal interface**: Single `~standard` property with `validate()` method
3. **Type-safe inference**: TypeScript utilities for extracting input/output types
4. **Plugin architecture fit**: BlaC's existing plugin system provides ideal integration point
5. **Zero overhead achievable**: Conditional compilation and optional schema property patterns
6. **Ecosystem support**: 32+ libraries already implement Standard Schema

### Recommended Approach

**Hybrid integration**: Optional schema property on `BlocBase` + plugin-based validation with `transformState` hook. This provides:
- Zero runtime overhead when schema not defined
- Type inference from schema
- Seamless persistence plugin integration
- Flexible validation timing control

---

## Standard Schema Specification

### Interface Definition

The Standard Schema V1 specification provides a minimal, universal interface:

```typescript
// Core interface
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}

// Properties
export namespace StandardSchemaV1 {
  export interface Props<Input = unknown, Output = Input> {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown
    ) => Result<Output> | Promise<Result<Output>>;
    readonly types?: Types<Input, Output> | undefined;
  }
}

// Result types
export type Result<Output> = SuccessResult<Output> | FailureResult;

export interface SuccessResult<Output> {
  readonly value: Output;
  readonly issues?: undefined;
}

export interface FailureResult {
  readonly issues: ReadonlyArray<Issue>;
}

// Issue structure
export interface Issue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
}
```

### Key Design Decisions

1. **Tilde Prefix**: `~standard` property deprioritized in IDE autocomplete
2. **Single Validation Method**: Unified `validate()` for all use cases
3. **Structured Errors**: Array of issues with paths and messages
4. **Async Support**: `validate()` can return Promise for async validation
5. **Type Metadata**: Optional `types` property for static analysis

### Detection Pattern

```typescript
function isStandardSchema(schema: unknown): schema is StandardSchemaV1 {
  return (
    typeof schema === 'object' &&
    schema !== null &&
    '~standard' in schema &&
    typeof (schema as any)['~standard'] === 'object' &&
    (schema as any)['~standard'].version === 1
  );
}
```

---

## Type Inference Patterns

### Schema-First Development

The "schema-first" pattern is widely adopted in the TypeScript ecosystem:

```typescript
// Define schema once
const UserSchema = z.object({
  name: z.string(),
  age: z.number().min(0),
});

// Infer types automatically
type User = z.infer<typeof UserSchema>;
// Equivalent to: { name: string; age: number }
```

### Standard Schema Type Utilities

```typescript
import type { InferInput, InferOutput } from '@standard-schema/spec';

// Extract input type (before transformations)
type SchemaInput<T> = T extends StandardSchemaV1<infer I, any> ? I : never;

// Extract output type (after transformations)
type SchemaOutput<T> = T extends StandardSchemaV1<any, infer O> ? O : never;

// Or use official utilities
type Input = InferInput<typeof schema>;
type Output = InferOutput<typeof schema>;
```

### BlaC-Specific Type Helper Pattern

For BlaC, we need a helper that:
1. Detects if schema is provided
2. Infers state type from schema
3. Falls back to explicit type parameter

```typescript
// Option A: Static schema property
class CounterCubit extends Cubit<number> {
  static schema = z.number().int().min(0);
}

// Option B: Schema factory
const CounterSchema = z.number().int().min(0);
class CounterCubit extends Cubit.fromSchema(CounterSchema) {
  constructor() { super(0); }
}

// Option C: Generic constraint
type StateFromSchema<S> = S extends StandardSchemaV1<any, infer O> ? O : S;

class BlocBase<S, TSchema extends StandardSchemaV1<any, S> | undefined = undefined> {
  // If schema provided, infer type; otherwise use S
}
```

### Libraries' Type Inference Implementation

**Zod:**
```typescript
// Uses conditional types and inference
type infer<T extends ZodType<any, any, any>> = T['_output'];

// Internal type brand for type safety
class ZodType<Output, Def, Input> {
  readonly _output!: Output;
  readonly _input!: Input;
}
```

**Valibot:**
```typescript
// Modular approach with type parameters
type InferOutput<TSchema extends BaseSchema> = TSchema['~standard']['types']['output'];

// Schema is the source of truth
type Schema<TInput, TOutput> = {
  '~standard': {
    types: { input: TInput; output: TOutput }
  }
}
```

---

## BlaC Integration Points

### Current State Emission Flow

From analyzing `BlocBase.ts` and `Cubit.ts`:

```typescript
// Cubit.emit() flow
emit(state: S) {
  if (Object.is(state, this.state)) return;  // 1. Identity check

  const oldState = this.state;
  const newState = state;
  this._pushState(newState, oldState);        // 2. Push to base
}

// BlocBase._pushState() flow
_pushState(newState: S, oldState: S, action?: unknown) {
  // Lifecycle check
  if (currentState !== BlocLifecycleState.ACTIVE) {
    return; // Cannot emit on non-active bloc
  }

  if (newState === undefined) return;         // 3. Undefined check

  this._state = newState;

  // 4. Plugin transform (CURRENT INTEGRATION POINT)
  const transformedState = this._plugins.transformState(oldState, newState);
  this._state = transformedState;

  // 5. Plugin notification
  this._plugins.notifyStateChange(oldState, transformedState);

  // 6. System plugin notification
  this.blacInstance?.plugins.notifyStateChanged(this, oldState, transformedState);

  // 7. Batching check
  if (this._batchingManager.isCurrentlyBatching) {
    // Queue update
    return;
  }

  // 8. Subscription notification
  this._subscriptionManager.notify(transformedState, oldState, action);
}
```

### Proposed Integration Point

**Location**: Between step 3 (undefined check) and step 4 (plugin transform)

**Rationale**:
- After identity check (no validation on identical state)
- After undefined check (validation assumes defined value)
- **Before** plugin transform (validate input state, not transformed)
- Before notification (prevent invalid state propagation)

```typescript
_pushState(newState: S, oldState: S, action?: unknown) {
  // ... lifecycle and undefined checks ...

  // NEW: Schema validation (if schema defined)
  if (this._schema) {
    const result = this._validateState(newState);
    if (!result.success) {
      throw new BlocValidationError(result.issues, newState, oldState);
    }
    // Use validated value (may differ due to coercion)
    newState = result.value;
  }

  this._state = newState;

  // ... continue with plugin transform ...
}
```

### Plugin System Integration

BlaC's plugin architecture provides a natural validation hook:

**Current Plugin Capabilities:**
```typescript
interface PluginCapabilities {
  readState: boolean;
  transformState: boolean;      // ← Validation fits here
  interceptEvents: boolean;
  persistData: boolean;
  accessMetadata: boolean;
}
```

**Plugin Transform Flow** (from `BlocPluginRegistry.ts:116-137`):
```typescript
transformState(previousState: TState, nextState: TState): TState {
  let transformedState = nextState;

  for (const plugin of this.getAll()) {
    if (plugin.transformState && this.canTransformState(plugin)) {
      try {
        transformedState = plugin.transformState(previousState, transformedState);
      } catch (error) {
        console.error(`Plugin error in transformState:`, error);
        // Continue with untransformed state
      }
    }
  }

  return transformedState;
}
```

**Validation Plugin Pattern:**
```typescript
class ValidationPlugin<TState> implements BlocPlugin<TState> {
  name = 'validation';
  capabilities = {
    readState: true,
    transformState: true,  // Validate and potentially transform
  };

  constructor(private schema: StandardSchemaV1<TState>) {}

  transformState(prev: TState, next: TState): TState {
    const result = this.schema['~standard'].validate(next);

    if ('issues' in result) {
      throw new ValidationError(result.issues);
    }

    return result.value; // May differ due to coercion/defaults
  }
}
```

---

## Error Handling Patterns

### Industry Best Practices

Research revealed four primary error handling patterns in TypeScript:

#### 1. **Traditional Try-Catch**
```typescript
try {
  const validated = schema.parse(data);
  return validated;
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation error
  }
  throw error;
}
```

**Pros**: Familiar, standard JavaScript
**Cons**: Can be missed, requires explicit handling

#### 2. **Result Pattern (Rust-inspired)**
```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

function validate(state: S): Result<S, ValidationError> {
  const result = schema.validate(state);
  return result.issues
    ? { ok: false, error: new ValidationError(result.issues) }
    : { ok: true, value: result.value };
}
```

**Pros**: Explicit, forces error handling, type-safe
**Cons**: More verbose, not standard JavaScript pattern

#### 3. **Either Pattern (Functional)**
```typescript
type Either<L, R> = Left<L> | Right<R>;

function validate(state: S): Either<ValidationError, S> {
  // Left = error, Right = success
}
```

**Pros**: Composable, functional style
**Cons**: Learning curve, not widely used in JavaScript

#### 4. **Custom Error Classes**
```typescript
class BlocValidationError extends Error {
  constructor(
    public issues: Issue[],
    public attemptedState: unknown,
    public currentState: unknown,
  ) {
    super(`State validation failed: ${issues.length} issue(s)`);
    this.name = 'BlocValidationError';
  }
}
```

**Pros**: Rich error context, instanceof checks, stack traces
**Cons**: Must be caught, can crash if unhandled

### Recommended for BlaC

**Custom Error Class with Try-Catch** (Pattern #4)

Rationale:
- Consistent with BlaC's existing error handling (see `Bloc.ts:139-176`)
- Provides rich context for debugging
- Fits "fail-fast" philosophy for state integrity
- Users familiar with traditional error handling

```typescript
export class BlocValidationError extends Error {
  readonly name = 'BlocValidationError';

  constructor(
    public readonly issues: readonly Issue[],
    public readonly attemptedState: unknown,
    public readonly currentState: unknown,
    public readonly blocName: string,
  ) {
    const summary = issues.map(i =>
      i.path ? `${i.path.join('.')}: ${i.message}` : i.message
    ).join(', ');

    super(`[${blocName}] State validation failed: ${summary}`);
  }

  // Helper to get first issue
  get firstIssue(): Issue {
    return this.issues[0]!;
  }

  // Check if specific field has error
  hasIssueAt(path: string): boolean {
    return this.issues.some(i =>
      i.path?.join('.') === path
    );
  }
}
```

### Error Handling in Persistence

For persistence plugin, validation errors should be recoverable:

```typescript
async onAttach(bloc: BlocBase<TState>) {
  try {
    const stored = await this.storage.getItem(this.key);
    if (stored) {
      const state = this.deserialize(stored);

      // Validate restored state
      if (this.schema) {
        const result = this.schema['~standard'].validate(state);
        if ('issues' in result) {
          this.handleError(
            new Error(`Validation failed: ${result.issues.length} issues`),
            'load'
          );
          return; // Don't restore invalid state
        }
        bloc.emit(result.value);
      } else {
        bloc.emit(state);
      }
    }
  } catch (error) {
    this.handleError(error, 'load');
  }
}
```

---

## Library Implementations

### Zod

**Current Status**: v3 stable, v4 in development with Standard Schema support

**Implementation Pattern:**
```typescript
import { z } from 'zod';

const CounterSchema = z.number().int().min(0);

// Standard Schema interface (v4+)
const result = CounterSchema['~standard'].validate(42);
if ('issues' in result) {
  console.error('Validation failed:', result.issues);
} else {
  console.log('Valid:', result.value);
}

// Traditional Zod API (still available)
const parsed = CounterSchema.parse(42); // Throws on error
const safe = CounterSchema.safeParse(42); // Returns result object
```

**Type Inference:**
```typescript
type Counter = z.infer<typeof CounterSchema>;
// Equivalent to: number

// Standard Schema types
type Input = InferInput<typeof CounterSchema>;
type Output = InferOutput<typeof CounterSchema>;
```

### Valibot

**Current Status**: v1 RC with full Standard Schema support

**Implementation Pattern:**
```typescript
import * as v from 'valibot';

const CounterSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(0)
);

// Standard Schema
const result = CounterSchema['~standard'].validate(42);

// Valibot API
const parsed = v.parse(CounterSchema, 42); // Throws
const safe = v.safeParse(CounterSchema, 42); // Result object
```

**Features:**
- Ultra-lightweight (< 1kb base)
- Modular (tree-shakeable)
- Pipe-based composition
- Full TypeScript inference

### ArkType

**Current Status**: Production-ready with Standard Schema

**Implementation Pattern:**
```typescript
import { type } from 'arktype';

const CounterSchema = type('number.integer>=0');

// Standard Schema
const result = CounterSchema['~standard'].validate(42);

// ArkType API
const out = CounterSchema(42);
if (out instanceof type.errors) {
  console.error(out.summary);
}
```

**Features:**
- String-based type definitions
- Runtime performance focus
- Built-in TypeScript integration

### Comparison Matrix

| Library | Size | Standard Schema | Type Inference | Async | Transformations |
|---------|------|-----------------|----------------|-------|-----------------|
| **Zod** | ~14kb | v4+ | Excellent | ✓ | .transform() |
| **Valibot** | ~1kb | v1+ | Excellent | ✓ | .pipe() |
| **ArkType** | ~8kb | ✓ | Excellent | ✓ | .pipe() |
| **Yup** | ~45kb | Adapter | Good | ✓ | .transform() |
| **Joi** | ~146kb | Adapter | Limited | ✗ | .alter() |

**Recommendation**: Test with Zod and Valibot as primary targets due to native Standard Schema support and excellent TypeScript integration.

---

## Proxy System Considerations

### BlaC's Proxy Architecture

From `ProxyFactory.ts` analysis:

**Key Characteristics:**
1. **Top-level tracking only**: No nested proxies (performance optimization)
2. **WeakMap caching**: Proxy instances cached per consumer
3. **Immutable state**: `set` and `deleteProperty` traps return false
4. **Two proxy types**: State proxies and Bloc instance proxies

**State Proxy Implementation:**
```typescript
createStateProxy<T>(target: T, consumerRef: object, tracker: ConsumerTracker): T {
  return new Proxy(target, {
    get(obj, prop) {
      const value = Reflect.get(obj, prop);

      // Track top-level property access only
      tracker.trackAccess(consumerRef, 'state', String(prop), undefined);

      // Return raw value (no nested proxies)
      return value;
    },

    set: () => false,           // State is immutable
    deleteProperty: () => false // Properties cannot be deleted
  });
}
```

### Validation and Proxies

**Question**: Does validation need to interact with proxy system?

**Answer**: No, validation should occur on raw state objects.

**Rationale:**
1. **Validation timing**: Happens in `_pushState()` before proxy creation
2. **Proxy purpose**: Track access patterns, not modify data structure
3. **Schema validation**: Operates on concrete data, not proxies
4. **Immutability**: Proxies prevent mutation; validation doesn't mutate

**Flow:**
```
User calls emit(newState)
  ↓
Identity check (Object.is)
  ↓
Lifecycle check (ACTIVE?)
  ↓
Undefined check
  ↓
🔍 VALIDATION (raw state)     ← Validation happens here
  ↓
Update this._state
  ↓
Plugin transformState()        ← Could transform after validation
  ↓
Plugin notifications
  ↓
Subscription notifications     ← Proxies created here for consumers
```

### Edge Cases

**Circular References:**
```typescript
const state = { self: null as any };
state.self = state; // Circular

// Standard Schema handles this
const result = schema.validate(state);
// Most libraries detect and error on circular refs
```

**Class Instances:**
```typescript
class User {
  constructor(public name: string) {}
  greet() { return `Hello, ${this.name}`; }
}

const UserSchema = z.object({
  name: z.string()
});

const user = new User('Alice');
const result = UserSchema.parse(user);
// ⚠️ Result is plain object: { name: 'Alice' }
// Lost: class prototype, methods
```

**Recommendation**: Document that schema validation converts to plain objects. Use factories to recreate class instances if needed:

```typescript
class UserBloc extends Cubit<User> {
  static schema = z.object({
    name: z.string()
  }).transform(data => new User(data.name)); // Recreate instance
}
```

---

## Performance Analysis

### Validation Overhead

**Schema Compilation**: One-time cost when schema created
**Validation Runtime**: Per-emit cost when schema defined

**Benchmark Estimates** (based on library docs):
- Zod: ~50-200μs per validation (medium complexity)
- Valibot: ~20-100μs per validation (faster, modular)
- ArkType: ~10-50μs per validation (optimized runtime)

**BlaC Context:**
- Typical emit frequency: 1-100 per second
- With 100μs validation: 0.01% overhead at 1 emit/sec, 1% at 100 emits/sec
- Acceptable for most applications

### Optimization Strategies

#### 1. **Lazy Schema Compilation**
```typescript
class BlocBase<S> {
  private _compiledSchema?: StandardSchemaV1<S>;

  private get compiledSchema(): StandardSchemaV1<S> | undefined {
    if (!this._schema) return undefined;
    if (!this._compiledSchema) {
      this._compiledSchema = this._schema; // Cache compiled form
    }
    return this._compiledSchema;
  }
}
```

#### 2. **Conditional Validation**
```typescript
// Only validate in development
if (process.env.NODE_ENV === 'development' && this._schema) {
  this._validateState(newState);
}

// Or: Always validate (fail-fast in production)
if (this._schema) {
  this._validateState(newState);
}
```

**Recommendation**: Always validate (no conditional). Rationale:
- Invalid state in production worse than validation cost
- Overhead minimal for most use cases
- Matches user requirement: "cannot be disabled"

#### 3. **Async Validation Strategy**

Standard Schema supports async validation, but BlaC's emit must be synchronous.

**Solution**: Validate sync, document async limitations:

```typescript
_validateState(state: S): S {
  if (!this._schema) return state;

  const result = this._schema['~standard'].validate(state);

  // If async, we have a problem
  if (result instanceof Promise) {
    throw new Error(
      `[${this._name}] Async schema validation not supported in emit(). ` +
      `Use async validation in event handlers before calling emit().`
    );
  }

  if ('issues' in result) {
    throw new BlocValidationError(result.issues, state, this._state, this._name);
  }

  return result.value;
}
```

---

## Recommendations

### API Design

**Recommended Pattern**: Static schema property with type inference

```typescript
// User code
const CounterSchema = z.number().int().min(0);

class CounterCubit extends Cubit<number> {
  static schema = CounterSchema;

  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}
```

**Rationale**:
- **Familiar**: Similar to static `isolated` and `keepAlive` properties
- **Type inference**: Can extract type from schema in BlocBase
- **Optional**: If no schema, zero overhead
- **Flexible**: Can be overridden per instance if needed

**Implementation Sketch**:
```typescript
export abstract class BlocBase<S> {
  // Allow schema to be defined statically
  static schema?: StandardSchemaV1<any>;

  // Instance schema (defaults to static, can override)
  protected _schema?: StandardSchemaV1<S>;

  constructor(initialState: S) {
    // Initialize schema from static property
    const Constructor = this.constructor as typeof BlocBase & { schema?: StandardSchemaV1<any> };
    this._schema = Constructor.schema;

    // Validate initial state if schema defined
    if (this._schema) {
      const result = this._validateState(initialState);
      initialState = result; // Use validated/coerced value
    }

    this._state = initialState;
    // ... rest of initialization
  }
}
```

### Type Inference Implementation

**Challenge**: Infer state type from schema while maintaining backward compatibility

**Solution**: Overload constructor and use conditional types

```typescript
// Type helper
type InferStateFromSchema<T> =
  T extends StandardSchemaV1<any, infer O> ? O : never;

// BlocBase with optional schema-based type inference
export abstract class BlocBase<
  S,
  TSchema extends StandardSchemaV1<any, S> = never
> {
  // Schema property
  protected _schema?: TSchema extends never ? undefined : TSchema;

  // Constructor
  constructor(
    initialState: TSchema extends never ? S : InferStateFromSchema<TSchema>
  ) {
    // ...
  }
}

// Usage without schema (existing behavior)
class CounterCubit extends Cubit<number> {
  constructor() { super(0); } // S = number
}

// Usage with schema (new behavior)
const CounterSchema = z.number();
class CounterCubit extends Cubit<number, typeof CounterSchema> {
  static schema = CounterSchema;
  constructor() { super(0); } // Type validated against schema
}
```

**Alternative**: Factory method for cleaner syntax

```typescript
class Cubit {
  static fromSchema<TSchema extends StandardSchemaV1>(schema: TSchema) {
    return class extends Cubit<InferOutput<TSchema>> {
      static schema = schema;
    };
  }
}

// Usage
const CounterSchema = z.number();
class CounterCubit extends Cubit.fromSchema(CounterSchema) {
  constructor() { super(0); }
}
```

### Helper Methods

Per specifications, provide methods that mirror schema library APIs:

```typescript
export abstract class BlocBase<S> {
  /**
   * Validate a value against the schema without emitting
   * @returns Validation result (Standard Schema format)
   */
  validate(value: unknown): { success: true; value: S } | { success: false; issues: Issue[] } {
    if (!this._schema) {
      throw new Error(`[${this._name}] No schema defined`);
    }

    const result = this._schema['~standard'].validate(value);

    if ('issues' in result) {
      return { success: false, issues: result.issues };
    }

    return { success: true, value: result.value };
  }

  /**
   * Check if a value is valid according to the schema
   * @returns true if valid, false otherwise
   */
  isValid(value: unknown): value is S {
    if (!this._schema) return true; // No schema = always valid

    const result = this._schema['~standard'].validate(value);
    return !('issues' in result);
  }

  /**
   * Parse and validate a value, throwing on error
   * Mirrors Zod's parse() / Valibot's parse()
   * @throws {BlocValidationError} if validation fails
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
   */
  safeParse(value: unknown): { success: true; value: S } | { success: false; error: BlocValidationError } {
    const result = this.validate(value);

    if (!result.success) {
      return {
        success: false,
        error: new BlocValidationError(result.issues, value, this._state, this._name)
      };
    }

    return { success: true, value: result.value };
  }
}
```

### Persistence Plugin Integration

**Access Bloc Schema**:
```typescript
class PersistencePlugin<TState> {
  async onAttach(bloc: BlocBase<TState>) {
    // Check if bloc has schema
    const blocSchema = (bloc as any)._schema as StandardSchemaV1<TState> | undefined;

    // Use bloc schema or plugin schema
    const schema = this.options.schema ?? blocSchema;

    if (schema) {
      // Validate restored state
      const result = schema['~standard'].validate(restoredState);
      if ('issues' in result) {
        // Handle invalid persisted data
        this.handleError(new Error('Invalid persisted state'), 'load');
        return;
      }
      bloc.emit(result.value);
    } else {
      bloc.emit(restoredState);
    }
  }
}
```

**Plugin Configuration**:
```typescript
interface PersistenceOptions<T> {
  // ... existing options ...

  /**
   * Schema for validation
   * - If provided: Use this schema (overrides bloc schema)
   * - If undefined: Use bloc's schema if available
   * - If null: Disable validation even if bloc has schema
   */
  schema?: StandardSchemaV1<T> | null;

  /**
   * When to validate
   */
  validation?: {
    onSave?: boolean;    // Validate before serialization (default: true)
    onRestore?: boolean; // Validate after deserialization (default: true)
  };
}
```

---

## Next Steps

1. **Review Research**: User confirmation this research is comprehensive ✓
2. **Discussion Phase**: Compare implementation approaches with pros/cons
3. **Recommendation**: Final recommendation with detailed rationale
4. **Implementation Plan**: Step-by-step development plan

---

## References

- [Standard Schema Specification](https://github.com/standard-schema/standard-schema)
- [Standard Schema Website](https://standardschema.dev/)
- [Zod Documentation](https://zod.dev/)
- [Valibot Documentation](https://valibot.dev/)
- [ArkType Documentation](https://arktype.io/)
- TypeScript Type Inference Patterns (various articles)
- BlaC Codebase: `packages/blac/src/BlocBase.ts:230-279`
- BlaC Codebase: `packages/blac/src/plugins/BlocPluginRegistry.ts:116-137`

---

## Appendix: Code Examples

### Minimal Standard Schema Implementation

```typescript
// For testing without external dependencies
function createNumberSchema(): StandardSchemaV1<number> {
  return {
    '~standard': {
      version: 1,
      vendor: 'blac-test',
      validate: (value) => {
        if (typeof value !== 'number') {
          return {
            issues: [{ message: 'Expected number', path: [] }]
          };
        }
        return { value };
      }
    }
  };
}
```

### Full Example: Counter with Validation

```typescript
import { z } from 'zod';
import { Cubit } from '@blac/core';

// Define schema
const CounterSchema = z.number().int().min(0).max(100);

// Cubit with validation
class CounterCubit extends Cubit<number> {
  static schema = CounterSchema;

  constructor() {
    super(0);
  }

  increment = () => {
    try {
      this.emit(this.state + 1);
    } catch (error) {
      if (error instanceof BlocValidationError) {
        console.error('Cannot increment:', error.firstIssue.message);
        // Max value reached, handle gracefully
      }
    }
  };

  set = (value: number) => {
    // Check before emitting
    if (!this.isValid(value)) {
      throw new Error('Invalid counter value');
    }
    this.emit(value);
  };

  // Safe parse user input
  setFromString = (input: string) => {
    const num = parseInt(input, 10);
    const result = this.safeParse(num);

    if (result.success) {
      this.emit(result.value);
    } else {
      console.error('Invalid input:', result.error.message);
    }
  };
}
```

---

**Research Complete**: Ready for discussion phase
