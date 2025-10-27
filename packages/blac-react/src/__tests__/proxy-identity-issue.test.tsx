import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBloc } from '../useBloc';
import { Cubit } from '@blac/core';

// Simple test bloc
class TestBloc extends Cubit<{ count: number; other: string }> {
  constructor() {
    super({ count: 0, other: 'test' });
  }

  increment() {
    this.emit({ ...this.state, count: this.state.count + 1 });
  }

  changeOther() {
    this.emit({ ...this.state, other: 'changed' });
  }
}

describe('Proxy Identity Issue', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Don't mock console.log - we want to see the output
    // consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should verify proxy identity changes between getSnapshot calls', () => {
    const { result } = renderHook(() => {
      const [state, bloc] = useBloc(TestBloc);

      // Track the proxy object reference
      const proxyRef = state;

      return { state, bloc, proxyRef };
    });

    const firstProxy = result.current.proxyRef;

    // Force a re-render without state change
    act(() => {
      // This should trigger React to call getSnapshot again
      result.current.bloc.emit(result.current.bloc.state);
    });

    const secondProxy = result.current.proxyRef;

    // Test if the proxy references are different
    console.log('First proxy === Second proxy:', firstProxy === secondProxy);
    console.log('Object.is(firstProxy, secondProxy):', Object.is(firstProxy, secondProxy));

    // SURPRISING: The proxy objects are actually the same!
    // This means the cache is working, so the issue might be elsewhere
    expect(firstProxy).toBe(secondProxy);
    expect(Object.is(firstProxy, secondProxy)).toBe(true);
  });

  it('should test render counts vs actual state changes', () => {
    let renderCount = 0;
    let lastCount = -1;

    const { result } = renderHook(() => {
      const [state, bloc] = useBloc(TestBloc);
      renderCount++;

      // Log only when count actually changes
      if (state.count !== lastCount) {
        console.log(`Render ${renderCount}: count changed from ${lastCount} to ${state.count}`);
        lastCount = state.count;
      } else {
        console.log(`Render ${renderCount}: count unchanged (${state.count})`);
      }

      return { state, bloc };
    });

    console.log('Initial render count:', renderCount);

    // Change only the 'other' property
    act(() => {
      result.current.bloc.changeOther();
    });

    console.log('After changing other property, render count:', renderCount);

    // Change the 'count' property
    act(() => {
      result.current.bloc.increment();
    });

    console.log('After incrementing count, render count:', renderCount);

    // The issue: render count increases even when the component doesn't use the changed property
    expect(renderCount).toBeGreaterThan(1);
  });

  it('should demonstrate proxy caching behavior', () => {
    const { result } = renderHook(() => useBloc(TestBloc));

    const [state1, bloc] = result.current;

    // Access a property to track it
    const count1 = state1.count;

    // Get another snapshot without state change
    act(() => {
      // Force React to call getSnapshot again
      bloc.emit(bloc.state);
    });

    const [state2] = result.current;
    const count2 = state2.count;

    console.log('State objects are same?', state1 === state2);
    console.log('Count values are same?', count1 === count2);
    console.log('Object.is comparison:', Object.is(state1, state2));

    // Values should be the same, and surprisingly proxy objects are too!
    expect(count1).toBe(count2);
    expect(state1).toBe(state2);
  });

  it('should test if ProxyTracker cache is working', () => {
    const { result } = renderHook(() => {
      const [state, bloc] = useBloc(TestBloc);

      // Get multiple references to the same property
      const ref1 = state;
      const ref2 = state;

      return { ref1, ref2, bloc };
    });

    // Within the same render, proxy should be the same
    expect(result.current.ref1).toBe(result.current.ref2);

    console.log('Within same render, proxies are identical:', result.current.ref1 === result.current.ref2);
  });

  it('should test subscription filtering despite proxy identity changes', () => {
    let countRenderCount = 0;
    let otherRenderCount = 0;

    // Component that only uses count
    const { result: countResult } = renderHook(() => {
      const [state] = useBloc(TestBloc);
      countRenderCount++;
      console.log(`CountComponent render ${countRenderCount}: count = ${state.count}`);
      return state.count;
    });

    // Component that only uses other
    const { result: otherResult } = renderHook(() => {
      const [state] = useBloc(TestBloc);
      otherRenderCount++;
      console.log(`OtherComponent render ${otherRenderCount}: other = ${state.other}`);
      return state.other;
    });

    const initialCountRenders = countRenderCount;
    const initialOtherRenders = otherRenderCount;

    // Get the bloc from one of the hooks
    const { result: blocResult } = renderHook(() => useBloc(TestBloc));
    const [, bloc] = blocResult.current;

    // Change only 'other' property
    act(() => {
      bloc.changeOther();
    });

    console.log('After changing other:');
    console.log('  Count component renders:', countRenderCount - initialCountRenders);
    console.log('  Other component renders:', otherRenderCount - initialOtherRenders);

    // Despite proxy identity issues, subscription filtering should prevent unnecessary renders
    // Count component should NOT re-render when only 'other' changes
    expect(countRenderCount).toBe(initialCountRenders); // Should not increase
    expect(otherRenderCount).toBeGreaterThan(initialOtherRenders); // Should increase
  });
});