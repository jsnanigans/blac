# Code Quality Refactoring Specifications

## Overview
This specification defines a comprehensive refactoring of the @blac/core package to address critical code quality issues identified in the exploration report. The refactoring will focus on type safety, architectural clarity, and maintainability improvements.

## Goals & Objectives

### Primary Goals
1. **Eliminate type unsafety**: Replace all 22+ `as any` type assertions with proper type-safe alternatives
2. **Clarify subscription architecture**: Research and consolidate/document the dual subscription systems
3. **Remove dead code**: Eliminate unused code paths and classes
4. **Improve maintainability**: Break up complex classes into focused, single-responsibility components

### Success Criteria
- Zero `as any` type assertions in production code
- Clear documentation and separation of SubscriptionManager vs UnifiedDependencyTracker roles
- All dead code removed (PropsUpdated event, unused BatchingManager methods)
- SubscriptionManager refactored into 3-5 smaller, focused classes
- All existing tests pass without modification
- New integration tests validate refactored behavior matches original

## Requirements

### Functional Requirements
1. **Preserve all public API behavior** (minor changes allowed for unused exports)
2. **Maintain backward compatibility** for all actively used features
3. **Support all existing subscription patterns** (priorities, selectors, weak references)
4. **Preserve all lifecycle management semantics**
5. **Keep plugin system fully functional**

### Non-Functional Requirements
1. **Performance**: No regression in subscription notification performance
2. **Memory**: Reduce or maintain current memory footprint
3. **Type Safety**: Achieve 100% type coverage without unsafe casts
4. **Testability**: Improve test organization and reduce fragmentation
5. **Documentation**: Clear architectural documentation for all systems

## Constraints

### Technical Constraints
- **Risk Level**: Conservative approach with incremental changes
- **Testing**: Each change must be validated with snapshot and integration tests
- **API Changes**: Only minor changes to remove unused exports allowed
- **Dependencies**: Cannot introduce new external dependencies
- **Node Version**: Must support Node.js 22+
- **TypeScript**: Must use strict mode throughout

### Process Constraints
- **Incremental Delivery**: Changes must be deliverable in small, safe increments
- **Test Coverage**: Cannot reduce existing test coverage
- **Review Points**: Each major refactoring requires test validation before proceeding
- **Rollback**: Each change must be independently reversible

## Scope

### In Scope
1. **Type assertion cleanup** (22+ instances)
   - Convert private members to protected where appropriate
   - Add proper type declarations for internal APIs
   - Remove all `as any` casts

2. **Subscription system consolidation**
   - Research current usage patterns
   - Document responsibilities of each system
   - Potentially merge or clearly separate concerns

3. **Dead code removal**
   - Remove PropsUpdated event
   - Remove unused BatchingManager methods
   - Clean up unused test utilities

4. **SubscriptionManager refactoring**
   - Extract sorting logic to SortedSubscriptions class
   - Extract path indexing to PathSubscriptionIndex class
   - Extract cache management to SubscriptionCacheManager class
   - Extract WeakRef handling to WeakRefManager class

### Out of Scope
- Complete API redesign
- Performance optimizations beyond current architecture
- New feature development
- Migration to different state management patterns
- Changes to React integration (blac-react package)
- Plugin system redesign

## Technical Specifications

### Type System Improvements
- Replace `as any` with proper type guards and type predicates
- Use protected members for cross-class access within inheritance hierarchy
- Create internal type definitions for framework-internal APIs
- Leverage TypeScript's declaration merging for internal extensions

### Architecture Refactoring
- Apply Single Responsibility Principle to large classes
- Use composition over inheritance where appropriate
- Implement clear separation of concerns between systems
- Create facade interfaces for complex subsystems

### Testing Strategy
- Create snapshot tests before each refactoring to detect changes
- Add integration tests for high-level API behavior
- Organize tests by feature/responsibility rather than by class
- Use test fixtures to reduce duplication

## Risk Assessment

### Identified Risks
1. **Breaking changes**: Could inadvertently break consumer code
   - Mitigation: Comprehensive snapshot testing, conservative approach

2. **Performance regression**: Refactoring could impact performance
   - Mitigation: Performance benchmarks before/after changes

3. **Test fragility**: Existing fragmented tests might break
   - Mitigation: Fix tests incrementally, improve organization

4. **Merge conflicts**: Long-running refactor could conflict with other work
   - Mitigation: Deliver in small, mergeable increments

### Risk Matrix
| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|-------------------|
| Breaking changes | Low | High | Snapshot testing, incremental delivery |
| Performance regression | Low | Medium | Benchmarking, profiling |
| Test failures | Medium | Low | Test-first refactoring |
| Architecture complexity | Low | Medium | Clear documentation, peer review |

## Deliverables

### Phase 1: Type Safety
- All `as any` assertions removed
- Protected member declarations added
- Internal type definitions created
- Type coverage report showing 100%

### Phase 2: Dead Code Removal
- PropsUpdated event removed
- Unused BatchingManager code removed
- Unused utilities cleaned up
- Updated public API exports

### Phase 3: Subscription System Clarification
- Research document on current usage patterns
- Architecture decision record for subscription systems
- Clear documentation of each system's role
- Migration plan if consolidation needed

### Phase 4: SubscriptionManager Refactoring
- Extracted classes for each responsibility
- Simplified main SubscriptionManager class
- Consolidated test files
- Performance validation

## Timeline Estimates

### Phase Breakdown
- **Phase 1 (Type Safety)**: 2-3 days
- **Phase 2 (Dead Code)**: 1 day
- **Phase 3 (Subscription Research)**: 2 days
- **Phase 4 (SubscriptionManager)**: 3-4 days

**Total Estimate**: 8-10 days of focused development

## Acceptance Criteria

### Definition of Done
- [ ] All `as any` type assertions removed from production code
- [ ] Dead code identified in exploration report removed
- [ ] Subscription architecture documented with clear use cases
- [ ] SubscriptionManager refactored into focused classes
- [ ] All existing tests pass
- [ ] New integration tests added and passing
- [ ] Performance benchmarks show no regression
- [ ] Code review completed
- [ ] Documentation updated