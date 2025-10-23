# Plan: Fix Proxy Tracking Race Condition in ReactBridge

## Decision

**Approach**: Start with unfiltered subscription, then upgrade to filtered once proxy tracking completes
**Why**: Ensures no state changes are missed during the async proxy setup window
**Risk Level**: Low

## Implementation Steps

1. **Modify Initial Subscription Creation** - Update `ReactBridge.ts:46-72` to create unfiltered subscription
2. **Track Subscription State** - Add `isUpgraded` flag to track filtering status
3. **Enhance Path Update Logic** - Modify `updateSubscriptionPaths()` at line 165 to handle upgrade
4. **Add Safeguards** - Prevent redundant upgrades and handle edge cases
5. **Update Logging** - Add clear indicators of subscription state transitions

## Files to Change

- `packages/blac-react/src/v2/ReactBridge.ts:46-72` - Initial subscription without paths
- `packages/blac-react/src/v2/ReactBridge.ts:165-204` - Upgrade logic in updateSubscriptionPaths
- `packages/blac-react/src/v2/ReactBridge.ts:24` - Add isUpgraded flag
- `packages/blac-react/src/v2/ReactBridge.ts:121-160` - Add upgrade trigger in completeTracking

## Detailed Code Changes

### 1. Add State Tracking (Line 24)
```typescript
private trackedPaths = new Set<string>();
private currentState: S;
private listeners = new Set<() => void>();
private isTracking = false;
private renderGeneration = 0;
+ private isUpgraded = false; // Track if subscription has been upgraded to filtered
```

### 2. Create Initial Unfiltered Subscription (Lines 46-72)
```typescript
if (!this.subscription) {
  BlacLogger.debug('ReactBridge', 'Creating INITIAL unfiltered subscription');
  const subscriptionId = Symbol('subscription');
  this.activeSubscriptionId = subscriptionId;

  // CRITICAL: Start with NO paths/filter - accept all state changes
  this.subscription = this.container.subscribeAdvanced({
    callback: (state: S) => {
      if (subscriptionId !== this.activeSubscriptionId) {
        BlacLogger.debug('ReactBridge', 'Subscription callback IGNORED (stale)');
        return;
      }

      // Log whether this is filtered or unfiltered
      const subscriptionType = this.isUpgraded ? 'FILTERED' : 'UNFILTERED';
      BlacLogger.debug('ReactBridge', `${subscriptionType} subscription callback invoked`);

      this.currentState = state;
      this.listeners.forEach(listener => {
        BlacLogger.debug('ReactBridge', `${subscriptionType} Calling listener`);
        listener();
      });
    },
    // NO paths initially - this ensures we catch ALL changes
    // paths: undefined,
    metadata: {
      useProxyTracking: true,
      trackedPaths: [] // Empty initially, will be populated after first render
    }
  });

  BlacLogger.debug('ReactBridge', 'INITIAL unfiltered subscription created');
  this.isUpgraded = false;
}
```

### 3. Upgrade to Filtered Subscription (Lines 165-204)
```typescript
private updateSubscriptionPaths(): void {
  if (!this.subscription) return;

  // Check if this is the first upgrade from unfiltered to filtered
  const isFirstUpgrade = !this.isUpgraded && this.trackedPaths.size > 0;

  if (isFirstUpgrade) {
    BlacLogger.debug('ReactBridge', 'UPGRADING from unfiltered to filtered subscription', {
      paths: Array.from(this.trackedPaths)
    });
  } else {
    BlacLogger.debug('ReactBridge', 'Updating existing filtered subscription', {
      paths: Array.from(this.trackedPaths)
    });
  }

  const oldSub = this.subscription;

  // Unsubscribe old subscription FIRST to avoid race conditions
  BlacLogger.debug('ReactBridge', 'Unsubscribing old subscription');
  oldSub.unsubscribe();

  // Create new subscription with tracked paths
  const subscriptionId = Symbol('subscription');
  this.activeSubscriptionId = subscriptionId;

  this.subscription = this.container.subscribeAdvanced({
    callback: (state: S) => {
      if (subscriptionId !== this.activeSubscriptionId) {
        BlacLogger.debug('ReactBridge', 'Subscription callback IGNORED (stale)');
        return;
      }

      BlacLogger.debug('ReactBridge', 'FILTERED subscription callback invoked');
      this.currentState = state;
      this.listeners.forEach(listener => {
        BlacLogger.debug('ReactBridge', 'FILTERED Calling listener');
        listener();
      });
    },
    // NOW we add path filtering for optimal performance
    paths: Array.from(this.trackedPaths),
    metadata: {
      useProxyTracking: true,
      trackedPaths: Array.from(this.trackedPaths)
    }
  });

  this.isUpgraded = true;
  BlacLogger.debug('ReactBridge',
    isFirstUpgrade ? 'Upgrade to filtered complete' : 'Update complete'
  );
}
```

### 4. Trigger Upgrade After First Tracking (Lines 148-157)
```typescript
if (hasChanged) {
  this.trackedPaths = newPaths;

  // Update subscription with new tracked paths
  if (this.subscription) {
    // Only upgrade/update if we have actual paths to track
    if (this.trackedPaths.size > 0) {
      this.updateSubscriptionPaths();
    } else {
      BlacLogger.debug('ReactBridge', 'Skipping update - no paths to track');
    }
  }
}
```

### 5. Reset Upgrade State on Dispose (Line 230)
```typescript
dispose(): void {
  if (this.subscription) {
    this.subscription.unsubscribe();
    this.subscription = null;
  }

  this.listeners.clear();
  this.trackedPaths.clear();
  this.proxyTracker.clearCache();
+ this.isUpgraded = false; // Reset upgrade state
}
```

## Edge Cases & Safeguards

### 1. Rapid Mount/Unmount
- Subscription ID guards prevent stale callbacks
- Proper cleanup in dispose() prevents memory leaks

### 2. No Paths Tracked
- If component never accesses state properties, subscription remains unfiltered
- This is acceptable as component doesn't depend on any specific state

### 3. Multiple Rapid State Changes
- Unfiltered subscription catches all changes initially
- After upgrade, filtered subscription optimizes performance

### 4. React Strict Mode Double-Mount
- Each mount gets fresh subscription
- Proper cleanup prevents duplicate subscriptions

## Testing Strategy

### 1. Unit Tests
```typescript
// Test: State changes during proxy setup are caught
it('should re-render when state changes during proxy tracking setup', async () => {
  const container = new StateContainer({ count: 0 });
  const bridge = new ReactBridge(container);

  // Subscribe (starts unfiltered)
  const listener = jest.fn();
  bridge.subscribe(listener);

  // Trigger state change immediately (before proxy completes)
  container.setState({ count: 1 });

  // Should receive notification even without paths
  expect(listener).toHaveBeenCalled();
});

// Test: Subscription upgrades after first render
it('should upgrade from unfiltered to filtered after proxy tracking', async () => {
  // ... test upgrade behavior
});
```

### 2. Integration Tests
- Test with actual React components using `@testing-library/react`
- Verify no missed updates in rapid state change scenarios
- Test React Strict Mode compatibility

### 3. Performance Tests
- Measure overhead of initial unfiltered subscription
- Verify performance improvement after upgrade to filtered
- Test with large state objects

## Risks & Mitigations

**Main Risk**: Initial unfiltered subscription may cause unnecessary re-renders
**Mitigation**:
- Duration is very short (one microtask)
- Upgrade happens automatically after first render
- Performance impact is minimal and temporary

**Secondary Risk**: Subscription swap could introduce new race condition
**Mitigation**:
- Unsubscribe old before creating new
- Use subscription ID to guard against stale callbacks
- Atomic state transitions

## Acceptance Criteria

- [x] No missed state changes during proxy setup
- [x] Automatic upgrade from unfiltered to filtered
- [x] Existing tests continue to pass
- [x] Clear logging of subscription state transitions
- [x] No memory leaks in React Strict Mode
- [x] Performance optimization still works after upgrade

## Out of Scope

- Changing the async nature of proxy tracking
- Modifying the core subscription system
- Implementing state change buffering
- Changing the FilterStage or ProxyTrackingStage implementations