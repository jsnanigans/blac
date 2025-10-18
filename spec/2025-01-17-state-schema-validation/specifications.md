# State Schema Validation Specifications

**Feature**: Integrate Standard Schema-based state validation into BlaC
**Date**: 2025-01-17 (Updated: 2025-10-18)
**Status**: Updated Draft - Aligned with Current Codebase

---

## Overview

Add optional schema-based state validation to BlaC's Bloc and Cubit classes, enabling runtime state integrity checking and enhanced persistence reliability using the Standard Schema specification.

This specification has been updated to align with the current BlaC architecture including:
- Unified `SubscriptionManager` for state notifications
- `BlocLifecycleManager` for lifecycle state tracking
- Enhanced `BlocPluginRegistry` with new capabilities
- `BlacContext` for centralized logging and error handling
- Current `emit()` and `_pushState()` flow patterns

---

## Goals

1. **State Integrity**: Ensure state is always valid according to user-defined schemas
2. **Type Safety**: Infer TypeScript types from runtime schemas
3. **Zero Dependencies**: Use Standard Schema interface, no hard dependencies on specific validation libraries
4. **Minimal Overhead**: Opt-in per-Bloc, zero cost when not used
5. **Persistence Integration**: Enhanced save/restore validation for persistence plugin
6. **Library Agnostic**: Support Zod, Valibot, Yup, Joi, and any Standard Schema-compliant library

---

## Requirements

### 1. Validation Timing & Behavior

#### 1.1 Validation Execution Points

**State Updates (Bloc/Cubit)**:

The validation flow integrates with the current `Cubit.emit()` → `_pushState()` pipeline:

```typescript
Cubit.emit(newState) {
  // 1. Identity check (Object.is) - EXISTING
  if (Object.is(newState, this.state)) {
    return; // ✅ Skip validation - identical reference
  }

  // 2. Call _pushState
  this._pushState(newState, oldState);
}

BlocBase._pushState(newState, oldState, action?) {
  // 1. Lifecycle check - EXISTING
  if (currentState !== BlocLifecycleState.ACTIVE) {
    blacContext?.error(...);
    return;
  }

  // 2. Undefined check - EXISTING
  if (newState === undefined) {
    return;
  }

  // 3. Update internal state - EXISTING
  this._state = newState;

  // 4. Apply plugin transforms - EXISTING
  const transformedState = this._plugins.transformState(oldState, newState);
  this._state = transformedState;

  // 5. 🔍 SCHEMA VALIDATION (NEW) - After plugin transforms
  if (this._schema) {
    this._state = this._validateState(transformedState, oldState);
  }

  // 6. Notify plugins of state change - EXISTING
  this._plugins.notifyStateChange(oldState, this._state);

  // 7. Notify system plugins - EXISTING
  this.blacContext?.plugins.notifyStateChanged(this, oldState, this._state);

  // 8. Handle batching - EXISTING
  if (this._batchingManager.isCurrentlyBatching) {
    this._batchingManager.addUpdate({...});
    return;
  }

  // 9. Notify subscriptions - EXISTING
  this._subscriptionManager.notify(this._state, oldState, action);
  this.lastUpdate = Date.now();
}
```

**Key Decisions** (from user clarifications):
- ✅ Validation happens **AFTER** plugin transforms (validates final state)
- ✅ Validation is skipped when `Object.is()` returns true (identical reference)
- ✅ Validation in `patch()` validates the full merged state (not partial)

**Persistence Operations**:
- Pre-save validation: Before serialization
- Pre-restore validation: After deserialization
- Both configurable independently ✅

**Configuration**:
- Per-Bloc/Cubit basis via `static schema` property ✅
- If no schema defined, validation is completely bypassed (zero overhead)

#### 1.2 Validation Failure Handling

When validation fails:
- ✅ Validation error is **logged through BlacContext** with details
- ✅ **Throws `BlocValidationError`** with validation details
- ✅ State update is **prevented** (state remains unchanged)
- Error includes:
  - Validation issues (paths, messages)
  - Attempted state value
  - Current valid state (state before validation)
  - Bloc name

**Error Flow**:
```typescript
try {
  this._state = this._validateState(transformedState, oldState);
} catch (error) {
  if (error instanceof BlocValidationError) {
    // Log through BlacContext
    this.blacContext?.error(
      `[${this._name}] State validation failed: ${error.message}`,
      { error, bloc: this }
    );
  }
  // Restore previous state
  this._state = oldState;
  // Re-throw error
  throw error;
}
```

#### 1.3 Manual Validation Methods

Add new methods to `BlocBase`:

```typescript
// Validate value against schema without emitting
validate(value: unknown): ValidationResult<S>

// Parse with error (mirrors Zod's parse())
parse(value: unknown): S  // throws BlocValidationError

// Parse without error (mirrors Zod's safeParse())
safeParse(value: unknown): SafeParseResult<S>

// Type guard for schema compliance
isValid(value: unknown): value is S

// Access schema (public getter) ✅
get schema(): StandardSchemaV1<any, S> | undefined
```

**User Decision**: ✅ Expose schema as public getter for external validation use cases

### 2. Performance Requirements

#### 2.1 Overhead Tolerance
- **Zero overhead** when schema is not defined (no runtime checks)
- **Minimal overhead** when schema is defined
- Validation must be synchronous for state updates
- No performance degradation to existing non-validated Blocs
- Identity check (`Object.is()`) short-circuits validation ✅

#### 2.2 Production Behavior
- **No runtime disable option**: If schema is defined, validation always runs
- To disable validation: Don't define schema, use only TypeScript types
- Rationale: Partial validation is more dangerous than none

### 3. Integration Architecture

#### 3.1 Core Integration (Primary)
- Native support in `BlocBase`, `Bloc`, and `Cubit`
- `static schema` property on Bloc/Cubit classes ✅
- Type inference from schema when provided
- Schema initialized in `BlocBase` constructor from static property

```typescript
interface BlocStaticProperties {
  isolated: boolean;
  keepAlive: boolean;
  plugins?: BlocPlugin<any, any>[];
  schema?: StandardSchemaV1<any>; // ← NEW
}
```

#### 3.2 Persistence Plugin Integration (Secondary)

The persistence plugin integrates with bloc schemas:

```typescript
new PersistencePlugin({
  key: 'my-bloc',

  // Schema options:
  // - undefined: Use bloc's schema if available
  // - null: Disable validation even if bloc has schema
  // - CustomSchema: Override bloc's schema
  schema?: StandardSchemaV1<any, T> | null,

  // Validation configuration ✅
  validation?: {
    onSave?: boolean,    // default: true if schema exists
    onRestore?: boolean, // default: true if schema exists
  }
})
```

**Persistence Error Handling** (from user decision):
- ✅ **Throw errors, prevent updates**: Invalid state throws error, prevents state corruption
- On restore: Throw error, keep current/initial state
- On save: Throw error, don't save invalid state

#### 3.3 Hybrid Approach

```
┌─────────────────────────────────────┐
│ BlocBase / Cubit / Bloc             │
│ - static schema property            │
│ - Validates after plugin transforms │
│ - Type inference from schema        │
│ - Public schema getter              │
└─────────────────────────────────────┘
                 ↓
        ┌───────┴────────┐
        │                │
┌───────▼────────┐  ┌────▼──────────────┐
│ State Updates  │  │ Persistence Plugin│
│ - After plugins│  │ - Use Bloc schema │
│ - Skip if same │  │ - OR own schema   │
│ - Log & throw  │  │ - OR disable (null)│
└────────────────┘  │ - Config save/load│
                    │ - Throw on invalid│
                    └───────────────────┘
```

### 4. Persistence Plugin Requirements

#### 4.1 Schema Configuration
- Schema is **optional** in persistence plugin
- Three modes:
  1. **No schema (undefined)**: Use bloc's schema if available
  2. **Disable schema (null)**: Skip validation even if bloc has schema
  3. **Own schema**: Plugin-specific schema (overrides bloc's)

#### 4.2 Validation Points ✅
- **Pre-save validation**: Before `serialize()` call
- **Pre-restore validation**: After `deserialize()` call
- Both independently configurable:
  ```typescript
  validation: {
    onSave: true,    // default: true if schema exists
    onRestore: true, // default: true if schema exists
  }
  ```

#### 4.3 Error Handling ✅
- Invalid state on **restore**: Throw error, keep current state, call `onError` callback
- Invalid state on **save**: Throw error, don't persist, call `onError` callback
- Errors are logged through persistence plugin's error handling

#### 4.4 Migration Support
- Migration `transform` functions can specify schemas
- Validate migration output before applying
- Configuration:
  ```typescript
  migrations: [{
    from: 'old-key',
    transform: (old) => newState,
    schema: MigrationOutputSchema, // Optional validation
  }]
  ```

### 5. Developer Experience

#### 5.1 API Design ✅

**User Decision**: Keep static schema property pattern

```typescript
const CounterSchema = z.object({ count: z.number() });

class CounterCubit extends Cubit<number> {
  static schema = CounterSchema; // ✅ User-approved pattern

  constructor() {
    super(0);
  }
}
```

**Rationale**:
- Consistent with existing patterns (`static isolated`, `static keepAlive`)
- Simple, declarative syntax
- Easy to understand and implement
- Works well with current codebase architecture

#### 5.2 Type Inference
- Schema should define state type, not duplicate it
- TypeScript type inferred from schema automatically
- Use `z.infer<typeof Schema>` or similar for type extraction
- Example:
  ```typescript
  const UserSchema = z.object({ name: z.string(), age: z.number() });
  type UserState = z.infer<typeof UserSchema>;

  class UserCubit extends Cubit<UserState> {
    static schema = UserSchema;
  }
  ```

### 6. Dependency Management

#### 6.1 Core Package (`@blac/core`)
- **No hard dependencies** on validation libraries
- Implement Standard Schema interface detection
- Type definitions for Standard Schema v1
- Generic validation error types

#### 6.2 Persistence Plugin (`@blac/plugin-persistence`)
- Use schema from Bloc when available
- Provide API to access/override schemas
- No additional dependencies

#### 6.3 Standard Schema Support
- Support any library implementing `StandardSchemaV1`:
  - Zod
  - Valibot
  - ArkType
  - Effect Schema
  - Yup
  - Joi
  - Custom implementations

---

## Non-Requirements

### Explicitly Out of Scope

1. **Backwards Compatibility**: No concern for breaking changes
2. **Version Migration**: No version numbering considerations
3. **Async Validation**: State updates must be synchronous
4. **Partial Validation**: No "validate some fields" option (patch validates full merged state ✅)
5. **Schema Versioning**: Schema versioning is persistence plugin concern
6. **Custom Validators**: Only Standard Schema-compliant validators
7. **Runtime Disable**: No way to disable validation at runtime if schema defined

---

## Success Criteria

### Must Have
- [ ] Zero runtime overhead when schema not defined
- [ ] Type inference from schema
- [ ] Validation after plugin transforms, skip on identical reference ✅
- [ ] Validation on `emit()` throws `BlocValidationError` on failure
- [ ] Validation errors logged through `BlacContext` ✅
- [ ] Public schema getter for external validation ✅
- [ ] Persistence plugin can use Bloc schema
- [ ] Persistence plugin can define own schema
- [ ] Persistence plugin can disable validation with `schema: null`
- [ ] Persistence validation separately configurable (save vs restore) ✅
- [ ] Persistence validation throws errors, prevents updates ✅
- [ ] Works with Zod, Valibot, and any Standard Schema library

### Should Have
- [ ] Clear error messages on validation failure
- [ ] Migration schema validation
- [ ] Helper methods mirror schema library APIs (parse, safeParse)
- [ ] Full `patch()` state validation ✅

### Could Have
- [ ] Schema metadata access
- [ ] Validation performance metrics
- [ ] Schema composition utilities

---

## Implementation Summary

### Key Changes from Original Spec

1. **Validation Timing**: Now happens **after** plugin transforms (not before) ✅
2. **Identity Optimization**: Skip validation when `Object.is()` returns true ✅
3. **Error Logging**: Use `BlacContext` for logging before throwing ✅
4. **Schema Access**: Expose as public getter ✅
5. **Persistence Config**: Separately configurable save/restore validation ✅
6. **Persistence Errors**: Strict - throw errors, prevent updates ✅
7. **API Pattern**: Confirmed `static schema` property approach ✅
8. **Patch Validation**: Validate full merged state ✅

### Integration Points

1. **BlocBase Constructor**: Initialize `_schema` from static property
2. **BlocBase._pushState()**: Add validation after plugin transforms
3. **BlocBase Methods**: Add validate(), parse(), safeParse(), isValid(), schema getter
4. **PersistencePlugin**: Add schema property, validation config, validation in save/restore
5. **BlacContext**: Use for validation error logging

---

## Open Questions for Research Phase

1. **Type Inference Magic**: What's the best TypeScript approach for inferring state type from schema?
2. **Error Details**: What should `BlocValidationError` include for best debugging experience?
3. **Performance Impact**: What's the actual overhead of validation in realistic scenarios?
4. **Plugin Transform Edge Cases**: What happens if plugin transforms state to invalid shape?
5. **Standard Schema Compliance**: Are there any Standard Schema edge cases to handle?
6. **BlacContext Integration**: How should validation errors integrate with existing error handling?

---

## Next Steps

1. ✅ **User Clarifications**: Confirmed all design decisions
2. **Research Phase**: Investigate implementation patterns and current codebase integration
3. **Discussion Phase**: Validate approach and explore alternatives
4. **Implementation Plan**: Create detailed task breakdown

---

## Revision History

- **2025-01-17**: Initial draft based on user requirements gathering
- **2025-10-18**: Updated specification aligned with current codebase architecture and user clarifications
