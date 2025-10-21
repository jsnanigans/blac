/**
 * Test file verifying disposal race condition fix
 *
 * Issue: BlocLifecycleManager could execute stale disposal microtasks after
 * disposal has been cancelled, causing memory leaks in React Strict Mode.
 *
 * Solution: Generation counter pattern prevents stale microtasks from executing.
 * These tests verify the fix is working correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BlocLifecycleManager, BlocLifecycleState } from '../BlocLifecycle.js';

describe('BlocLifecycleManager - Disposal Race Conditions (FIXED)', () => {
  let manager: BlocLifecycleManager;

  beforeEach(() => {
    manager = new BlocLifecycleManager();
  });

  it('should cancel disposal before microtask executes', async () => {
    let disposeCount = 0;

    // Schedule disposal
    manager.scheduleDisposal(
      () => true,
      () => {
        disposeCount++;
      },
    );

    // Cancel immediately (before microtask runs)
    const cancelled = manager.cancelDisposal();

    expect(cancelled).toBe(true);
    expect(manager.currentState).toBe(BlocLifecycleState.ACTIVE);

    // Wait for microtask to execute
    await new Promise((resolve) => setTimeout(resolve, 10));

    // EXPECTED: disposeCount should be 0 (disposal was cancelled)
    // FIXED: Generation counter prevents stale microtask from executing
    expect(disposeCount).toBe(0);
  });

  it('should handle React Strict Mode mount/unmount/remount', async () => {
    let disposeCount = 0;

    // Mount 1 → Unmount (Strict Mode first cycle)
    manager.scheduleDisposal(
      () => true,
      () => {
        disposeCount++;
      },
    );

    // Remount immediately (before microtask runs)
    manager.cancelDisposal();

    // Wait for microtask
    await new Promise((resolve) => setTimeout(resolve, 10));

    // EXPECTED: disposeCount should be 0 (disposal was cancelled on remount)
    // FIXED: Generation counter prevents stale microtask from executing
    expect(disposeCount).toBe(0);

    // Unmount again (final unmount)
    manager.scheduleDisposal(
      () => true,
      () => {
        disposeCount++;
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    // This disposal should execute
    expect(disposeCount).toBe(1);
  });

  it('should handle rapid mount/unmount cycles', async () => {
    let disposeCount = 0;

    // Simulate 100 rapid mount/unmount cycles
    for (let i = 0; i < 100; i++) {
      manager.scheduleDisposal(
        () => true,
        () => {
          disposeCount++;
        },
      );
      manager.cancelDisposal();
    }

    // Wait for all microtasks to execute
    await new Promise((resolve) => setTimeout(resolve, 50));

    // EXPECTED: disposeCount should be 0 (all disposals were cancelled)
    // FIXED: Generation counter prevents all stale microtasks from executing
    expect(disposeCount).toBe(0);
  });

  it('should not dispose if canDispose returns false', async () => {
    let disposeCount = 0;
    let canDispose = false;

    manager.scheduleDisposal(
      () => canDispose,
      () => {
        disposeCount++;
      },
    );

    // Wait for microtask
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should not dispose when canDispose is false
    expect(disposeCount).toBe(0);
    expect(manager.currentState).toBe(BlocLifecycleState.ACTIVE);
  });

  it('should dispose when canDispose returns true', async () => {
    let disposeCount = 0;

    manager.scheduleDisposal(
      () => true,
      () => {
        disposeCount++;
      },
    );

    // Wait for microtask
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should dispose
    expect(disposeCount).toBe(1);
  });

  it('should demonstrate the race condition window', async () => {
    let disposeCount = 0;
    const timeline: string[] = [];

    // Schedule disposal
    manager.scheduleDisposal(
      () => true,
      () => {
        timeline.push('dispose executed');
        disposeCount++;
      },
    );

    timeline.push('disposal scheduled');

    // Cancel disposal synchronously
    manager.cancelDisposal();
    timeline.push('disposal cancelled');

    // This is the race condition window!
    // The microtask is still queued even though we cancelled

    await new Promise((resolve) => setTimeout(resolve, 10));
    timeline.push('microtask executed');

    // Expected timeline:
    // ['disposal scheduled', 'disposal cancelled', 'microtask executed']

    // FIXED: dispose should not execute since it was cancelled!
    expect(timeline).not.toContain('dispose executed');
  });
});

describe('BlocLifecycleManager - Performance Impact (FIXED)', () => {
  it('should measure memory leak from uncancelled disposals', async () => {
    const managers: BlocLifecycleManager[] = [];
    const leakedDisposals: number[] = [];

    // Create 100 managers, each with a cancelled disposal
    for (let i = 0; i < 100; i++) {
      const manager = new BlocLifecycleManager();

      manager.scheduleDisposal(
        () => true,
        () => {
          // Track leaked disposal
          leakedDisposals.push(i);
        },
      );

      // Cancel immediately
      manager.cancelDisposal();

      managers.push(manager);
    }

    // Wait for all microtasks
    await new Promise((resolve) => setTimeout(resolve, 50));

    // EXPECTED: 0 leaked disposals
    // FIXED: Generation counter prevents all leaked disposals
    expect(leakedDisposals.length).toBe(0);
  });
});
