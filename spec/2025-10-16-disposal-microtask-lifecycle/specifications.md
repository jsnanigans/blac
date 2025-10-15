# Specifications: Disposal System Refactor

**Feature:** Microtask-based disposal with lifecycle hooks and controlled emissions
**Version:** 2.0.0-rc.2 (pre-release)
**Status:** Specification Phase
**Breaking Changes:** Yes (clean break, no backward compatibility required)

---

## 1. Goals & Objectives

### Primary Goals
1. **Deterministic Disposal** - Replace arbitrary timeout-based disposal with deterministic microtask-based disposal
2. **Proper Cleanup** - Provide lifecycle hooks for blocs to clean up resources (intervals, timers, async operations)
3. **State Integrity** - Prevent state emissions on disposed/disposing blocs
4. **React Strict Mode Compatibility** - Handle React 18+ Strict Mode double-mounting correctly
5. **Fix Interval Bug** - Ensure blocs with setInterval/setTimeout can be properly disposed

### Secondary Goals
1. **Simplicity** - Keep the implementation simple and maintainable (FIFO, no overengineering)
2. **Performance** - Maximize speed and memory efficiency
3. **Plugin Safety** - Allow plugins to participate in disposal without breaking internal behavior
4. **Code Quality** - Clean, well-tested, well-documented code

---

## 2. Core Requirements

### 2.1 Remove Timeout-Based Disposal

**Current State:**
- Disposal uses configurable timeout (default 100ms)
- `Blac.setConfig({ disposalTimeout: 100 })`
- `static disposalTimeout` on bloc classes

**Required Changes:**
- ✅ Remove `disposalTimeout` from `BlacConfig`
- ✅ Remove `strictModeCompatibility` from `BlacConfig` (dead code)
- ✅ Remove `static disposalTimeout` from `BlocBase`
- ✅ Remove `_getDisposalTimeout()` method
- ✅ Remove all timeout-based disposal logic

**Rationale:** Timeouts are arbitrary, non-deterministic, and fail for self-sustaining blocs (intervals/timers)

---

### 2.2 Implement Microtask-Based Disposal

**Requirement:** When subscription count reaches 0, schedule disposal for next microtask

**Implementation Pattern:**
```typescript
// When last subscription is removed
queueMicrotask(() => {
  if (subscriptionCount === 0 && !keepAlive) {
    dispose();
  }
});
```

**Key Behaviors:**
- **FIFO Processing** - Simple first-in-first-out microtask queue
- **Single Disposal Check** - One microtask per disposal attempt (no batching)
- **Cancellable** - Can be cancelled if new subscription added before microtask runs
- **Synchronous Hooks** - Cleanup hooks run synchronously before queueing microtask

**Rationale:** Microtasks provide deterministic "next tick" behavior, perfect for React Strict Mode

---

### 2.3 Add Lifecycle Hooks

**Requirement:** Add `onDisposalScheduled` hook that runs when disposal is scheduled (subscriptionCount hits 0)

**Hook Specification:**
```typescript
abstract class BlocBase<S> {
  /**
   * Called synchronously when disposal is scheduled (subscriptionCount === 0).
   * Use this to clean up intervals, timers, pending promises, etc.
   *
   * MUST be synchronous (no async/await).
   * Errors are logged but do not prevent disposal.
   *
   * @example
   * this.onDisposalScheduled = () => {
   *   clearInterval(this.interval);
   *   this.interval = null;
   * };
   */
  onDisposalScheduled?: () => void;

  /**
   * Called when disposal completes (bloc is fully disposed).
   * Use for final cleanup (close connections, clear caches).
   */
  onDispose?: () => void;
}
```

**Hook Behavior:**
- **Synchronous Only** - No async/await support (keep it simple)
- **Error Handling** - Log errors and continue (don't crash unless critical)
- **Single Hook** - One hook per bloc (no arrays/multiple hooks)
- **Cannot Prevent Disposal** - Hook cannot cancel disposal (that's what plugins are for)
- **Runs Once** - Called exactly once when disposal is scheduled

**Execution Order:**
1. Last subscription removed
2. `onDisposalScheduled()` called synchronously
3. Disposal microtask queued
4. Microtask runs: check conditions → call `dispose()`
5. `onDispose()` called during disposal

---

### 2.4 Control Bloc Emissions

**Requirement:** Block state emissions on DISPOSAL_REQUESTED, DISPOSING, and DISPOSED blocs

**Current Behavior:**
- ✅ Blocks emissions on DISPOSING and DISPOSED
- ❌ Allows emissions on DISPOSAL_REQUESTED (causes interval bug)

**New Behavior:**
- ✅ Only allow emissions on ACTIVE blocs
- ✅ Log error (similar to React's "setState on unmounted component") for blocked emissions

**Implementation:**
```typescript
_pushState(newState: S, oldState: S, action?: unknown): void {
  const currentState = this._lifecycleManager.currentState;

  // Only allow emissions on ACTIVE blocs
  if (currentState !== BlocLifecycleState.ACTIVE) {
    this.blacInstance?.error(
      `[${this._name}:${this._id}] Cannot emit state on ${currentState} bloc. ` +
      `State update ignored. Clean up intervals/timers in onDisposalScheduled.`
    );
    return;
  }

  // ... rest of emission logic
}
```

**Impact:**
- `emit()` and `patch()` behave identically (both blocked on non-ACTIVE)
- Intervals/timers can no longer keep blocs alive
- Forces proper use of `onDisposalScheduled` for cleanup

---

## 3. Edge Cases & Constraints

### 3.1 KeepAlive Blocs
- **Behavior:** Never disposed automatically
- **Constraint:** No special disposal handling needed (they just never hit subscriptionCount === 0 disposal condition)
- **Plugin Support:** Plugins can still manually dispose keepAlive blocs if needed

### 3.2 Isolated Blocs
- **Behavior:** Same disposal logic as non-isolated blocs
- **Constraint:** No special handling (keep it straightforward)
- **Each instance:** Manages its own lifecycle independently

### 3.3 Concurrent Disposal Attempts
- **Scenario:** dispose() called multiple times
- **Behavior:** First call succeeds, subsequent calls are no-ops
- **Implementation:** Check `isDisposed` flag before proceeding

### 3.4 Resubscription During Disposal
- **Scenario 1:** New subscription during DISPOSAL_REQUESTED → Cancel disposal, return to ACTIVE
- **Scenario 2:** New subscription during DISPOSING → Log warning, create new bloc instance
- **Scenario 3:** New subscription during DISPOSED → Create new bloc instance

### 3.5 Plugin Participation
- **Requirement:** Plugins should be able to participate in disposal safely
- **Constraint:** Plugins cannot break internal disposal logic
- **Mechanism:** Plugin hooks run during disposal, errors are caught and logged

---

## 4. Performance Requirements

### 4.1 Speed
- **Disposal Latency:** Minimize delay between subscriptionCount === 0 and disposal
- **Target:** Disposal completes within 1 microtask (effectively 0ms)
- **No Batching:** Process disposals immediately (FIFO, no delays)

### 4.2 Memory Efficiency
- **Zero Memory Leaks** - All resources cleaned up on disposal
- **Minimal Overhead** - Lifecycle hooks should have negligible memory footprint
- **WeakRef Cleanup** - Maintain existing WeakRef-based consumer tracking

### 4.3 Benchmarks
- **No Performance Regression** - Must be at least as fast as current timeout approach
- **Target Improvement:** 50-100ms faster disposal (no timeout delay)

---

## 5. Testing Requirements

### 5.1 Test Coverage
- **Target:** 90%+ coverage for disposal-related code
- **Unit Tests:** All lifecycle state transitions
- **Integration Tests:** React hooks with disposal
- **Edge Case Tests:** All scenarios in section 3

### 5.2 Critical Test Scenarios
1. **Microtask disposal works** - Bloc disposes on next microtask when subscriptionCount === 0
2. **Cancellation works** - Resubscription before microtask cancels disposal
3. **React Strict Mode** - Double-mounting doesn't break disposal
4. **Interval cleanup** - Blocs with intervals dispose properly with `onDisposalScheduled`
5. **Error handling** - Hook errors don't crash, are logged
6. **Blocked emissions** - State updates blocked on non-ACTIVE blocs
7. **Multiple rapid subscribe/unsubscribe** - No race conditions

### 5.3 Test Maintenance
- **Update Existing Tests** - Modify tests that rely on timeout behavior
- **Remove Timeout Tests** - Delete tests for removed config options
- **Add New Tests** - Cover all new functionality

---

## 6. Breaking Changes

### 6.1 Removed APIs
```typescript
// ❌ REMOVED - No longer exists
Blac.setConfig({ disposalTimeout: number });
Blac.setConfig({ strictModeCompatibility: boolean });

// ❌ REMOVED - No longer exists
class MyBloc extends Bloc<State> {
  static disposalTimeout = 100;
}
```

### 6.2 Changed Behaviors
```typescript
// ❌ OLD - Emissions allowed on DISPOSAL_REQUESTED
bloc.emit(newState); // Works even when disposing

// ✅ NEW - Emissions blocked on DISPOSAL_REQUESTED
bloc.emit(newState); // Error logged, emission blocked
```

### 6.3 New Requirements
```typescript
// ❌ OLD - Intervals not cleaned up, bloc never disposes
class TimerCubit extends Cubit<State> {
  interval = setInterval(() => this.emit(...), 100);
}

// ✅ NEW - Must clean up in hook
class TimerCubit extends Cubit<State> {
  constructor() {
    super(initialState);
    this.onDisposalScheduled = () => {
      clearInterval(this.interval);
    };
  }

  interval = setInterval(() => this.emit(...), 100);
}
```

---

## 7. Documentation Requirements

### 7.1 API Documentation
- **JSDoc Comments** - Complete documentation for `onDisposalScheduled` and `onDispose`
- **Type Definitions** - Ensure TypeScript types are accurate
- **Examples** - Code examples for common patterns (timers, async operations)

### 7.2 Migration Guide
```markdown
# Migration Guide: Disposal System v2.0

## Removed Config Options
- Remove all `disposalTimeout` configuration
- Remove all `strictModeCompatibility` configuration

## New Cleanup Pattern
- Add `onDisposalScheduled` hook for cleanup
- Clear intervals, timers, and cancel pending operations

## Updated Emission Behavior
- State emissions now blocked on disposing/disposed blocs
- Check `isDisposed` before manual emissions if needed
```

### 7.3 Pattern Documentation
- **Timer/Interval Cleanup** - Standard pattern for setInterval/setTimeout
- **Async Operation Cleanup** - Pattern for cancelling promises/async operations
- **Resource Cleanup** - Pattern for closing connections, clearing caches

---

## 8. Implementation Constraints

### 8.1 Code Quality
- **Simplicity First** - Prefer simple, obvious solutions over clever ones
- **No Overengineering** - Avoid premature optimization
- **FIFO Processing** - Keep disposal queue simple (no complex batching/scheduling)
- **Fail-Safe Errors** - Log and continue on non-critical errors

### 8.2 Framework Compatibility
- **React Integration** - Must work with React 18+ Strict Mode
- **Node.js Compatibility** - Must work in Node.js environment (for SSR)
- **Browser Compatibility** - Must work in all modern browsers (ES2020+)

### 8.3 Plugin System
- **Safe Participation** - Plugins can participate without breaking disposal
- **Error Isolation** - Plugin errors don't crash the system
- **Clear Boundaries** - Plugins can observe but not prevent disposal (unless explicitly designed for it)

---

## 9. Success Criteria

### 9.1 Must Have (Ship Blockers)
- ✅ All existing tests pass (or updated appropriately)
- ✅ Interval disposal test passes
- ✅ React Strict Mode tests pass
- ✅ No memory leaks
- ✅ No performance regression
- ✅ Documentation complete

### 9.2 Should Have (Quality Gates)
- ✅ 90%+ test coverage
- ✅ All edge cases tested
- ✅ Migration guide written
- ✅ Example code for common patterns
- ✅ Error messages are helpful and actionable

### 9.3 Nice to Have (Future Enhancements)
- ⚪ Devtools integration for disposal visualization
- ⚪ Metrics collection for disposal timing
- ⚪ Advanced plugin hooks for disposal interception

---

## 10. Non-Requirements (Out of Scope)

### 10.1 Not Included in This Feature
- ❌ Reference counting with `retain()`/`release()` API
- ❌ Async lifecycle hooks (always synchronous)
- ❌ Multiple lifecycle hooks per bloc
- ❌ Disposal prevention by hooks (plugins only)
- ❌ Backward compatibility with timeout-based disposal
- ❌ Automatic cleanup detection (developer must use hooks)

### 10.2 Future Considerations (v2.1+)
- Reference counting API for non-subscription references
- Disposal middleware system
- Advanced devtools integration
- Disposal event system

---

## 11. Acceptance Criteria

A successful implementation must:

1. **Remove all timeout-based disposal code**
   - No `disposalTimeout` config
   - No `strictModeCompatibility` config
   - No static `disposalTimeout` on blocs

2. **Implement microtask-based disposal**
   - Uses `queueMicrotask()` for disposal scheduling
   - Disposal is cancellable if resubscription occurs
   - Deterministic, predictable behavior

3. **Provide lifecycle hooks**
   - `onDisposalScheduled` hook exists and works
   - Hook is synchronous only
   - Errors are logged and don't crash

4. **Control emissions properly**
   - Block emissions on DISPOSAL_REQUESTED, DISPOSING, DISPOSED
   - Log helpful error messages
   - `emit()` and `patch()` behave identically

5. **Pass all tests**
   - Existing tests updated/passing
   - New tests for all functionality
   - React Strict Mode tests passing
   - Interval disposal test passing

6. **Maintain performance**
   - No performance regression
   - Ideally faster (no timeout delays)
   - No memory leaks

7. **Document completely**
   - API documentation
   - Migration guide
   - Example code

---

## 12. Open Questions

### 12.1 Microtask vs Other Scheduling
- **Question:** Is `queueMicrotask()` the best primitive, or should we consider `Promise.resolve().then()`, `process.nextTick()`, or `setImmediate()`?
- **Research Needed:** Behavior differences, browser/Node compatibility, execution order guarantees

### 12.2 Plugin Disposal Prevention
- **Question:** What's the mechanism for plugins to prevent disposal (if needed)?
- **Research Needed:** Use cases, API design, safety guarantees

### 12.3 Disposal Event System
- **Question:** Should we emit disposal events for devtools/observability?
- **Research Needed:** Event types, subscribers, performance impact

---

## 13. Risks & Mitigations

### 13.1 Risk: Breaking Existing Code
- **Likelihood:** Medium (it's a breaking change)
- **Impact:** High (users must update code)
- **Mitigation:** Clear migration guide, helpful error messages, examples

### 13.2 Risk: Microtask Timing Issues
- **Likelihood:** Low (microtasks are well-defined)
- **Impact:** High (disposal wouldn't work)
- **Mitigation:** Extensive testing, research timing guarantees

### 13.3 Risk: Plugin Compatibility
- **Likelihood:** Medium (plugins may depend on old behavior)
- **Impact:** Medium (plugins break)
- **Mitigation:** Test popular plugins, update plugin API if needed

### 13.4 Risk: Performance Regression
- **Likelihood:** Low (removing timeouts should be faster)
- **Impact:** High (performance is critical)
- **Mitigation:** Benchmark before/after, performance tests

---

## Appendix A: Related Issues

### Current Bugs Fixed by This Feature
1. **Interval disposal bug** - Blocs with intervals don't dispose
2. **React Strict Mode failures** - Tests fail due to disposal timing
3. **Non-deterministic disposal** - Arbitrary timeouts cause race conditions

### Related Documentation
- `/Users/brendanmullins/Projects/blac/spec/001-fix-strict-mode-disposal/plan.md`
- `/Users/brendanmullins/Projects/blac/spec/001-fix-strict-mode-disposal/research.md`
- `/Users/brendanmullins/Projects/blac/blac-improvements.md`
- `/Users/brendanmullins/Projects/blac/reports/disposal-refactor-plan.md`

---

**Specification Version:** 1.0
**Date:** 2025-01-10
**Status:** Complete - Ready for Research Phase
