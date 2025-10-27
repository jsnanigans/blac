import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBloc } from '../useBloc';
import { Cubit, BlacLogger, LogLevel } from '@blac/core';
import { useRef, useEffect } from 'react';

// Test bloc with multiple properties
class ComplexBloc extends Cubit<{
  counter: number;
  user: { name: string; age: number };
  settings: { theme: string; notifications: boolean };
  data: string[];
}> {
  constructor() {
    super({
      counter: 0,
      user: { name: 'John', age: 25 },
      settings: { theme: 'light', notifications: true },
      data: ['item1', 'item2'],
    });
  }

  incrementCounter() {
    this.emit({ ...this.state, counter: this.state.counter + 1 });
  }

  updateUserName(name: string) {
    this.emit({
      ...this.state,
      user: { ...this.state.user, name },
    });
  }

  updateTheme(theme: string) {
    this.emit({
      ...this.state,
      settings: { ...this.state.settings, theme },
    });
  }

  addDataItem(item: string) {
    this.emit({
      ...this.state,
      data: [...this.state.data, item],
    });
  }
}

describe('DevTools vs Actual Renders', () => {
  let originalLogLevel: LogLevel;

  beforeEach(() => {
    // Enable debug logging to see what's happening
    originalLogLevel = BlacLogger.level;
    BlacLogger.setLevel(LogLevel.DEBUG);
  });

  afterEach(() => {
    BlacLogger.setLevel(originalLogLevel);
  });

  it('should demonstrate actual renders vs reconciliation checks', () => {
    // Track actual render function executions
    let actualRenderCount = 0;
    let reconciliationCount = 0;
    let getSnapshotCount = 0;

    // Hook that tracks different types of "renders"
    const { result } = renderHook(() => {
      const [state, bloc] = useBloc(ComplexBloc);

      // This increments ONLY when the render function actually runs
      actualRenderCount++;

      // Track getSnapshot calls (happens during reconciliation)
      useEffect(() => {
        // This effect runs after every actual render
        reconciliationCount++;
      });

      // Access only the counter to track it
      const counter = state.counter;

      console.log(`[ACTUAL RENDER #${actualRenderCount}] counter: ${counter}`);

      return { state, bloc, counter };
    });

    console.log('\n=== Initial State ===');
    console.log('Actual renders:', actualRenderCount);
    console.log('Reconciliation checks:', reconciliationCount);

    const initialRenders = actualRenderCount;

    // Change a property that the component doesn't track
    console.log('\n=== Changing untracked property (user.name) ===');
    act(() => {
      result.current.bloc.updateUserName('Jane');
    });

    console.log('Actual renders after user.name change:', actualRenderCount - initialRenders);
    console.log('Expected: 0 (component doesn\'t track user.name)');

    // Change a property that the component does track
    console.log('\n=== Changing tracked property (counter) ===');
    const rendersBeforeCounter = actualRenderCount;
    act(() => {
      result.current.bloc.incrementCounter();
    });

    console.log('Actual renders after counter change:', actualRenderCount - rendersBeforeCounter);
    console.log('Expected: 1 (component tracks counter)');

    // Verify the behavior
    expect(actualRenderCount - initialRenders).toBe(1); // Only one actual render for counter change
  });

  it('should show how multiple components with different dependencies behave', () => {
    const renderTracking = {
      counterComponent: 0,
      userComponent: 0,
      settingsComponent: 0,
      combinedComponent: 0,
    };

    // Component that only tracks counter
    const { result: counterResult } = renderHook(() => {
      const [state] = useBloc(ComplexBloc);
      renderTracking.counterComponent++;
      const { counter } = state; // Only access counter
      console.log(`[CounterComponent] Render #${renderTracking.counterComponent}, counter: ${counter}`);
      return counter;
    });

    // Component that only tracks user
    const { result: userResult } = renderHook(() => {
      const [state] = useBloc(ComplexBloc);
      renderTracking.userComponent++;
      const { user } = state; // Only access user
      console.log(`[UserComponent] Render #${renderTracking.userComponent}, user: ${user.name}`);
      return user;
    });

    // Component that tracks settings
    const { result: settingsResult } = renderHook(() => {
      const [state] = useBloc(ComplexBloc);
      renderTracking.settingsComponent++;
      const { settings } = state; // Only access settings
      console.log(`[SettingsComponent] Render #${renderTracking.settingsComponent}, theme: ${settings.theme}`);
      return settings;
    });

    // Component that tracks multiple properties
    const { result: combinedResult } = renderHook(() => {
      const [state, bloc] = useBloc(ComplexBloc);
      renderTracking.combinedComponent++;
      const { counter, user } = state; // Access both
      console.log(`[CombinedComponent] Render #${renderTracking.combinedComponent}, counter: ${counter}, user: ${user.name}`);
      return { counter, user, bloc };
    });

    console.log('\n=== Initial render counts ===');
    console.log(renderTracking);

    const initialCounts = { ...renderTracking };

    // Change counter - should only affect components that track it
    console.log('\n=== Incrementing counter ===');
    act(() => {
      combinedResult.current.bloc.incrementCounter();
    });

    console.log('Render count changes:');
    console.log('  CounterComponent:', renderTracking.counterComponent - initialCounts.counterComponent, '(expected: 1)');
    console.log('  UserComponent:', renderTracking.userComponent - initialCounts.userComponent, '(expected: 0)');
    console.log('  SettingsComponent:', renderTracking.settingsComponent - initialCounts.settingsComponent, '(expected: 0)');
    console.log('  CombinedComponent:', renderTracking.combinedComponent - initialCounts.combinedComponent, '(expected: 1)');

    // Verify selective re-rendering
    expect(renderTracking.counterComponent - initialCounts.counterComponent).toBe(1);
    expect(renderTracking.userComponent - initialCounts.userComponent).toBe(0);
    expect(renderTracking.settingsComponent - initialCounts.settingsComponent).toBe(0);
    expect(renderTracking.combinedComponent - initialCounts.combinedComponent).toBe(1);

    const beforeUserChange = { ...renderTracking };

    // Change user - should only affect components that track it
    console.log('\n=== Changing user name ===');
    act(() => {
      combinedResult.current.bloc.updateUserName('Alice');
    });

    console.log('Render count changes:');
    console.log('  CounterComponent:', renderTracking.counterComponent - beforeUserChange.counterComponent, '(expected: 0)');
    console.log('  UserComponent:', renderTracking.userComponent - beforeUserChange.userComponent, '(expected: 1)');
    console.log('  SettingsComponent:', renderTracking.settingsComponent - beforeUserChange.settingsComponent, '(expected: 0)');
    console.log('  CombinedComponent:', renderTracking.combinedComponent - beforeUserChange.combinedComponent, '(expected: 1)');

    // Verify selective re-rendering
    expect(renderTracking.counterComponent - beforeUserChange.counterComponent).toBe(0);
    expect(renderTracking.userComponent - beforeUserChange.userComponent).toBe(1);
    expect(renderTracking.settingsComponent - beforeUserChange.settingsComponent).toBe(0);
    expect(renderTracking.combinedComponent - beforeUserChange.combinedComponent).toBe(1);
  });

  it('should demonstrate useSyncExternalStore reconciliation behavior', () => {
    let getSnapshotCallCount = 0;
    let actualRenderCount = 0;

    // Spy on the internal mechanisms
    const { result } = renderHook(() => {
      const [state, bloc] = useBloc(ComplexBloc);

      actualRenderCount++;

      // Track snapshot creation (this would be called by useSyncExternalStore)
      useEffect(() => {
        // Simulate what happens internally
        getSnapshotCallCount++;
      });

      console.log(`[Render] Actual render #${actualRenderCount}`);

      return { state, bloc };
    });

    console.log('\n=== Reconciliation vs Actual Renders ===');
    console.log('Initial state:');
    console.log('  Actual renders:', actualRenderCount);
    console.log('  getSnapshot calls (estimated):', getSnapshotCallCount);

    // Make multiple rapid state changes
    console.log('\n=== Making rapid state changes ===');
    act(() => {
      result.current.bloc.incrementCounter();
      result.current.bloc.incrementCounter();
      result.current.bloc.incrementCounter();
    });

    console.log('After 3 rapid increments:');
    console.log('  Actual renders:', actualRenderCount);
    console.log('  Note: React may batch these into a single render');

    // DevTools would show activity for each state change, but actual renders may be batched
    expect(actualRenderCount).toBeGreaterThanOrEqual(2); // At least initial + 1 for the changes
  });

  it('should show that proxy caching prevents unnecessary object creation', () => {
    const proxies = new Set();

    const { result, rerender } = renderHook(() => {
      const [state] = useBloc(ComplexBloc);

      // Store the proxy reference
      proxies.add(state);

      return state;
    });

    const initialProxyCount = proxies.size;
    console.log('Initial proxy count:', initialProxyCount);

    // Force multiple re-renders without state changes
    rerender();
    rerender();
    rerender();

    console.log('Proxy count after 3 re-renders (no state change):', proxies.size);

    // Should still be 1 because proxy is cached
    expect(proxies.size).toBe(1);

    // Now change state
    act(() => {
      const { result: blocResult } = renderHook(() => useBloc(ComplexBloc));
      const [, bloc] = blocResult.current;
      bloc.incrementCounter();
    });

    console.log('Proxy count after state change:', proxies.size);

    // Might be 2 if state object changed, but proxy cache should minimize creation
    expect(proxies.size).toBeLessThanOrEqual(2);
  });
});