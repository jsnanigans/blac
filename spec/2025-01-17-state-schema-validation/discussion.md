# State Schema Validation Discussion

**Feature**: Integrate Standard Schema-based state validation into BlaC
**Date**: 2025-01-17
**Status**: Discussion

---

## Executive Summary

Based on research and specifications, this document evaluates implementation approaches for integrating Standard Schema validation into BlaC. The goal is to provide runtime state integrity checking with zero dependencies, minimal overhead, and excellent developer experience.

### Requirements Recap

- **Validation Timing**: On every `emit()`, before deep change detection
- **Failure Behavior**: Throw error, prevent state update
- **Performance**: Zero overhead without schema, minimal with schema
- **Integration**: Native in BlocBase + persistence plugin hybrid
- **Type Safety**: Infer TypeScript types from schema
- **Library Support**: Any Standard Schema-compliant library (Zod, Valibot, etc.)

---

## Important Considerations

### Design Principles

**1. Simplicity Over Cleverness (Butler Lampson)**
- Avoid over-engineered solutions
- The schema property should be obvious and straightforward
- Type inference should "just work" without mental gymnastics

**2. Fail-Fast Safety (Nancy Leveson)**
- Invalid state is worse than validation errors
- Always validate when schema defined (no conditional disable)
- Provide clear, actionable error messages

**3. Zero Overhead When Unused**
- If no schema defined, zero runtime cost
- No schema detection on hot path
- Schema validation only when explicitly opted-in

**4. Backward Compatibility**
- Existing Blocs without schemas continue working unchanged
- No breaking changes to API surface
- Optional feature, not mandatory

### Common Approaches in State Management

**1. Schema-First (Zod, Valibot pattern)**
```typescript
const schema = z.object({ count: z.number() });
type State = z.infer<typeof schema>; // Derive type from schema
```
**Pros**: Single source of truth, no type/schema drift
**Cons**: Unfamiliar to some developers

**2. Type-First (Traditional TypeScript)**
```typescript
interface State { count: number }
const state: State = { count: 0 }; // Type drives validation
```
**Pros**: Familiar, standard TypeScript
**Cons**: Validation separate from types, can drift

**3. Hybrid (Both available)**
```typescript
// With schema: infer types
static schema = z.object({ count: z.number() });

// Without schema: explicit types
class MyBloc extends Bloc<{ count: number }> { }
```
**Pros**: Flexibility, gradual adoption
**Cons**: More complex implementation

### Common Mistakes to Avoid

**❌ Making schema validation async**
- State updates must be synchronous
- Async validation breaks emit() semantics
- Solution: Document async limitations, validate in event handlers

**❌ Validating in wrong place**
- Too early: Before identity check wastes work
- Too late: After plugin transform validates wrong state
- Correct: After identity/undefined checks, before transform

**❌ Silent failure on validation errors**
- Continuing with invalid state worse than error
- Users need to know validation failed
- Solution: Always throw, provide clear error

**❌ Over-complicating type inference**
- TypeScript gymnastics reduce clarity
- Static property approach is simplest
- Schema as generic parameter adds complexity

**❌ Creating new validation interface**
- Standard Schema already exists
- Custom interface fragments ecosystem
- Solution: Use Standard Schema, period

---

## Implementation Options

### Option A: Static Schema Property (Simple)

**Implementation:**
```typescript
export abstract class BlocBase<S> {
  static schema?: StandardSchemaV1<any>;
  protected _schema?: StandardSchemaV1<S>;

  constructor(initialState: S) {
    const Constructor = this.constructor as typeof BlocBase & { schema?: StandardSchemaV1<any> };
    this._schema = Constructor.schema;

    if (this._schema) {
      initialState = this._validateState(initialState);
    }

    this._state = initialState;
    // ...
  }

  protected _validateState(state: S): S {
    if (!this._schema) return state;

    const result = this._schema['~standard'].validate(state);

    if (result instanceof Promise) {
      throw new Error('Async validation not supported');
    }

    if ('issues' in result) {
      throw new BlocValidationError(result.issues, state, this._state, this._name);
    }

    return result.value;
  }
}
```

**Usage:**
```typescript
const CounterSchema = z.number().int().min(0);

class CounterCubit extends Cubit<number> {
  static schema = CounterSchema;

  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1); // Validated automatically
  };
}
```

**Type Inference**: Manual (user specifies `Cubit<number>`)

---

### Option B: Schema as Generic Parameter (Type-Safe)

**Implementation:**
```typescript
type InferOutput<T> = T extends StandardSchemaV1<any, infer O> ? O : never;

export abstract class BlocBase<
  S,
  TSchema extends StandardSchemaV1<any, S> | undefined = undefined
> {
  protected _schema?: TSchema;

  constructor(
    initialState: TSchema extends StandardSchemaV1<any, infer O> ? O : S,
    schema?: TSchema
  ) {
    this._schema = schema;

    if (this._schema) {
      initialState = this._validateState(initialState);
    }

    this._state = initialState;
  }
}
```

**Usage:**
```typescript
const CounterSchema = z.number().int().min(0);

class CounterCubit extends Cubit<number, typeof CounterSchema> {
  constructor() {
    super(0, CounterSchema);
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}
```

**Type Inference**: Automatic from schema generic

---

### Option C: Factory Method (Ergonomic)

**Implementation:**
```typescript
export abstract class BlocBase<S> {
  static fromSchema<TSchema extends StandardSchemaV1<any, any>>(
    schema: TSchema
  ) {
    type State = InferOutput<TSchema>;

    return class extends BlocBase<State> {
      static schema = schema;
      protected _schema = schema;
    } as new (initialState: State) => BlocBase<State>;
  }
}
```

**Usage:**
```typescript
const CounterSchema = z.number().int().min(0);

class CounterCubit extends Cubit.fromSchema(CounterSchema) {
  constructor() {
    super(0); // Type inferred from schema
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}
```

**Type Inference**: Automatic from factory

---

### Option D: Plugin-Only (Minimal Core)

**Implementation:**
```typescript
// BlocBase unchanged - no schema support

class ValidationPlugin<TState> implements BlocPlugin<TState> {
  name = 'validation';
  capabilities = { readState: true, transformState: true };

  constructor(private schema: StandardSchemaV1<TState>) {}

  transformState(prev: TState, next: TState): TState {
    const result = this.schema['~standard'].validate(next);

    if ('issues' in result) {
      throw new BlocValidationError(result.issues, next, prev);
    }

    return result.value;
  }
}
```

**Usage:**
```typescript
const CounterSchema = z.number().int().min(0);

class CounterCubit extends Cubit<number> {
  static plugins = [new ValidationPlugin(CounterSchema)];

  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1); // Validated by plugin
  };
}
```

**Type Inference**: Manual (user specifies `Cubit<number>`)

---

### Option E: Hybrid (Static + Plugin Fallback)

**Implementation:**
```typescript
export abstract class BlocBase<S> {
  static schema?: StandardSchemaV1<any>;
  protected _schema?: StandardSchemaV1<S>;

  constructor(initialState: S) {
    // Get schema from static property
    const Constructor = this.constructor as typeof BlocBase & { schema?: StandardSchemaV1<any> };
    this._schema = Constructor.schema;

    // Validate initial state
    if (this._schema) {
      initialState = this._validateState(initialState);
    }

    this._state = initialState;
  }

  protected _validateState(state: S): S {
    if (!this._schema) return state;
    // ... validation logic ...
  }
}

// Plugin can also provide validation
class ValidationPlugin<TState> implements BlocPlugin<TState> {
  transformState(prev: TState, next: TState): TState {
    // If bloc has schema, skip (already validated in _pushState)
    if ((this.bloc as any)._schema) {
      return next;
    }

    // Otherwise, plugin validates
    const result = this.schema['~standard'].validate(next);
    if ('issues' in result) {
      throw new BlocValidationError(result.issues, next, prev);
    }
    return result.value;
  }
}
```

**Usage (Static):**
```typescript
class CounterCubit extends Cubit<number> {
  static schema = z.number();
}
```

**Usage (Plugin):**
```typescript
class CounterCubit extends Cubit<number> {
  static plugins = [new ValidationPlugin(z.number())];
}
```

**Type Inference**: Manual in both cases

---

## Options Comparison Matrix

| Criteria | Option A: Static Property | Option B: Generic Param | Option C: Factory Method | Option D: Plugin-Only | Option E: Hybrid |
|----------|--------------------------|-------------------------|--------------------------|----------------------|------------------|
| **Simplicity** | ⭐⭐⭐⭐⭐ (5/5)<br>Static property like `isolated`/`keepAlive` | ⭐⭐⭐ (3/5)<br>Generic parameters add complexity | ⭐⭐⭐⭐ (4/5)<br>Factory slightly unconventional | ⭐⭐⭐⭐ (4/5)<br>No core changes needed | ⭐⭐⭐ (3/5)<br>Two ways to do same thing |
| **Type Inference** | ⭐⭐ (2/5)<br>Manual type specification required | ⭐⭐⭐⭐⭐ (5/5)<br>Automatic from schema generic | ⭐⭐⭐⭐⭐ (5/5)<br>Automatic from factory | ⭐⭐ (2/5)<br>Manual type specification | ⭐⭐ (2/5)<br>Manual type specification |
| **Zero Overhead** | ⭐⭐⭐⭐⭐ (5/5)<br>No schema = no checks | ⭐⭐⭐⭐⭐ (5/5)<br>No schema = no checks | ⭐⭐⭐⭐⭐ (5/5)<br>No schema = no checks | ⭐⭐⭐⭐ (4/5)<br>Plugin registration overhead | ⭐⭐⭐⭐⭐ (5/5)<br>No schema = no checks |
| **Consistency** | ⭐⭐⭐⭐⭐ (5/5)<br>Matches existing BlaC patterns | ⭐⭐⭐ (3/5)<br>Different from `isolated`/`keepAlive` | ⭐⭐⭐ (3/5)<br>Factory pattern unused elsewhere | ⭐⭐⭐⭐ (4/5)<br>Matches plugin architecture | ⭐⭐⭐⭐ (4/5)<br>Offers flexibility |
| **DX (Developer Experience)** | ⭐⭐⭐⭐ (4/5)<br>Clear, obvious, minimal boilerplate | ⭐⭐⭐ (3/5)<br>Generic parameters verbose | ⭐⭐⭐⭐⭐ (5/5)<br>Clean syntax, type inference | ⭐⭐⭐ (3/5)<br>More verbose, plugin syntax | ⭐⭐⭐ (3/5)<br>Confusing to have two ways |
| **Persistence Integration** | ⭐⭐⭐⭐⭐ (5/5)<br>Easy to access `bloc._schema` | ⭐⭐⭐⭐⭐ (5/5)<br>Easy to access via generic | ⭐⭐⭐⭐⭐ (5/5)<br>Easy to access `static schema` | ⭐⭐⭐ (3/5)<br>Must iterate plugins to find | ⭐⭐⭐⭐⭐ (5/5)<br>Multiple access patterns |
| **TypeScript Complexity** | ⭐⭐⭐⭐⭐ (5/5)<br>No complex types needed | ⭐⭐ (2/5)<br>Complex conditional types | ⭐⭐⭐ (3/5)<br>Factory type inference tricky | ⭐⭐⭐⭐⭐ (5/5)<br>No type changes to core | ⭐⭐⭐⭐ (4/5)<br>Moderate type complexity |
| **TOTAL SCORE** | **33/35** | **27/35** | **31/35** | **27/35** | **29/35** |

---

## Council Discussion

### Butler Lampson (Simplicity & Clarity)

> **"The static property approach is the simplest thing that could possibly work."**

"I appreciate Option A's alignment with existing BlaC patterns. `static schema` sits naturally beside `static isolated` and `static keepAlive`. Users already understand this pattern.

Option C's factory method is clever, but cleverness often obscures intent. When I see `Cubit.fromSchema()`, I wonder: is this creating a different kind of Cubit? Why not just extend Cubit normally?

Option B's generic parameters add cognitive load. Every developer must understand conditional types just to validate their state. That's a high price.

**Recommendation**: Option A for its obviousness. The minor inconvenience of manual type specification is worth the clarity gain."

---

### Barbara Liskov (Type Safety & Contracts)

> **"Type inference is not just convenience—it's correctness."**

"When we define a schema, we've established a contract for our state. If we then manually write `Cubit<number>`, we've created two sources of truth that can drift apart:

```typescript
class CounterCubit extends Cubit<string> {  // ← Says string
  static schema = z.number();                // ← Expects number
  // TypeScript won't catch this mismatch!
}
```

Option B solves this by making the schema type parameter enforce the contract. Option C also solves it through factory inference.

However, I'm concerned about Option B's complexity. Conditional types are powerful but fragile. Every TypeScript version change could break them.

Option C's factory pattern provides safety without complexity. The type system does the work automatically:

```typescript
class CounterCubit extends Cubit.fromSchema(z.number()) {
  // Compiler knows state is number, no manual annotation
}
```

**Recommendation**: Option C for type safety, or Option A with a type helper to catch mismatches."

---

### Nancy Leveson (Safety & Failure Modes)

> **"What's the worst thing that could happen if each approach fails?"**

**Option A (Static Property)**:
- **Failure**: Schema not defined when intended → No validation, invalid state persists
- **Severity**: Medium (developer error, caught in testing)
- **Detection**: Runtime errors from invalid state

**Option B (Generic Parameter)**:
- **Failure**: Complex types break on TypeScript upgrade → Code doesn't compile
- **Severity**: High (breaks production builds)
- **Detection**: Compile time (good), but blocks deployment

**Option C (Factory Method)**:
- **Failure**: Factory type inference breaks → Same as Option B
- **Severity**: High
- **Detection**: Compile time

**Option D (Plugin-Only)**:
- **Failure**: Plugin not registered when intended → No validation
- **Severity**: Medium
- **Detection**: Runtime

**Option E (Hybrid)**:
- **Failure**: Confusion about which approach to use → Inconsistent codebase
- **Severity**: Low (both work, just messy)
- **Detection**: Code review

"Option A has the most graceful failure mode: if you forget the schema, you get the existing behavior (no validation). Not ideal, but not catastrophic.

Options B and C have hard failures (won't compile), which is good for safety but bad if TypeScript changes break them. We're betting on type system stability.

**Recommendation**: Option A for robustness. Fail-operational (works without schema) beats fail-stop (won't compile)."

---

### Alan Kay (User Mental Model)

> **"Does this solve the real problem?"**

"The real problem isn't 'how do we integrate schemas'—it's 'how do we prevent invalid state in production?'

Users want to write:
```typescript
static schema = MySchema;
```

...and have validation 'just work'. They don't want to think about:
- Generic parameters
- Factory methods
- Plugin registration
- Type inference

Option A gives them exactly that. Define schema, validation happens. The cognitive load is minimal.

Option C is close, but `Cubit.fromSchema()` raises questions: 'Is this different from regular Cubit? What changed? Can I still use plugins?'

**Recommendation**: Option A. It feels like a natural extension of BlaC, not a new concept."

---

### Leslie Lamport (Correctness & Concurrency)

> **"How do we ensure the schema and type stay synchronized?"**

"This is a data consistency problem. We have two representations of the same concept (state structure):
1. TypeScript type: `Cubit<T>`
2. Runtime schema: `static schema`

These can diverge. Consider:

```typescript
class UserCubit extends Cubit<{ name: string; age: string }> {
  static schema = z.object({
    name: z.string(),
    age: z.number(),  // ← Type says string, schema says number
  });
}
```

TypeScript won't catch this mismatch in Option A. The type system and runtime validation are operating independently.

Options B and C enforce synchronization through types. The schema IS the source of truth, and TypeScript derives the type from it. No divergence possible.

However, I'm pragmatic. If we add runtime checks in development mode:

```typescript
if (process.env.NODE_ENV === 'development' && this._schema) {
  // Type-check that schema output type matches S
  // (Requires additional type metadata)
}
```

...then Option A can be made safe enough.

**Recommendation**: Option C if feasible, Option A with runtime validation in development otherwise."

---

### Martin Kleppmann (Data Integrity & Persistence)

> **"How does persistence interact with validation?"**

"In distributed systems, persisted data can become corrupted or outdated. Schema validation on restoration is critical.

All options support persistence equally well:

```typescript
// In PersistencePlugin
const blocSchema = (bloc as any)._schema || bloc.constructor.schema;
if (blocSchema) {
  const result = blocSchema['~standard'].validate(restoredData);
  // Handle validation...
}
```

However, I'm concerned about **migration scenarios**:

```typescript
// v1: Schema requires { count: number }
// v2: Schema requires { count: number; max: number }

// Restored v1 data: { count: 5 }
// Validation fails against v2 schema!
```

We need to handle this gracefully. Suggestions:

1. **Schema versioning**: Tag schemas, provide migration functions
2. **Partial validation**: Allow subset of schema to validate
3. **Default values**: Schema provides defaults for missing fields

This is independent of which option we choose, but worth documenting.

**Recommendation**: Any option works for persistence. Add schema versioning guidance."

---

### Don Norman (Usability & Error Messages)

> **"What happens when a developer makes a mistake?"**

"Let's trace the error experience for each option when validation fails:

**Option A:**
```typescript
class CounterCubit extends Cubit<number> {
  static schema = z.number().max(100);
}

const cubit = new CounterCubit();
cubit.emit(200); // ← Error thrown
```

Error message: `BlocValidationError: [CounterCubit] State validation failed: Number must be less than or equal to 100`

Clear, actionable, points to the problem.

**Option C:**
```typescript
class CounterCubit extends Cubit.fromSchema(z.number().max(100)) {
}

const cubit = new CounterCubit();
cubit.emit(200); // ← Error thrown
```

Same error message. Good.

Now, what if they forget to define a schema?

**Option A:**
```typescript
class CounterCubit extends Cubit<number> {
  // Forgot: static schema = z.number();
}

cubit.emit('invalid'); // ← TypeScript catches (good!)
// But if type assertion: cubit.emit('invalid' as any)
// Runtime: Continues with invalid state (bad!)
```

**Option C:**
```typescript
// Can't forget schema - it's required in `fromSchema()`
// If they don't use factory, no validation (same as Option A)
```

Both have similar usability. The key is: **Great error messages when validation fails**.

**Recommendation**: Option A or C, with focus on excellent error messages."

---

## Council Consensus

After discussion, the Council reached the following consensus:

### Top Recommendations (Ranked)

**1. Option A (Static Property) - 4 votes**
- Butler Lampson: "Simplest, most obvious"
- Alan Kay: "Solves the real problem"
- Nancy Leveson: "Most robust failure mode"
- Don Norman: "Clear, actionable errors"

**2. Option C (Factory Method) - 2 votes**
- Barbara Liskov: "Best type safety"
- Leslie Lamport: "Prevents type/schema divergence"

**3. Option E (Hybrid) - 1 vote**
- Martin Kleppmann: "Flexibility for different use cases"

### Key Insights

1. **Simplicity wins**: Complex type inference not worth the cognitive cost
2. **Consistency matters**: Should match existing BlaC patterns
3. **Type safety important**: But can be addressed with type helpers
4. **Error messages critical**: Must be clear and actionable
5. **Persistence integration**: All options work, versioning needed regardless

---

## Recommended Modifications to Option A

To address type safety concerns while maintaining simplicity:

### 1. Type Helper Utility

```typescript
// Validates that schema output type matches state type
type ValidateSchema<TState, TSchema extends StandardSchemaV1<any, TState>> = TSchema;

// Usage
class CounterCubit extends Cubit<number> {
  static schema: ValidateSchema<number, typeof schema> = z.number();
  //             ^^^^^^^^^^^^^ Catches type mismatches at compile time
}
```

### 2. Development-Mode Runtime Check

```typescript
constructor(initialState: S) {
  // ... existing initialization ...

  if (process.env.NODE_ENV === 'development' && this._schema) {
    // Validate that initial state type matches schema
    const result = this._schema['~standard'].validate(initialState);
    if ('issues' in result) {
      console.warn(
        `[${this._name}] Initial state validation failed. ` +
        `This suggests a type/schema mismatch:`,
        result.issues
      );
    }
  }
}
```

### 3. Schema Discovery Helper

```typescript
// For tooling and debugging
export function getSchema(bloc: BlocBase<any>): StandardSchemaV1 | undefined {
  return (bloc as any)._schema || bloc.constructor.schema;
}

// Usage
const schema = getSchema(myBloc);
if (schema) {
  console.log('Bloc uses schema from:', schema['~standard'].vendor);
}
```

---

## Final Recommendation

**Proceed with Option A: Static Schema Property**

### Rationale

1. **Simplicity**: Aligns with existing BlaC patterns, minimal cognitive load
2. **Consistency**: Matches `static isolated` and `static keepAlive` conventions
3. **Robustness**: Graceful degradation when schema not defined
4. **DX**: Clear, obvious, minimal boilerplate
5. **Persistence**: Easy integration with persistence plugin
6. **Council consensus**: 4 out of 7 experts recommended

### Enhancements

- Add type helper utility for compile-time type/schema validation
- Add development-mode runtime checks for early error detection
- Provide excellent error messages with `BlocValidationError`
- Document schema versioning patterns for migrations

### Trade-offs Accepted

- **Manual type specification**: Users must write `Cubit<number>` and `static schema = z.number()`
- **Potential drift**: Type and schema can diverge (mitigated by type helper)
- **No automatic inference**: TypeScript doesn't derive type from schema (acceptable trade-off)

---

**Next**: Create `recommendation.md` with detailed implementation plan.
