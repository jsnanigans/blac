# State Schema Validation Specifications

**Feature**: Integrate Standard Schema-based state validation into BlaC
**Date**: 2025-01-17
**Status**: Draft - Awaiting User Review

---

## Overview

Add optional schema-based state validation to BlaC's Bloc and Cubit classes, enabling runtime state integrity checking and enhanced persistence reliability using the Standard Schema specification.

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
- Validation runs on every `emit()` call
- Execution order:
  1. `Object.is()` / `===` check (existing)
  2. **[NEW] Schema validation** (if schema defined)
  3. Deep change detection for keys (existing)
  4. State update proceeds

**Persistence Operations**:
- Pre-save validation: Before serialization
- Pre-restore validation: After deserialization
- Both configurable independently

**Configuration**:
- Per-Bloc/Cubit basis via optional schema property
- If no schema defined, validation is completely bypassed (zero overhead)

#### 1.2 Validation Failure Handling

When validation fails:
- State update is **prevented** (state remains unchanged)
- `emit()` or `patch()` **throws an error** with validation details
- Error includes:
  - Validation issues (paths, messages)
  - Attempted state value
  - Current valid state
  - Schema identifier

#### 1.3 Manual Validation Methods

Add new methods to BlocBase:
```typescript
// Check if value matches schema without emitting
validate(value: S): ValidationResult

// Alias for validate (check naming preference in research)
check(value: S): ValidationResult

// Type guard for schema compliance
isValid(value: unknown): value is S
```

### 2. Performance Requirements

#### 2.1 Overhead Tolerance
- **Minimal overhead** when schema is defined
- **Zero overhead** when schema is not defined (no runtime checks)
- Validation must be synchronous for state updates
- No performance degradation to existing non-validated Blocs

#### 2.2 Production Behavior
- **No runtime disable option**: If schema is defined, validation always runs
- To disable validation: Don't define schema, use only TypeScript types
- Rationale: Partial validation is more dangerous than none

### 3. Integration Architecture

#### 3.1 Core Integration (Primary)
- Native support in `BlocBase`, `Bloc`, and `Cubit`
- Optional `schema` property on Bloc/Cubit classes
- Type inference from schema when provided

#### 3.2 Persistence Plugin Integration (Secondary)
- Persistence plugin can access Bloc's schema
- Persistence plugin can define **its own schema** (overrides Bloc's)
- Use cases:
  - Bloc schema: Validate all state changes
  - Persistence-only schema: Validate only save/restore, not runtime updates

#### 3.3 Hybrid Approach
```
┌─────────────────────────────────────┐
│ BlocBase / Cubit / Bloc             │
│ - Optional schema property          │
│ - Validates on emit()               │
│ - Type inference from schema        │
└─────────────────────────────────────┘
                 ↓
        ┌───────┴────────┐
        │                │
┌───────▼────────┐  ┌────▼──────────────┐
│ State Updates  │  │ Persistence Plugin│
│ - Use schema   │  │ - Use Bloc schema │
│ - Fail on err  │  │ - OR own schema   │
└────────────────┘  │ - Validate save   │
                    │ - Validate restore│
                    └───────────────────┘
```

### 4. Persistence Plugin Requirements

#### 4.1 Schema Configuration
- Schema is **optional** in persistence plugin
- Three modes:
  1. **No schema**: No validation (current behavior)
  2. **Use Bloc schema**: Reference `bloc.schema` if available
  3. **Own schema**: Plugin-specific schema (overrides Bloc's)

#### 4.2 Validation Points
- **Pre-save validation**: Before `serialize()` call
- **Pre-restore validation**: After `deserialize()` call
- Both independently configurable:
  ```typescript
  new PersistencePlugin({
    validation: {
      onSave: true,    // default: true if schema exists
      onRestore: true, // default: true if schema exists
    }
  })
  ```

#### 4.3 Migration Support
- Migration `transform` functions should support schemas
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

#### 5.1 API Design Preferences
The user expressed interest in Pattern B but is "not fully sold":

**Pattern B (Interested, but uncertain)**:
```typescript
const CounterSchema = z.object({ count: z.number() });
class CounterCubit extends Cubit.fromSchema(CounterSchema) {
  constructor() { super({ count: 0 }); }
}
```

**Research Task**: Explore variations and alternatives:
- Static schema property
- Schema factory methods
- Type helper utilities
- Comparison with other state management libraries

#### 5.2 Type Inference
- Schema should define state type, not duplicate it
- TypeScript type inferred from schema automatically
- No need to write: `class MyCubit extends Cubit<StateType>`
- Instead: `class MyCubit extends Cubit` (type inferred from schema)

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

1. **Backwards Compatibility**: No concern for breaking changes (per user)
2. **Version Migration**: No version numbering considerations
3. **Async Validation**: State updates must be synchronous
4. **Partial Validation**: No "validate some fields" option
5. **Schema Versioning**: Schema versioning is persistence plugin concern
6. **Custom Validators**: Only Standard Schema-compliant validators

---

## Success Criteria

### Must Have
- [ ] Zero runtime overhead when schema not defined
- [ ] Type inference from schema
- [ ] Validation on `emit()` throws on failure
- [ ] Persistence plugin can use Bloc schema
- [ ] Persistence plugin can define own schema
- [ ] Works with Zod, Valibot, and any Standard Schema library

### Should Have
- [ ] Ergonomic API (research best pattern)
- [ ] Clear error messages on validation failure
- [ ] Migration schema validation
- [ ] helper methods to validate data with the schema which should mirror the API of the schema library for ease of use

### Could Have
- [ ] Schema metadata access
- [ ] Validation performance metrics
- [ ] Schema composition utilities

---

## Open Questions for Research Phase

1. **API Design**: What's the best pattern for schema definition?
   - Static property vs. factory method vs. type helper?
   - How do other libraries (MobX, Zustand, Jotai) handle this?

2. **Error Handling**: What should validation error objects look like?
   - Custom `ValidationError` class?
   - Include schema info, path, current state?

3. **Type Inference**: What's the TypeScript magic needed?
   - Generic constraints
   - Conditional types
   - Standard Schema type utilities

4. **Performance**: Caching validation results?
   - Should we cache schema compilation?
   - How do validation libraries optimize this?

5. **Edge Cases**:
   - What if state is circular?
   - What about complex objects with class instances?
   - How do proxies interact with validation?

---

## Next Steps

1. **User Review**: Confirm these specifications are accurate ✓
2. **Research Phase**: Investigate implementation patterns and best practices
3. **Discussion Phase**: Compare approaches and make recommendations
4. **Implementation Plan**: Create detailed plan document

---

## Revision History

- **2025-01-17**: Initial draft based on user requirements gathering
