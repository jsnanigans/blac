# Tasks: Fix React Strict Mode Disposal Bug

**Action Item:** #001
**Priority:** 🔴 Critical
**Status:** Ready to Execute

---

## Task Checklist

Use this checklist to track implementation progress. Mark tasks with:
- ⏹️ Not Started
- 🔄 In Progress
- ✅ Complete
- ❌ Blocked
- ⏭️ Skipped

---

## Phase 1: Configuration Infrastructure

### Task 1.1: Update Type Definitions
**Status:** ⏹️
**File:** `packages/blac/src/types.ts`
**Estimated Time:** 15 minutes

- [ ] Add `disposalTimeout?: number` to BlacConfig interface
- [ ] Add `strictModeCompatibility?: boolean` to BlacConfig interface
- [ ] Add JSDoc comments explaining each option
- [ ] Export types if needed

**Acceptance Criteria:**
- TypeScript compiles without errors
- Config types are properly exported
- Documentation comments are clear

**Code:**
```typescript
export interface BlacConfig {
  proxyDependencyTracking: boolean;

  /**
   * Time to wait before disposing a bloc after all subscriptions are removed.
   * Set to 0 for immediate disposal.
   * Default: 100ms (increased from 16ms for React Strict Mode compatibility)
   *
   * @default 100
   */
  disposalTimeout?: number;

  /**
   * Automatically adjust disposal behavior for React Strict Mode compatibility.
   * When enabled, uses longer disposal timeout in development environments.
   * Default: true
   *
   * @default true
   */
  strictModeCompatibility?: boolean;
}
```

---

### Task 1.2: Update Blac Default Config
**Status:** ⏹️
**File:** `packages/blac/src/Blac.ts`
**Estimated Time:** 10 minutes

- [ ] Update `_config` default values
- [ ] Add validation for `disposalTimeout`
- [ ] Add validation for `strictModeCompatibility`

**Acceptance Criteria:**
- Default config includes new properties
- Validation throws on invalid values
- Config getter returns defensive copy

**Code:**
```typescript
private static _config: BlacConfig = {
  proxyDependencyTracking: true,
  disposalTimeout: 100,
  strictModeCompatibility: true,
};
```

---

### Task 1.3: Add Config Validation
**Status:** ⏹️
**File:** `packages/blac/src/Blac.ts`
**Estimated Time:** 20 minutes

- [ ] Add validation in `setConfig()` method
- [ ] Validate `disposalTimeout` is non-negative number
- [ ] Validate `strictModeCompatibility` is boolean
- [ ] Provide helpful error messages

**Acceptance Criteria:**
- Invalid values throw descriptive errors
- Valid values are accepted
- Partial configs work correctly

**Code:**
```typescript
public static setConfig(config: Partial<BlacConfig>): void {
  // Validate disposalTimeout
  if (config.disposalTimeout !== undefined) {
    if (typeof config.disposalTimeout !== 'number') {
      throw new Error(
        'BlacConfig.disposalTimeout must be a number. ' +
        `Received: ${typeof config.disposalTimeout}`
      );
    }
    if (config.disposalTimeout < 0) {
      throw new Error(
        'BlacConfig.disposalTimeout must be non-negative. ' +
        `Received: ${config.disposalTimeout}`
      );
    }
  }

  // Validate strictModeCompatibility
  if (config.strictModeCompatibility !== undefined) {
    if (typeof config.strictModeCompatibility !== 'boolean') {
      throw new Error(
        'BlacConfig.strictModeCompatibility must be a boolean. ' +
        `Received: ${typeof config.strictModeCompatibility}`
      );
    }
  }

  this._config = { ...this._config, ...config };
}
```

---

### Task 1.4: Write Config Tests
**Status:** ⏹️
**File:** `packages/blac/src/__tests__/Blac.config.test.ts`
**Estimated Time:** 30 minutes

- [ ] Add test for valid `disposalTimeout` values
- [ ] Add test for `disposalTimeout: 0` (edge case)
- [ ] Add test for negative `disposalTimeout` (should throw)
- [ ] Add test for invalid type (should throw)
- [ ] Add test for `strictModeCompatibility` boolean
- [ ] Add test for partial config updates

**Tests to Add:**
```typescript
describe('Disposal Configuration', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

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
    }).toThrow('must be non-negative');
  });

  it('should reject invalid disposalTimeout type', () => {
    expect(() => {
      Blac.setConfig({ disposalTimeout: '100' as any });
    }).toThrow('must be a number');
  });

  it('should accept strictModeCompatibility boolean', () => {
    Blac.setConfig({ strictModeCompatibility: false });
    expect(Blac.config.strictModeCompatibility).toBe(false);
  });

  it('should reject invalid strictModeCompatibility type', () => {
    expect(() => {
      Blac.setConfig({ strictModeCompatibility: 'true' as any });
    }).toThrow('must be a boolean');
  });
});
```

---

### Task 1.5: Run Phase 1 Tests
**Status:** ⏹️
**Estimated Time:** 5 minutes

- [ ] Run `pnpm test` in packages/blac
- [ ] Verify all config tests pass
- [ ] Verify no regressions in existing tests
- [ ] Run TypeScript compiler to verify types

**Commands:**
```bash
cd packages/blac
pnpm test src/__tests__/Blac.config.test.ts
pnpm typecheck
```

---

## Phase 2: BlocBase Disposal Updates

### Task 2.1: Add _getDisposalTimeout() Method
**Status:** ⏹️
**File:** `packages/blac/src/BlocBase.ts`
**Estimated Time:** 30 minutes

- [ ] Create private `_getDisposalTimeout()` method
- [ ] Check for bloc-level static `disposalTimeout` property
- [ ] Fall back to global config
- [ ] Fall back to default (100ms)
- [ ] Add JSDoc comments

**Code:**
```typescript
/**
 * Get disposal timeout for this bloc.
 * Priority: bloc static property > global config > default (100ms)
 *
 * @returns Disposal timeout in milliseconds
 */
private _getDisposalTimeout(): number {
  // Check for bloc-level override
  const BlocConstructor = this.constructor as typeof BlocBase & {
    disposalTimeout?: number;
  };

  if (
    'disposalTimeout' in BlocConstructor &&
    typeof BlocConstructor.disposalTimeout === 'number'
  ) {
    return BlocConstructor.disposalTimeout;
  }

  // Use global config
  return this.blacInstance?.config.disposalTimeout ?? 100;
}
```

---

### Task 2.2: Update _scheduleDisposal() Method
**Status:** ⏹️
**File:** `packages/blac/src/BlocBase.ts`
**Estimated Time:** 15 minutes

- [ ] Replace hardcoded `16` with call to `_getDisposalTimeout()`
- [ ] Add debug logging with actual timeout value
- [ ] Verify cancellation logic still works

**Code:**
```typescript
_scheduleDisposal(): void {
  const shouldDispose =
    this._subscriptionManager.size === 0 && !this._keepAlive;

  if (!shouldDispose) {
    return;
  }

  const timeout = this._getDisposalTimeout();

  this.blacInstance?.log(
    `[${this._name}:${this._id}] Scheduling disposal with ${timeout}ms timeout`
  );

  this._lifecycleManager.scheduleDisposal(
    timeout,
    () => this._subscriptionManager.size === 0 && !this._keepAlive,
    () => this.dispose(),
  );
}
```

---

### Task 2.3: Enhance _cancelDisposalIfRequested() Method
**Status:** ⏹️
**File:** `packages/blac/src/BlocBase.ts`
**Estimated Time:** 25 minutes

- [ ] Add state check before cancellation attempt
- [ ] Add warning if already DISPOSING or DISPOSED
- [ ] Add success/failure logging
- [ ] Include timeout value in warnings

**Code:**
```typescript
_cancelDisposalIfRequested(): void {
  const currentState = this._lifecycleManager.currentState;

  this.blacInstance?.log(
    `[${this._name}:${this._id}] Attempting to cancel disposal. ` +
    `Current state: ${currentState}`
  );

  // Only cancel if in DISPOSAL_REQUESTED state
  if (currentState !== BlocLifecycleState.DISPOSAL_REQUESTED) {
    if (
      currentState === BlocLifecycleState.DISPOSING ||
      currentState === BlocLifecycleState.DISPOSED
    ) {
      const timeout = this._getDisposalTimeout();
      this.blacInstance?.warn(
        `[${this._name}:${this._id}] Cannot cancel disposal - ` +
        `already ${currentState}. This may indicate the disposal ` +
        `timeout (${timeout}ms) is too short for your use case. ` +
        `Consider increasing it with Blac.setConfig({ disposalTimeout: ${timeout * 2} }).`
      );
    }
    return;
  }

  const success = this._lifecycleManager.cancelDisposal();

  if (success) {
    this.blacInstance?.log(
      `[${this._name}:${this._id}] Successfully cancelled disposal`
    );
  } else {
    this.blacInstance?.error(
      `[${this._name}:${this._id}] Failed to cancel disposal ` +
      `despite being in DISPOSAL_REQUESTED state`
    );
  }
}
```

---

### Task 2.4: Add Static disposalTimeout to BlocBase
**Status:** ⏹️
**File:** `packages/blac/src/BlocBase.ts`
**Estimated Time:** 10 minutes

- [ ] Add optional static `disposalTimeout` property
- [ ] Add JSDoc documentation
- [ ] Add example in comments

**Code:**
```typescript
export abstract class BlocBase<TState> {
  /**
   * Optional bloc-level disposal timeout override.
   * Set to 0 for immediate disposal.
   *
   * @example
   * ```typescript
   * class MyCubit extends Cubit<number> {
   *   static disposalTimeout = 0; // Immediate disposal
   *   constructor() { super(0); }
   * }
   * ```
   */
  static disposalTimeout?: number;

  // ... rest of class
}
```

---

### Task 2.5: Write Disposal Logic Tests
**Status:** ⏹️
**File:** `packages/blac/src/__tests__/BlocBase.disposal.test.ts` (new file)
**Estimated Time:** 45 minutes

- [ ] Test global config timeout is used
- [ ] Test bloc-level override takes precedence
- [ ] Test 0ms timeout works
- [ ] Test cancellation within timeout window
- [ ] Test cancellation after timeout (warning logged)
- [ ] Test disposal proceeds after timeout

**Tests to Add:**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Cubit } from '../Cubit';
import { Blac } from '../Blac';

class TestCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => this.emit(this.state + 1);
}

describe('BlocBase Configurable Disposal', () => {
  beforeEach(() => {
    Blac.resetInstance();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should use global config timeout', async () => {
    Blac.setConfig({ disposalTimeout: 50 });

    const cubit = new TestCubit();
    const unsub = cubit.subscribe(() => {});
    unsub();

    // Not disposed yet
    vi.advanceTimersByTime(25);
    expect(cubit.isDisposed).toBe(false);

    // Disposed after timeout
    vi.advanceTimersByTime(30);
    await vi.runAllTimersAsync();
    expect(cubit.isDisposed).toBe(true);
  });

  it('should use bloc-level timeout override', async () => {
    Blac.setConfig({ disposalTimeout: 100 });

    class FastDisposalCubit extends Cubit<number> {
      static disposalTimeout = 0;
      constructor() { super(0); }
    }

    const cubit = new FastDisposalCubit();
    const unsub = cubit.subscribe(() => {});
    unsub();

    // Dispose immediately (next tick)
    vi.advanceTimersByTime(1);
    await vi.runAllTimersAsync();
    expect(cubit.isDisposed).toBe(true);
  });

  it('should cancel disposal when resubscribing within timeout', async () => {
    Blac.setConfig({ disposalTimeout: 100 });

    const cubit = new TestCubit();
    const unsub1 = cubit.subscribe(() => {});
    unsub1();

    // Resubscribe before timeout
    vi.advanceTimersByTime(50);
    const unsub2 = cubit.subscribe(() => {});

    // Wait past original timeout
    vi.advanceTimersByTime(60);
    await vi.runAllTimersAsync();

    // Should still be active
    expect(cubit.isDisposed).toBe(false);
    cubit.increment();
    expect(cubit.state).toBe(1);

    unsub2();
  });

  it('should log warning when cancellation fails due to timeout', async () => {
    const warnSpy = vi.spyOn(Blac.instance, 'warn');
    Blac.setConfig({ disposalTimeout: 10 });

    const cubit = new TestCubit();
    const unsub1 = cubit.subscribe(() => {});
    unsub1();

    // Wait for disposal to complete
    vi.advanceTimersByTime(15);
    await vi.runAllTimersAsync();

    // Try to resubscribe (too late)
    const unsub2 = cubit.subscribe(() => {});

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cannot cancel disposal')
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Consider increasing')
    );

    unsub2();
  });
});
```

---

### Task 2.6: Run Phase 2 Tests
**Status:** ⏹️
**Estimated Time:** 5 minutes

- [ ] Run new disposal tests
- [ ] Run all BlocBase tests
- [ ] Verify no regressions

**Commands:**
```bash
cd packages/blac
pnpm test src/__tests__/BlocBase.disposal.test.ts
pnpm test src/__tests__/BlocBase.subscription.test.ts
```

---

## Phase 3: Strict Mode Detection (Optional)

### Task 3.1: Create detectStrictMode Utility
**Status:** ⏹️
**File:** `packages/blac/src/utils/detectStrictMode.ts` (new file)
**Estimated Time:** 30 minutes

- [ ] Create detection logic
- [ ] Cache detection result
- [ ] Handle SSR gracefully
- [ ] Add JSDoc comments

**Code:**
```typescript
/**
 * Detect if running in React Strict Mode.
 * Uses heuristics based on environment and React DevTools presence.
 */

let strictModeDetected: boolean | null = null;

export function detectStrictMode(): boolean {
  if (strictModeDetected !== null) {
    return strictModeDetected;
  }

  if (typeof window === 'undefined') {
    // SSR environment
    strictModeDetected = false;
    return false;
  }

  // Check for React DevTools
  const hasReactDevTools = '__REACT_DEVTOOLS_GLOBAL_HOOK__' in window;

  // Strict Mode is typically only in development
  const isDevelopment =
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test';

  strictModeDetected = hasReactDevTools && isDevelopment;
  return strictModeDetected;
}

export function getRecommendedDisposalTimeout(): number {
  return detectStrictMode() ? 100 : 16;
}

export function resetStrictModeDetection(): void {
  strictModeDetected = null;
}
```

---

### Task 3.2: Integrate Detection with Blac Config
**Status:** ⏹️
**File:** `packages/blac/src/Blac.ts`
**Estimated Time:** 20 minutes

- [ ] Import detection utilities
- [ ] Apply detection when `strictModeCompatibility` is true
- [ ] Only apply if user hasn't set explicit timeout
- [ ] Add logging for debugging

**Code:**
```typescript
import { detectStrictMode, getRecommendedDisposalTimeout } from './utils/detectStrictMode';

// In constructor or initialization
if (this._config.strictModeCompatibility) {
  // Only auto-adjust if user hasn't explicitly set timeout
  const userSetTimeout = /* track if user called setConfig with disposalTimeout */;

  if (!userSetTimeout && detectStrictMode()) {
    this._config.disposalTimeout = 100;
    this.log('Detected React Strict Mode, using 100ms disposal timeout');
  }
}
```

---

### Task 3.3: Write Detection Tests
**Status:** ⏹️
**File:** `packages/blac/src/utils/__tests__/detectStrictMode.test.ts` (new file)
**Estimated Time:** 25 minutes

- [ ] Test detection in development
- [ ] Test detection in production
- [ ] Test SSR environment
- [ ] Test caching
- [ ] Test reset function

---

### Task 3.4: Run Phase 3 Tests
**Status:** ⏹️
**Estimated Time:** 5 minutes

- [ ] Run detection tests
- [ ] Verify integration with config

---

## Phase 4: React Integration Testing

### Task 4.1: Un-skip Strict Mode Test
**Status:** ⏹️
**File:** `packages/blac-react/tests/useBloc.test.tsx`
**Estimated Time:** 10 minutes

- [ ] Remove `.skip` from line 260
- [ ] Update test config if needed
- [ ] Run test to verify it passes
- [ ] Update TODO comment

**Change:**
```typescript
// Before:
it.skip('should maintain state consistency in Strict Mode', async () => {

// After:
it('should maintain state consistency in Strict Mode', async () => {
```

---

### Task 4.2: Create Comprehensive Strict Mode Tests
**Status:** ⏹️
**File:** `packages/blac-react/src/__tests__/useBloc.strictMode.test.tsx` (new file)
**Estimated Time:** 60 minutes

- [ ] Test basic Strict Mode mounting
- [ ] Test rapid mount/unmount cycles
- [ ] Test multiple components in Strict Mode
- [ ] Test with different timeout configs
- [ ] Test with bloc-level timeout overrides
- [ ] Test cancellation scenarios
- [ ] Test error cases

**Tests to Add:**
```typescript
describe('useBloc in React Strict Mode', () => {
  beforeEach(() => {
    Blac.setConfig({
      disposalTimeout: 100,
      strictModeCompatibility: true,
    });
  });

  it('should handle double-mounting correctly', async () => {
    let mountCount = 0;
    const Component = () => {
      const [state, bloc] = useBloc(CounterCubit);

      React.useEffect(() => {
        mountCount++;
      }, []);

      return <div data-testid="count">{state.count}</div>;
    };

    render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    );

    // Strict Mode causes double mount in development
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mountCount).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('should maintain state across mount/unmount/remount', async () => {
    const App = () => {
      const [show, setShow] = React.useState(true);
      return (
        <div>
          <button onClick={() => setShow(!show)}>Toggle</button>
          {show && <Counter />}
        </div>
      );
    };

    const Counter = () => {
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
        <App />
      </React.StrictMode>
    );

    // Increment
    act(() => { screen.getByText('Increment').click(); });
    expect(screen.getByTestId('count')).toHaveTextContent('1');

    // Hide
    act(() => { screen.getByText('Toggle').click(); });
    expect(screen.queryByTestId('count')).not.toBeInTheDocument();

    // Show again - should maintain state
    act(() => { screen.getByText('Toggle').click(); });
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  // ... more tests
});
```

---

### Task 4.3: Test Different Timeout Configurations
**Status:** ⏹️
**File:** Same as 4.2
**Estimated Time:** 30 minutes

- [ ] Test with timeout: 0 (immediate disposal)
- [ ] Test with timeout: 50 (short)
- [ ] Test with timeout: 100 (default)
- [ ] Test with timeout: 200 (long)
- [ ] Measure actual disposal timing

---

### Task 4.4: Test Bloc-Level Overrides
**Status:** ⏹️
**File:** Same as 4.2
**Estimated Time:** 20 minutes

- [ ] Create cubit with custom timeout
- [ ] Verify override is used
- [ ] Test in Strict Mode

---

### Task 4.5: Run All React Tests
**Status:** ⏹️
**Estimated Time:** 10 minutes

- [ ] Run all useBloc tests
- [ ] Verify no regressions
- [ ] Check test coverage

**Commands:**
```bash
cd packages/blac-react
pnpm test
pnpm coverage
```

---

## Phase 5: Documentation and Migration

### Task 5.1: Update CHANGELOG
**Status:** ⏹️
**File:** `CHANGELOG.md`
**Estimated Time:** 20 minutes

- [ ] Add entry for disposal timeout configuration
- [ ] Document breaking changes (if any)
- [ ] Document new features
- [ ] Include migration notes

**Entry:**
```markdown
## [Unreleased]

### Added
- **React Strict Mode Compatibility**: Added `disposalTimeout` configuration option to fix disposal timing issues in React 18+ Strict Mode
- **Per-Bloc Disposal Control**: Blocs can now override disposal timeout with static `disposalTimeout` property
- **Automatic Strict Mode Detection**: Blac automatically adjusts disposal timeout when running in React Strict Mode (can be disabled with `strictModeCompatibility: false`)

### Changed
- **BREAKING**: Default disposal timeout increased from 16ms to 100ms
  - **Migration**: If you rely on fast disposal, explicitly set `Blac.setConfig({ disposalTimeout: 16 })`
- Improved disposal cancellation logging and error messages

### Fixed
- Fixed bloc disposal race condition in React 18+ Strict Mode causing "disposal_requested" errors
```

---

### Task 5.2: Write Migration Guide
**Status:** ⏹️
**File:** `docs/migration/strict-mode-compatibility.md` (new file)
**Estimated Time:** 30 minutes

- [ ] Explain the issue
- [ ] Show old vs new behavior
- [ ] Provide migration examples
- [ ] Document configuration options

---

### Task 5.3: Update README
**Status:** ⏹️
**File:** `packages/blac/README.md`
**Estimated Time:** 15 minutes

- [ ] Add disposal configuration to features list
- [ ] Update configuration section
- [ ] Add example

---

### Task 5.4: Update API Documentation
**Status:** ⏹️
**File:** `apps/docs/pages/api/configuration.md`
**Estimated Time:** 20 minutes

- [ ] Document `disposalTimeout` option
- [ ] Document `strictModeCompatibility` option
- [ ] Add examples
- [ ] Add troubleshooting section

---

### Task 5.5: Create Example Code
**Status:** ⏹️
**File:** `apps/docs/examples/disposal-configuration.tsx` (new file)
**Estimated Time:** 25 minutes

- [ ] Create example showing global config
- [ ] Create example showing bloc-level override
- [ ] Create example for Strict Mode
- [ ] Add comments explaining behavior

---

### Task 5.6: Update Troubleshooting Guide
**Status:** ⏹️
**File:** `apps/docs/pages/troubleshooting.md`
**Estimated Time:** 15 minutes

- [ ] Add section on Strict Mode issues
- [ ] Add section on disposal timing
- [ ] Link to configuration docs

---

## Verification Tasks

### Task V.1: Manual Testing Checklist
**Status:** ⏹️
**Estimated Time:** 30 minutes

- [ ] Test in development mode with Strict Mode enabled
- [ ] Test in production mode (Strict Mode disabled)
- [ ] Test with immediate disposal (timeout: 0)
- [ ] Test with long timeout (timeout: 500)
- [ ] Test rapid mount/unmount
- [ ] Test multiple components
- [ ] Verify no console errors
- [ ] Verify no memory leaks

---

### Task V.2: Performance Benchmarking
**Status:** ⏹️
**Estimated Time:** 20 minutes

- [ ] Benchmark disposal timing with old timeout (16ms)
- [ ] Benchmark disposal timing with new timeout (100ms)
- [ ] Compare memory usage
- [ ] Measure re-render performance
- [ ] Document results

---

### Task V.3: Automated Test Suite
**Status:** ⏹️
**Estimated Time:** 10 minutes

- [ ] Run full test suite: `pnpm test`
- [ ] Run type checking: `pnpm typecheck`
- [ ] Run linting: `pnpm lint`
- [ ] Check test coverage
- [ ] Verify CI passes

---

### Task V.4: Code Review Checklist
**Status:** ⏹️
**Estimated Time:** 20 minutes

- [ ] Review all code changes
- [ ] Verify error handling
- [ ] Check for edge cases
- [ ] Verify backwards compatibility
- [ ] Review documentation
- [ ] Check for typos

---

## Final Tasks

### Task F.1: Create Pull Request
**Status:** ⏹️
**Estimated Time:** 15 minutes

- [ ] Create feature branch
- [ ] Commit changes with descriptive messages
- [ ] Push to remote
- [ ] Create PR with template
- [ ] Link to issue
- [ ] Request review

---

### Task F.2: Update Issue Tracker
**Status:** ⏹️
**Estimated Time:** 5 minutes

- [ ] Update issue status
- [ ] Link PR to issue
- [ ] Add labels
- [ ] Update project board

---

## Summary

**Total Tasks:** 43
**Completed:** 0
**In Progress:** 0
**Blocked:** 0

**Estimated Total Time:** ~15-18 hours (2-3 days)

**Critical Path:**
1. Phase 1 (Config) → Phase 2 (Disposal) → Phase 4 (Tests)
2. Phase 3 (Detection) can be done in parallel
3. Phase 5 (Docs) after code is stable

**Dependencies:**
- Phase 2 depends on Phase 1
- Phase 4 depends on Phase 2
- Phase 5 depends on Phase 4
- Phase 3 is independent

---

## Notes

- Use fake timers in all tests to avoid flakiness
- Test with multiple React versions (18.0, 18.2, 18.3)
- Consider adding metrics for disposal timing
- Monitor for edge cases in production

---

**Ready to Execute:** ✅
**Start with:** Phase 1, Task 1.1
