# Implementation Plan: Fix React Strict Mode Disposal Bug

**Action Item:** #001
**Priority:** 🔴 Critical
**Estimated Effort:** 2-3 days
**Risk Level:** Medium

---

## Executive Summary

Fix the disposal timing bug that causes BlaC to fail in React 18+ Strict Mode. The current 16ms disposal timeout conflicts with Strict Mode's double-mounting behavior, causing blocs to enter a `disposal_requested` state before remounting completes.

**Chosen Solution:** Hybrid approach with configurable timeout + improved cancellation logic
**Why:** Balances backwards compatibility, performance, and correctness without major refactoring

---

## Solution Architecture

### Approach: Configurable Disposal Timeout + Enhanced Cancellation

We will implement a three-part solution:

1. **Make disposal timeout configurable** (global + per-bloc)
2. **Improve cancellation logic** to handle edge cases
3. **Add Strict Mode detection** for automatic timeout adjustment

### Why This Solution?

✅ **Backwards compatible** - existing code works unchanged
✅ **Configurable** - developers can tune for their use case
✅ **Graceful** - handles both development and production
✅ **Testable** - deterministic behavior
✅ **Documented** - clear mental model

❌ **Not a complete rewrite** - doesn't implement full reference counting (future work)

---

## Technical Design

### 1. Add Disposal Configuration

#### Update BlacConfig (core)
```typescript
// packages/blac/src/types.ts

export interface BlacConfig {
  proxyDependencyTracking: boolean;

  // NEW: Disposal configuration
  disposalTimeout?: number;  // Default: 100ms (was hardcoded 16ms)
  strictModeCompatibility?: boolean;  // Default: true (auto-detect)
}
```

#### Update Blac Configuration
```typescript
// packages/blac/src/Blac.ts

private static _config: BlacConfig = {
  proxyDependencyTracking: true,
  disposalTimeout: 100,  // Increased from 16ms
  strictModeCompatibility: true,
};

public static setConfig(config: Partial<BlacConfig>): void {
  // Validate disposalTimeout
  if (config.disposalTimeout !== undefined) {
    if (typeof config.disposalTimeout !== 'number' || config.disposalTimeout < 0) {
      throw new Error('BlacConfig.disposalTimeout must be a non-negative number');
    }
  }

  this._config = { ...this._config, ...config };
}
```

### 2. Update BlocBase Disposal Logic

#### Current Code (packages/blac/src/BlocBase.ts:334)
```typescript
_scheduleDisposal(): void {
  const shouldDispose =
    this._subscriptionManager.size === 0 && !this._keepAlive;

  if (!shouldDispose) {
    return;
  }

  this._lifecycleManager.scheduleDisposal(
    16,  // ❌ Hardcoded
    () => this._subscriptionManager.size === 0 && !this._keepAlive,
    () => this.dispose(),
  );
}
```

#### New Code
```typescript
_scheduleDisposal(): void {
  const shouldDispose =
    this._subscriptionManager.size === 0 && !this._keepAlive;

  if (!shouldDispose) {
    return;
  }

  // Get disposal timeout from config or bloc override
  const timeout = this._getDisposalTimeout();

  this._lifecycleManager.scheduleDisposal(
    timeout,  // ✅ Configurable
    () => this._subscriptionManager.size === 0 && !this._keepAlive,
    () => this.dispose(),
  );
}

/**
 * Get disposal timeout for this bloc
 * Priority: bloc static > global config > default
 */
private _getDisposalTimeout(): number {
  // Check for bloc-level override
  const BlocConstructor = this.constructor as typeof BlocBase;
  if ('disposalTimeout' in BlocConstructor && typeof BlocConstructor.disposalTimeout === 'number') {
    return BlocConstructor.disposalTimeout;
  }

  // Use global config
  return this.blacInstance?.config.disposalTimeout ?? 100;
}
```

### 3. Add Static Override Capability

Allow individual Blocs to override timeout:
```typescript
// Example usage in user code
class MyCubit extends Cubit<number> {
  static disposalTimeout = 0;  // Immediate disposal

  constructor() {
    super(0);
  }
}

class KeepAliveCubit extends Cubit<number> {
  static keepAlive = true;
  static disposalTimeout = 1000;  // Long timeout (won't dispose anyway due to keepAlive)

  constructor() {
    super(0);
  }
}
```

### 4. Improve Cancellation Logic

#### Current Cancellation (packages/blac/src/BlocBase.ts:374)
```typescript
_cancelDisposalIfRequested(): void {
  const success = this._lifecycleManager.cancelDisposal();
  // ... logging only
}
```

#### Enhanced Cancellation
```typescript
_cancelDisposalIfRequested(): void {
  const currentState = this._lifecycleManager.currentState;

  // Log for debugging
  this.blacInstance?.log(
    `[${this._name}:${this._id}] Attempting to cancel disposal. Current state: ${currentState}`,
  );

  // Only cancel if in DISPOSAL_REQUESTED state
  if (currentState !== BlocLifecycleState.DISPOSAL_REQUESTED) {
    if (currentState === BlocLifecycleState.DISPOSING || currentState === BlocLifecycleState.DISPOSED) {
      // Already too late - log warning
      this.blacInstance?.warn(
        `[${this._name}:${this._id}] Cannot cancel disposal - already ${currentState}. ` +
        `This may indicate a timing issue with disposal timeout (${this._getDisposalTimeout()}ms).`
      );
    }
    return;
  }

  const success = this._lifecycleManager.cancelDisposal();

  if (success) {
    this.blacInstance?.log(
      `[${this._name}:${this._id}] Successfully cancelled disposal`,
    );
  } else {
    this.blacInstance?.error(
      `[${this._name}:${this._id}] Failed to cancel disposal despite being in DISPOSAL_REQUESTED state`,
    );
  }
}
```

### 5. Add Strict Mode Detection (Optional Enhancement)

```typescript
// packages/blac/src/utils/detectStrictMode.ts

let strictModeDetected: boolean | null = null;

/**
 * Detect if running in React Strict Mode
 * Uses a heuristic based on double-mounting behavior
 */
export function detectStrictMode(): boolean {
  if (strictModeDetected !== null) {
    return strictModeDetected;
  }

  // Check for React DevTools
  if (typeof window !== 'undefined') {
    const hasReactDevTools = '__REACT_DEVTOOLS_GLOBAL_HOOK__' in window;

    // Strict Mode is typically only enabled in development
    const isDevelopment = process.env.NODE_ENV === 'development' ||
                          process.env.NODE_ENV === 'test';

    strictModeDetected = hasReactDevTools && isDevelopment;
  } else {
    strictModeDetected = false;
  }

  return strictModeDetected;
}

/**
 * Get recommended disposal timeout based on environment
 */
export function getRecommendedDisposalTimeout(): number {
  if (detectStrictMode()) {
    // Longer timeout for Strict Mode
    return 100;
  }

  // Shorter timeout for production
  return 16;
}
```

Usage in Blac.ts:
```typescript
// When strictModeCompatibility is enabled
if (this._config.strictModeCompatibility && detectStrictMode()) {
  // Automatically adjust timeout if not explicitly set
  if (!userSetTimeout) {
    this._config.disposalTimeout = 100;
  }
}
```

---

## Implementation Phases

### Phase 1: Configuration Infrastructure (Day 1, Morning)
**Effort:** 2-3 hours
**Risk:** Low

**Tasks:**
1. Add `disposalTimeout` and `strictModeCompatibility` to BlacConfig type
2. Update Blac.setConfig() with validation
3. Write unit tests for config validation
4. Update default config

**Deliverables:**
- Modified: `packages/blac/src/types.ts`
- Modified: `packages/blac/src/Blac.ts`
- New tests: `packages/blac/src/__tests__/Blac.config.test.ts` (extend existing)

**Verification:**
```typescript
// Should work
Blac.setConfig({ disposalTimeout: 100 });
Blac.setConfig({ disposalTimeout: 0 });

// Should throw
Blac.setConfig({ disposalTimeout: -1 });
Blac.setConfig({ disposalTimeout: 'invalid' });
```

### Phase 2: BlocBase Disposal Updates (Day 1, Afternoon)
**Effort:** 3-4 hours
**Risk:** Medium

**Tasks:**
1. Implement `_getDisposalTimeout()` method
2. Update `_scheduleDisposal()` to use configurable timeout
3. Enhance `_cancelDisposalIfRequested()` with better logging
4. Add static `disposalTimeout` support to BlocBase
5. Write unit tests for disposal logic

**Deliverables:**
- Modified: `packages/blac/src/BlocBase.ts`
- New tests: `packages/blac/src/__tests__/BlocBase.disposal.test.ts`

**Verification:**
```typescript
// Global config
Blac.setConfig({ disposalTimeout: 50 });
const cubit1 = new CounterCubit();
// Should use 50ms timeout

// Bloc-level override
class FastCubit extends Cubit<number> {
  static disposalTimeout = 0;
}
const cubit2 = new FastCubit();
// Should use 0ms timeout
```

### Phase 3: Strict Mode Detection (Day 2, Morning)
**Effort:** 2-3 hours
**Risk:** Low-Medium

**Tasks:**
1. Create `detectStrictMode()` utility
2. Integrate with Blac config initialization
3. Add tests for detection logic
4. Document behavior

**Deliverables:**
- New file: `packages/blac/src/utils/detectStrictMode.ts`
- New tests: `packages/blac/src/utils/__tests__/detectStrictMode.test.ts`
- Modified: `packages/blac/src/Blac.ts`

**Verification:**
```typescript
// In test environment with Strict Mode
expect(detectStrictMode()).toBe(true);
expect(getRecommendedDisposalTimeout()).toBe(100);

// In production
expect(detectStrictMode()).toBe(false);
expect(getRecommendedDisposalTimeout()).toBe(16);
```

### Phase 4: React Integration Testing (Day 2, Afternoon)
**Effort:** 3-4 hours
**Risk:** Low

**Tasks:**
1. Un-skip the Strict Mode test
2. Add comprehensive Strict Mode tests
3. Test various timeout configurations
4. Test bloc-level timeout overrides
5. Verify no regression in existing tests

**Deliverables:**
- Modified: `packages/blac-react/tests/useBloc.test.tsx`
- New tests: `packages/blac-react/src/__tests__/useBloc.strictMode.test.tsx`

**Verification:**
- All tests pass in Strict Mode
- No flaky tests
- Performance is acceptable

### Phase 5: Documentation and Migration (Day 3)
**Effort:** 3-4 hours
**Risk:** Low

**Tasks:**
1. Update CHANGELOG.md
2. Write migration guide
3. Update API documentation
4. Add JSDoc comments
5. Create example code
6. Update troubleshooting guide

**Deliverables:**
- Updated: CHANGELOG.md
- New: docs/migration/strict-mode-compatibility.md
- Updated: packages/blac/README.md
- Updated: apps/docs/pages/advanced/lifecycle.md

---

## Testing Strategy

### Unit Tests

#### Config Tests (`Blac.config.test.ts`)
```typescript
describe('Disposal Configuration', () => {
  it('should accept valid disposalTimeout', () => {
    Blac.setConfig({ disposalTimeout: 100 });
    expect(Blac.config.disposalTimeout).toBe(100);
  });

  it('should accept 0 as disposalTimeout', () => {
    Blac.setConfig({ disposalTimeout: 0 });
    expect(Blac.config.disposalTimeout).toBe(0);
  });

  it('should reject negative disposalTimeout', () => {
    expect(() => {
      Blac.setConfig({ disposalTimeout: -1 });
    }).toThrow('must be a non-negative number');
  });
});
```

#### Disposal Tests (`BlocBase.disposal.test.ts`)
```typescript
describe('Configurable Disposal Timeout', () => {
  it('should use global config timeout', async () => {
    Blac.setConfig({ disposalTimeout: 50 });

    const cubit = new CounterCubit();
    const unsub = cubit.subscribe(() => {});
    unsub();

    // Should not be disposed yet
    await new Promise(resolve => setTimeout(resolve, 25));
    expect(cubit.isDisposed).toBe(false);

    // Should be disposed after timeout
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(cubit.isDisposed).toBe(true);
  });

  it('should use bloc-level timeout override', async () => {
    Blac.setConfig({ disposalTimeout: 100 });

    class ImmediateDisposalCubit extends Cubit<number> {
      static disposalTimeout = 0;
      constructor() { super(0); }
    }

    const cubit = new ImmediateDisposalCubit();
    const unsub = cubit.subscribe(() => {});
    unsub();

    // Should dispose immediately (next tick)
    await new Promise(resolve => setTimeout(resolve, 1));
    expect(cubit.isDisposed).toBe(true);
  });
});
```

### Integration Tests (React)

#### Strict Mode Tests (`useBloc.strictMode.test.tsx`)
```typescript
describe('React Strict Mode Compatibility', () => {
  beforeEach(() => {
    Blac.setConfig({
      disposalTimeout: 100,
      strictModeCompatibility: true
    });
  });

  it('should handle Strict Mode double-mounting', async () => {
    const Component = () => {
      const [state, bloc] = useBloc(CounterCubit);
      return (
        <div>
          <span data-testid="count">{state.count}</span>
          <button onClick={bloc.increment}>Increment</button>
        </div>
      );
    };

    render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    );

    expect(screen.getByTestId('count')).toHaveTextContent('0');

    await act(async () => {
      screen.getByText('Increment').click();
    });

    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('should handle rapid mount/unmount in Strict Mode', async () => {
    const App = () => {
      const [show, setShow] = React.useState(true);
      const [state, bloc] = useBloc(CounterCubit);

      return (
        <div>
          <button onClick={() => setShow(!show)}>Toggle</button>
          {show && <span data-testid="count">{state.count}</span>}
          <button onClick={bloc.increment}>Increment</button>
        </div>
      );
    };

    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    // Rapid toggle
    for (let i = 0; i < 10; i++) {
      act(() => { screen.getByText('Toggle').click(); });
      await new Promise(resolve => setTimeout(resolve, 5));
    }

    // Should still work
    act(() => { screen.getByText('Increment').click(); });
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });
});
```

### Performance Tests

```typescript
describe('Disposal Performance', () => {
  it('should not degrade performance with longer timeout', async () => {
    Blac.setConfig({ disposalTimeout: 100 });

    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const cubit = new CounterCubit();
      const unsub = cubit.subscribe(() => {});
      cubit.increment();
      unsub();
    }

    const end = performance.now();
    const duration = end - start;

    expect(duration).toBeLessThan(1000); // Should complete in <1 second
    console.log(`${iterations} iterations in ${duration.toFixed(2)}ms`);
  });
});
```

---

## Risk Mitigation

### Risk 1: Breaking Changes
**Probability:** Low
**Impact:** High
**Mitigation:**
- Backwards compatible by default (100ms is still short)
- Existing code works without changes
- Document migration path clearly
- Add deprecation warnings if needed

### Risk 2: Performance Degradation
**Probability:** Low
**Impact:** Medium
**Mitigation:**
- Benchmark before and after
- Allow developers to tune timeout
- Consider immediate disposal option (timeout: 0)
- Profile in production scenarios

### Risk 3: Still Doesn't Fix Strict Mode
**Probability:** Low (if testing is thorough)
**Impact:** High
**Mitigation:**
- Comprehensive testing in Strict Mode
- Test with different React versions (18.0, 18.2, 18.3)
- Test with different timing configurations
- Provide escape hatch (disable disposal entirely)

### Risk 4: Timeout Still Arbitrary
**Probability:** High (this is inherent to timeout approach)
**Impact:** Medium
**Mitigation:**
- Document limitation clearly
- Provide configuration for different scenarios
- Plan future work for reference counting
- Monitor for edge cases in production

---

## Rollback Plan

If this solution causes issues:

### Immediate Rollback (< 1 hour)
1. Revert commits
2. Re-skip the Strict Mode test
3. Document known limitation

### Alternative Plan B (Same day)
1. Keep configuration infrastructure
2. Revert disposal logic changes
3. Set default timeout to 200ms
4. Add warning in Strict Mode

### Alternative Plan C (1-2 days)
1. Implement simplified reference counting
2. Remove timeout entirely
3. Dispose when ref count === 0

---

## Success Metrics

### Must Have (Required for Ship)
- ✅ Skipped Strict Mode test passes
- ✅ All existing tests pass
- ✅ No performance regression (<5% slower)
- ✅ Backwards compatible
- ✅ Documentation complete

### Should Have (Desired)
- ✅ Configurable timeout works as expected
- ✅ Bloc-level overrides work
- ✅ Automatic Strict Mode detection works
- ✅ Warning/error messages are helpful

### Nice to Have (Future Work)
- ⚪ Reference counting implementation
- ⚪ DevTools integration for disposal monitoring
- ⚪ Metrics for disposal timing
- ⚪ Automatic timeout tuning

---

## Timeline

| Day | Phase | Deliverables | Review |
|-----|-------|--------------|--------|
| 1 AM | Phase 1 | Config infrastructure | Self-review |
| 1 PM | Phase 2 | BlocBase updates | Self-review |
| 2 AM | Phase 3 | Strict Mode detection | Self-review |
| 2 PM | Phase 4 | React tests | Peer review |
| 3 | Phase 5 | Documentation | Final review |

**Total Effort:** 2-3 days
**Buffer:** +1 day for unexpected issues

---

## Future Work

After this fix is stable, consider:

1. **Reference Counting** - More deterministic disposal
2. **Disposal Hooks** - Allow custom disposal logic
3. **Metrics/Monitoring** - Track disposal patterns
4. **DevTools Integration** - Visualize disposal lifecycle
5. **Automatic Cleanup** - Detect memory leaks automatically

---

## Approval

- [ ] Technical design reviewed
- [ ] Implementation plan approved
- [ ] Testing strategy validated
- [ ] Documentation plan confirmed
- [ ] Timeline realistic
- [ ] Risks identified and mitigated

**Ready to Implement:** ⏸️ Awaiting Approval
**Next Step:** Execute Phase 1
