# State Schema Validation - Implementation Plan

**Feature**: Integrate Standard Schema-based state validation into BlaC
**Date**: 2025-01-17 (Updated: 2025-10-18)
**Status**: ✅ **PHASES 1 & 2 COMPLETE** - Core validation and persistence integration implemented
**Estimated Timeline**: 4-7 days
**Progress**: Phase 1 (Complete) | Phase 2 (Complete) | Phase 3 (Pending) | Phase 4 (Pending) | Phase 5 (Pending)

---

## Overview

This plan implements schema-based state validation for BlaC aligned with the current codebase architecture. All user decisions have been confirmed:

✅ Validation **after** plugin transforms
✅ Skip validation on identical reference (`Object.is()`)
✅ **Static schema property** pattern
✅ **Public schema getter**
✅ **Log through BlacContext** before throwing
✅ **Separately configurable** persistence validation (save/restore)
✅ **Throw errors** on invalid persistence state
✅ **Full state** validation in `patch()`

---

## Phase 1: Core Validation Infrastructure

### Task 1.1: Create Standard Schema Type Definitions
**File**: `packages/blac/src/validation/types.ts` (**NEW**)

```typescript
// Create comprehensive Standard Schema V1 type definitions
// Including: StandardSchemaV1 interface, Result types, Issue types
// Type inference helpers: InferInput, InferOutput, ValidateSchema
// Type guard: isStandardSchema()
```

**Checklist**:
- [ ] #P Define `StandardSchemaV1` interface #S:s
- [ ] #P Define `StandardSchemaV1.Props` interface #S:s
- [ ] #P Define `Result<Output>`, `SuccessResult`, `FailureResult` types #S:s
- [ ] #P Define `Issue` and `PathSegment` interfaces #S:s
- [ ] #P Define `Types` interface for static inference #S:s
- [ ] #P Create `InferInput<TSchema>` type helper #S:s
- [ ] #P Create `InferOutput<TSchema>` type helper #S:s
- [ ] #P Create `ValidateSchema<TState, TSchema>` type helper #S:s
- [ ] #P Implement `isStandardSchema()` type guard function #S:m
- [ ] Add JSDoc comments explaining Standard Schema spec #S:s

**Dependencies**: None
**Estimated Time**: 1-2 hours

---

### Task 1.2: Create BlocValidationError Class
**File**: `packages/blac/src/validation/BlocValidationError.ts` (**NEW**)

```typescript
// Extend BlacError with VALIDATION category and FATAL severity
// Include validation issues, attempted state, current state
// Provide helper methods for issue inspection
```

**Checklist**:
- [ ] Import `BlacError`, `ErrorCategory`, `ErrorSeverity` from `./errors` #S:s
- [ ] Import `StandardSchemaV1` from `./validation/types` #S:s
- [ ] Define `BlocValidationError` class extending `BlacError` #S:m
- [ ] Add readonly properties: `issues`, `attemptedState`, `currentState` #S:s
- [ ] Implement constructor with issue formatting #S:m
- [ ] Add `firstIssue` getter #S:s
- [ ] Add `hasIssueAt(path: string)` method #S:s
- [ ] Add `getIssuesAt(path: string)` method #S:s
- [ ] Add private `formatPath()` helper #S:s
- [ ] Add private static `formatIssues()` helper #S:m
- [ ] Add `toJSON()` serialization method #S:s
- [ ] Add comprehensive JSDoc comments #S:s

**Dependencies**: Task 1.1
**Estimated Time**: 2-3 hours

---

### Task 1.3: Update BlocBase with Schema Support
**File**: `packages/blac/src/BlocBase.ts` (**MODIFY**)

**Part A: Add Types and Properties**

**Checklist**:
- [ ] Import validation types from `./validation/types` #S:s
- [ ] Import `BlocValidationError` from `./validation/BlocValidationError` #S:s
- [ ] Add `schema?: StandardSchemaV1<any>` to `BlocStaticProperties` interface #S:s
- [ ] Add `protected _schema?: StandardSchemaV1<any, S>` property to `BlocBase` class #S:s

**Part B: Initialize Schema in Constructor** (around line 120-150)

**Checklist**:
- [ ] After existing initialization, get schema from static property #S:m
- [ ] Validate schema implements Standard Schema interface using `isStandardSchema()` #S:s
- [ ] Throw `TypeError` if schema invalid #S:s
- [ ] Assign schema to `this._schema` #S:s
- [ ] Validate `initialState` if schema defined #S:m
- [ ] Handle validation errors in constructor (wrap and throw) #S:s

**Part C: Add _validateState() Method** (**NEW**)

**Checklist**:
- [ ] Create protected `_validateState(state: S, oldState?: S): S` method #S:l
- [ ] Return early if no schema defined #S:s
- [ ] Call `schema['~standard'].validate(state)` #S:s
- [ ] Check if result is Promise, throw error if async #S:m
- [ ] If result has issues, throw `BlocValidationError` #S:m
- [ ] Return validated value (may differ due to coercion) #S:s
- [ ] Add comprehensive error context #S:s

**Part D: Integrate Validation in _pushState()** (around line 230-279)

**Current location**: After plugin transforms, before plugin notifications

**Checklist**:
- [ ] After `this._state = transformedState` (line ~254) #S:m
- [ ] Add validation block with try/catch #S:m
- [ ] Call `this._validateState(transformedState, oldState)` #S:s
- [ ] On error: log through `this.blacContext?.error()` #S:s
- [ ] On error: restore `this._state = oldState` #S:s
- [ ] On error: re-throw error #S:s
- [ ] Update `this._state` with validated result #S:s

**Part E: Add Public Validation Helper Methods** (**NEW**)

**Checklist**:
- [ ] Add `validate(value: unknown): ValidationResult<S>` method #S:m
- [ ] Add `isValid(value: unknown): value is S` method #S:s
- [ ] Add `parse(value: unknown): S` method (throws on error) #S:s
- [ ] Add `safeParse(value: unknown): SafeParseResult<S>` method #S:m
- [ ] Add `get schema(): StandardSchemaV1<any, S> | undefined` getter #S:s
- [ ] Add JSDoc comments for all methods #S:m

**Part F: Add Type Definitions** (end of file)

**Checklist**:
- [ ] Export `ValidationResult<T>` type #S:s
- [ ] Export `SafeParseResult<T>` type #S:s

**Dependencies**: Tasks 1.1, 1.2
**Estimated Time**: 4-6 hours

---

### Task 1.4: Update Core Package Exports
**File**: `packages/blac/src/index.ts` (**MODIFY**)

**Checklist**:
- [ ] Add validation types export: `export * from './validation/types'` #S:s
- [ ] Add validation error export: `export * from './validation/BlocValidationError'` #S:s
- [ ] Add validation result types to BlocBase exports #S:s

**Dependencies**: Tasks 1.1, 1.2, 1.3
**Estimated Time**: 15 minutes

---

## Phase 2: Persistence Plugin Integration

### Task 2.1: Update Persistence Plugin Types
**File**: `packages/plugins/bloc/persistence/src/types.ts` (**MODIFY**)

**Checklist**:
- [ ] Import `StandardSchemaV1` from `@blac/core` #S:s
- [ ] Add `schema?: StandardSchemaV1<any, T> | null` to `PersistenceOptions` #S:s
- [ ] Add `validation?: { onSave?: boolean; onRestore?: boolean }` to `PersistenceOptions` #S:m
- [ ] Add `schema?: StandardSchemaV1<any, T>` to `PersistenceMigration` interface #S:s
- [ ] Add JSDoc comments explaining schema behavior #S:s

**Dependencies**: Phase 1 complete
**Estimated Time**: 30 minutes

---

### Task 2.2: Implement Schema Validation in PersistencePlugin
**File**: `packages/plugins/bloc/persistence/src/PersistencePlugin.ts` (**MODIFY**)

**Part A: Add Properties and Initialization**

**Checklist**:
- [ ] Add private `schema?: StandardSchemaV1<any, TState> | null` property #S:s
- [ ] Add private `validateOnSave: boolean` property #S:s
- [ ] Add private `validateOnRestore: boolean` property #S:s
- [ ] Initialize properties in constructor from options #S:m
- [ ] Set defaults: `validateOnSave = true`, `validateOnRestore = true` #S:s

**Part B: Add getSchema() Helper Method** (**NEW**)

**Checklist**:
- [ ] Create private `getSchema(bloc: BlocBase<TState>)` method #S:m
- [ ] If `this.schema === null`, return `undefined` (explicit disable) #S:s
- [ ] If `this.schema !== undefined`, return `this.schema` (override) #S:s
- [ ] Otherwise, return `bloc.schema` (use bloc's schema) #S:s
- [ ] Add JSDoc explaining schema resolution logic #S:s

**Part C: Add Validation in onAttach() - Restore** (around line 45-108)

**Checklist**:
- [ ] After deserialization and decryption (around line 75) #S:m
- [ ] Check if `this.validateOnRestore` is true #S:s
- [ ] Get schema via `this.getSchema(bloc)` #S:s
- [ ] If schema exists, validate deserialized state #S:m
- [ ] Handle Promise result (throw error if async) #S:s
- [ ] If validation fails, log error via `this.handleError()` #S:s
- [ ] If validation fails, return early (don't restore invalid state) #S:s
- [ ] Use validated value (may have coerced fields) #S:s

**Part D: Add Validation in saveState() - Save** (around line 143-180)

**Checklist**:
- [ ] After selecting partial state (around line 155) #S:m
- [ ] Check if `this.validateOnSave` is true #S:s
- [ ] Get schema via `this.getSchema(this.bloc!)` #S:s
- [ ] If schema exists, validate state before serialization #S:m
- [ ] Handle Promise result (throw error if async) #S:s
- [ ] If validation fails, log error via `this.handleError()` #S:s
- [ ] If validation fails, return early (don't save invalid state) #S:s
- [ ] Use validated value for serialization #S:s

**Part E: Add Validation in tryMigrations()** (existing method)

**Checklist**:
- [ ] After transform in migration loop #S:m
- [ ] Check if `migration.schema` exists #S:s
- [ ] If exists, validate migrated data #S:m
- [ ] Handle Promise result (throw error if async) #S:s
- [ ] If validation fails, throw error (migration fails) #S:m
- [ ] Use validated migrated data #S:s

**Dependencies**: Task 2.1
**Estimated Time**: 3-4 hours

---

## Phase 3: Testing

### Task 3.1: Core Validation Unit Tests
**File**: `packages/blac/src/__tests__/validation.test.ts` (**NEW**)

**Test Coverage**:
- [ ] Schema initialization from static property #S:m
- [ ] Validation on initial state (success) #S:s
- [ ] Validation on initial state (failure) #S:s
- [ ] Validation on `emit()` (success) #S:s
- [ ] Validation on `emit()` (failure, state unchanged) #S:m
- [ ] No validation without schema #S:s
- [ ] Identity check short-circuit (`Object.is()`) #S:m
- [ ] Validation after plugin transforms #S:l
- [ ] Plugin transform produces invalid state (should fail) #S:m
- [ ] Async schema detection (should throw) #S:s
- [ ] `validate()` method returns success #S:s
- [ ] `validate()` method returns failure #S:s
- [ ] `validate()` throws if no schema #S:s
- [ ] `isValid()` returns true for valid value #S:s
- [ ] `isValid()` returns false for invalid value #S:s
- [ ] `isValid()` returns true if no schema #S:s
- [ ] `parse()` returns value for valid input #S:s
- [ ] `parse()` throws for invalid input #S:s
- [ ] `safeParse()` returns success for valid input #S:s
- [ ] `safeParse()` returns error for invalid input #S:s
- [ ] `schema` getter returns schema #S:s
- [ ] `schema` getter returns undefined if no schema #S:s
- [ ] BlocValidationError structure and methods #S:m
- [ ] BlacContext logging integration #S:m

**Dependencies**: Phase 1 complete
**Estimated Time**: 4-5 hours

---

### Task 3.2: Integration Tests with Real Schemas
**File**: `packages/blac/src/__tests__/validation.integration.test.ts` (**NEW**)

**Test Coverage**:
- [ ] Zod integration - simple schema #S:m
- [ ] Zod integration - complex nested schema #S:m
- [ ] Zod integration - with coercion/defaults #S:m
- [ ] Valibot integration - simple schema #S:m
- [ ] Valibot integration - complex nested schema #S:m
- [ ] Error messages are descriptive #S:s
- [ ] State restoration on validation failure #S:m
- [ ] `patch()` validates full merged state #S:m
- [ ] Vertex (Bloc) with schema #S:m

**Dependencies**: Phase 1 complete, Zod and Valibot installed as dev dependencies
**Estimated Time**: 3-4 hours

---

### Task 3.3: Persistence Plugin Tests
**File**: `packages/plugins/bloc/persistence/src/__tests__/validation.test.ts` (**NEW**)

**Test Coverage**:
- [ ] Schema resolution - use bloc schema #S:m
- [ ] Schema resolution - use plugin schema (override) #S:m
- [ ] Schema resolution - disable with `schema: null` #S:m
- [ ] Validation on restore (success) #S:m
- [ ] Validation on restore (failure, state not restored) #S:m
- [ ] Validation on save (success) #S:m
- [ ] Validation on save (failure, state not saved) #S:m
- [ ] Validation config - `onSave: false` #S:s
- [ ] Validation config - `onRestore: false` #S:s
- [ ] Migration with schema validation (success) #S:m
- [ ] Migration with schema validation (failure) #S:m
- [ ] Partial state selection with validation #S:m
- [ ] Async schema detection (should throw) #S:s

**Dependencies**: Phase 2 complete, Zod installed as dev dependency
**Estimated Time**: 3-4 hours

---

### Task 3.4: Performance Benchmarks
**File**: `packages/blac/src/__tests__/validation.performance.test.ts` (**NEW**)

**Benchmark Coverage**:
- [ ] Zero overhead without schema (10k emits) #S:m
- [ ] Validation overhead with simple schema (10k emits) #S:m
- [ ] Validation overhead with complex schema (10k emits) #S:m
- [ ] Identity check short-circuit (10k identical emits) #S:m
- [ ] Comparison: Zod vs Valibot performance #S:m

**Dependencies**: Phase 1 complete, Zod and Valibot installed
**Estimated Time**: 2-3 hours

---

## Phase 4: Documentation

### Task 4.1: Feature Guide
**File**: `apps/docs/src/content/guide/state-validation.mdx` (**NEW**)

**Sections**:
- [ ] Overview and introduction #S:m
- [ ] Quick start with Zod #S:m
- [ ] Quick start with Valibot #S:m
- [ ] When to use validation #S:s
- [ ] When NOT to use validation #S:s
- [ ] Basic examples (Counter, User) #S:m
- [ ] Complex nested state example #S:l
- [ ] Error handling patterns #S:m
- [ ] Helper methods (validate, parse, safeParse) #S:m
- [ ] Persistence integration #S:m
- [ ] Performance considerations #S:s
- [ ] TypeScript type inference #S:m
- [ ] Troubleshooting common issues #S:m

**Dependencies**: All phases complete
**Estimated Time**: 4-5 hours

---

### Task 4.2: API Reference
**Files**: Various in `apps/docs/src/content/api/`

**Sections**:
- [ ] `BlocBase.schema` getter documentation #S:s
- [ ] `BlocBase.validate()` method documentation #S:s
- [ ] `BlocBase.parse()` method documentation #S:s
- [ ] `BlocBase.safeParse()` method documentation #S:s
- [ ] `BlocBase.isValid()` method documentation #S:s
- [ ] `BlocValidationError` class documentation #S:m
- [ ] Standard Schema types documentation #S:m
- [ ] `PersistencePlugin` schema options documentation #S:m
- [ ] `PersistencePlugin` validation options documentation #S:m

**Dependencies**: All phases complete
**Estimated Time**: 3-4 hours

---

### Task 4.3: Migration Guide
**File**: `apps/docs/src/content/guide/migration-validation.mdx` (**NEW**)

**Sections**:
- [ ] Adding validation to existing Blocs #S:m
- [ ] Choosing a validation library #S:s
- [ ] Step-by-step migration example #S:m
- [ ] Persistence plugin migration #S:m
- [ ] Handling validation errors #S:m
- [ ] Performance impact and optimization #S:s

**Dependencies**: All phases complete
**Estimated Time**: 2-3 hours

---

### Task 4.4: Code Examples
**Files**: `apps/playground/src/demos/validation/` (**NEW directory**)

**Examples**:
- [ ] Basic Counter with validation #S:m
- [ ] Form validation (complex state) #S:l
- [ ] API response validation #S:m
- [ ] Persistence with validation #S:m
- [ ] Error handling showcase #S:m
- [ ] Schema migration example #S:l
- [ ] Performance comparison (Zod vs Valibot) #S:m

**Dependencies**: Phase 1 and 2 complete
**Estimated Time**: 5-6 hours

---

## Phase 5: Polish & Release

### Task 5.1: Code Review and Cleanup
**Checklist**:
- [ ] Review all new code for consistency #S:m
- [ ] Ensure JSDoc comments are comprehensive #S:m
- [ ] Check TypeScript strict mode compliance #S:s
- [ ] Verify error messages are helpful #S:s
- [ ] Confirm zero-overhead for non-validated blocs #S:m
- [ ] Run linter and fix issues: `pnpm lint:fix` #S:s
- [ ] Run type checker: `pnpm typecheck` #S:s

**Dependencies**: All previous phases complete
**Estimated Time**: 2-3 hours

---

### Task 5.2: Final Testing
**Checklist**:
- [ ] Run all core tests: `pnpm --filter @blac/core test` #S:m
- [ ] Run persistence plugin tests: `pnpm --filter @blac/plugin-persistence test` #S:m
- [ ] Run full test suite: `pnpm test` #S:l
- [ ] Verify test coverage meets standards #S:s
- [ ] Test with real Zod schemas #S:m
- [ ] Test with real Valibot schemas #S:m
- [ ] Manual testing in playground app #S:m

**Dependencies**: All previous phases complete
**Estimated Time**: 2-3 hours

---

### Task 5.3: Documentation Review
**Checklist**:
- [ ] Review all documentation for accuracy #S:m
- [ ] Ensure examples work correctly #S:m
- [ ] Check for typos and formatting #S:s
- [ ] Verify code snippets are correct #S:m
- [ ] Test documentation build: `pnpm --filter docs build` #S:s

**Dependencies**: Task 4.x complete
**Estimated Time**: 1-2 hours

---

## Summary

### Total Estimated Time: 4-7 days

**Breakdown**:
- Phase 1 (Core): 8-12 hours (1-1.5 days)
- Phase 2 (Persistence): 4-5 hours (0.5-0.75 days)
- Phase 3 (Testing): 12-16 hours (1.5-2 days)
- Phase 4 (Documentation): 14-18 hours (1.75-2.25 days)
- Phase 5 (Polish): 5-8 hours (0.625-1 day)

### Risk Assessment: **LOW**

**Reasons**:
- Well-defined requirements with user decisions confirmed
- Clear integration points in existing codebase
- Standard Schema is stable and well-documented
- No breaking changes to existing functionality
- Comprehensive test coverage planned

### Dependencies

**External**:
- None (Standard Schema is interface-only, no runtime dependency)

**Dev Dependencies** (for testing/examples):
- `zod` (test/example usage)
- `valibot` (test/example usage)

### Success Criteria

**Must Pass**:
- [ ] All existing tests continue to pass
- [ ] Zero overhead when schema not defined (benchmarked)
- [ ] Validation throws BlocValidationError on failure
- [ ] Errors logged through BlacContext
- [ ] Public schema getter available
- [ ] Persistence plugin schema integration works
- [ ] Works with Zod and Valibot

**Should Have**:
- [ ] Clear error messages
- [ ] Comprehensive documentation
- [ ] Working examples in playground
- [ ] Migration guide available

---

## Implementation Notes

### Code Style
- Follow existing BlaC conventions
- Use arrow functions for Bloc/Cubit methods
- Comprehensive JSDoc comments
- TypeScript strict mode compliant

### Testing Strategy
- Unit tests for all core functionality
- Integration tests with real schema libraries
- Performance benchmarks for overhead verification
- Manual testing in playground

### Documentation Strategy
- Progressive disclosure (simple → complex)
- Code-first examples
- Clear migration paths
- Performance guidance

---

## Implementation Progress

### ✅ Phase 1: Core Validation Infrastructure (COMPLETE)

**Implemented Files**:
- ✅ `packages/blac/src/validation/types.ts` - Standard Schema V1 type definitions
- ✅ `packages/blac/src/validation/BlocValidationError.ts` - Validation error class
- ✅ `packages/blac/src/validation/index.ts` - Validation exports
- ✅ `packages/blac/src/BlocBase.ts` - Schema support integration
- ✅ `packages/blac/src/index.ts` - Core package exports

**Features Added**:
- StandardSchemaV1 interface and type helpers (InferInput, InferOutput, ValidateSchema)
- BlocValidationError extending BlacError with VALIDATION category and FATAL severity
- BlocBase._schema property and initialization from static schema property
- BlocBase._validateState() method for internal validation
- Validation in _pushState() after plugin transforms, with BlacContext logging
- Public helper methods: validate(), isValid(), parse(), safeParse()
- Public schema getter for external validation
- ValidationResult and SafeParseResult types

**Build Status**: ✅ Successfully compiles with no errors

---

### ✅ Phase 2: Persistence Plugin Integration (COMPLETE)

**Implemented Files**:
- ✅ `packages/plugins/bloc/persistence/src/types.ts` - Updated with schema and validation options
- ✅ `packages/plugins/bloc/persistence/src/PersistencePlugin.ts` - Validation integration

**Features Added**:
- PersistenceOptions.schema (StandardSchemaV1 | null) for schema override/disable
- PersistenceOptions.validation.onSave and onRestore configuration
- PersistenceMigration.schema for migration output validation
- PersistencePlugin.getSchema() for schema resolution (plugin > bloc > undefined)
- Validation in onAttach() for state restoration
- Validation in saveState() before persistence
- Validation in tryMigrations() for migration output
- Async validation detection with clear error messages

**Build Status**: ✅ Successfully compiles with no errors

---

## Next Steps

1. ✅ Specifications complete
2. ✅ Research complete
3. ✅ User decisions confirmed
4. ✅ Implementation plan created
5. ✅ **PHASE 1 COMPLETE**: Core validation infrastructure
6. ✅ **PHASE 2 COMPLETE**: Persistence plugin integration
7. **NEXT**: Phase 3 - Testing (unit tests, integration tests, performance benchmarks)
8. **PENDING**: Phase 4 - Documentation (feature guide, API reference, migration guide, examples)
9. **PENDING**: Phase 5 - Polish & Release (code review, final testing, documentation review)

**Implementation Summary**: Core validation and persistence integration are complete and build successfully. The foundation is ready for testing and documentation.
