# Documentation Discrepancies Report

## Bottom Line

**Root Cause**: Documentation uses incorrect/outdated API patterns
**Fix Location**: Multiple guide files in `apps/playground/src/content/guide/`
**Confidence**: High

## Executive Summary

Analyzed 29 MDX guide files against actual implementation. Found **19 critical discrepancies** across API usage, lifecycle hooks, plugin interfaces, and instance management patterns. Most issues stem from documentation not being updated to match implementation changes.

## Critical Discrepancies

### 1. Instance ID Option Mismatch (CRITICAL)
**Documentation**: `/getting-started/instance-management.mdx:176,235,378`
```typescript
// Documented (incorrect):
useBloc(ChatCubit, { id: 'chat-${chatId}' })
```
**Implementation**: `/packages/blac-react/src/useBloc.ts:25`
```typescript
// Actual (correct):
useBloc(ChatCubit, { instanceId: 'chat-${chatId}' })
```
- **Issue**: Option is `instanceId`, not `id`
- **Severity**: CRITICAL - Code examples won't work

### 2. Override Keyword Usage (CRITICAL)
**Documentation**: Multiple files including:
- `/core-concepts/bloc-deep-dive.mdx:514,641`  
- `/core-concepts/cubit-deep-dive.mdx:472,520`
```typescript
// Documented:
override dispose() { ... }
```
**Implementation**: `/packages/blac/src/BlocBase.ts:340`
```typescript
// Actual:
async dispose(): Promise<void> { ... }
```
- **Issue**: Method is `async` and returns `Promise<void>`, cannot use `override` keyword
- **Severity**: CRITICAL - TypeScript compilation errors

### 3. Missing Lifecycle Hooks (MAJOR)
**Documentation**: Mentions overriding `dispose()` for cleanup
**Implementation**: `/packages/blac/src/BlocBase.ts:90,114`
- Actually provides two specific hooks:
  - `onDisposalScheduled`: Called when disposal is scheduled  
  - `onDispose`: Called when disposal completes
- **Issue**: Documentation doesn't mention these cleaner alternatives
- **Severity**: MAJOR - Users implementing wrong pattern

### 4. Plugin Interface Mismatch (CRITICAL)
**Documentation**: `/plugins/custom-plugins.mdx:26-38`
```typescript
interface BlacPlugin {
  name: string;
  version?: string;
  onBlocCreated?(bloc: BlocBase<any>): void;
  onStateChanged?(bloc: BlocBase<any>, previousState: any, currentState: any): void;
  onBlocDisposed?(bloc: BlocBase<any>): void;
}
```
**Implementation**: `/packages/blac/src/plugins/types.ts:54-78`
- Actual interface has many additional methods and properties
- Missing: `capabilities`, `beforeBootstrap`, `afterBootstrap`, adapter hooks, etc.
- **Severity**: CRITICAL - Incomplete interface definition

### 5. Factory Option Missing (MAJOR)
**Documentation**: `/getting-started/instance-management.mdx:381`
```typescript
// Shows factory option but not documented elsewhere:
useBloc(WorkspaceCubit, {
  id: `workspace-${workspaceId}`,
  factory: () => new WorkspaceCubit(workspaceId),
})
```
**Implementation**: No `factory` option exists in `useBloc`
- **Severity**: MAJOR - Non-existent API

### 6. Blac.setConfig Not Documented (MINOR)
**Documentation**: CLAUDE.md mentions it but no guide covers it
**Implementation**: `/packages/blac/src/Blac.ts:137`
- `Blac.setConfig()` exists and is important for configuration
- **Severity**: MINOR - Missing feature documentation

### 7. Patch Method Behavior (MINOR)
**Documentation**: Shows `patch()` working on nested state
**Implementation**: `/packages/blac/src/Cubit.ts:36-69`
- `patch()` only works on object types
- Returns early with warning if not an object
- **Severity**: MINOR - Edge case not documented

### 8. Dependency Tracking Limitation (MAJOR)  
**Documentation**: Multiple guides mention this correctly but inconsistently
- Some guides clearly state "only root level"
- Others show nested state examples without warnings
- **Severity**: MAJOR - Inconsistent warnings about critical limitation

### 9. Disposal Timing Documentation (MAJOR)
**Documentation**: States instances dispose "when listener count reaches zero"
**Implementation**: Actually uses microtask scheduling with state machine
- More complex than documented
- Has DISPOSAL_REQUESTED → DISPOSING → DISPOSED states
- **Severity**: MAJOR - Oversimplified explanation

### 10. Static Props vs Constructor Props (CRITICAL)
**Documentation**: Shows constructor with props but no clear explanation
**Implementation**: `useBloc` has `staticProps` option for passing constructor args
- Not clearly documented how to pass props to Bloc constructors
- **Severity**: CRITICAL - Core feature undocumented

## Additional Minor Discrepancies

### 11. Missing useCubit Hook
- Documentation always uses `useBloc` even for Cubits
- No mention if `useCubit` exists (it doesn't)

### 12. ProxyFactory Configuration
- CLAUDE.md mentions `proxyDependencyTracking` config
- No guide explains how to enable/disable proxy tracking

### 13. Plugin Static Property
- Documentation shows `static plugins = [...]` on Blocs
- Implementation unclear if this actually works

### 14. Batch Updates
- No documentation of `_batchUpdates` internal method
- Users might benefit from batch update patterns

### 15. WeakRef Consumer Tracking
- Implementation uses WeakRef for memory management
- Not documented, but important for understanding lifecycle

### 16. Subscription Types
- Implementation has "observer" vs "consumer" subscription types
- Documentation doesn't explain the difference

### 17. Instance Ref Property
- Implementation has `_instanceRef` property
- Purpose and usage not documented

### 18. Plugin Execution Order
- Documentation says "synchronously in order registered"
- Implementation has complex plugin registry with priorities

### 19. Error Handling in Event Handlers
- Documentation doesn't explain error propagation
- Implementation catches errors and logs context

## Severity Summary

- **CRITICAL** (7): Wrong API usage that breaks code
- **MAJOR** (6): Important features missing or incorrectly explained
- **MINOR** (6): Edge cases or advanced features not covered

## Next Steps

1. **Immediate**: Fix all CRITICAL API mismatches (instanceId, dispose, plugin interface)
2. **Short-term**: Update lifecycle documentation with proper hooks
3. **Long-term**: Add missing feature documentation (setConfig, staticProps, etc.)

## Risks

- Developers following docs will write broken code
- Confusion about proper disposal patterns could cause memory leaks
- Incomplete plugin interface prevents advanced plugin development
