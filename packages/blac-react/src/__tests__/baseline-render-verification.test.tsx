/**
 * Reality check: Does the baseline actually trigger re-renders?
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlocBaseline } from '../useBlocBaseline';

class DummyBloc {
  static getOrCreate() {
    return new DummyBloc();
  }
  static release() {}
}

describe('Baseline Re-render Verification', () => {
  it('should count how many re-renders happen', () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      const [state, bloc] = useBlocBaseline<any>(DummyBloc);
      return { state, bloc, renderCount };
    });

    console.log('\n=== BASELINE RE-RENDER TEST ===');
    console.log('Initial render count:', renderCount);
    expect(renderCount).toBe(1);

    // Call increment 10 times
    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.bloc.increment();
      }
    });

    console.log('After 10 increments, render count:', renderCount);
    console.log('State object:', result.current.state);
    console.log('State properties:', Object.keys(result.current.state));

    if (renderCount === 1) {
      console.log('\n❌ BASELINE DOES NOT TRIGGER RE-RENDERS!');
      console.log('   Only measuring subscription overhead, not actual React re-renders');
      console.log('   This is NOT a fair comparison with real implementations!\n');
    } else {
      console.log('\n✅ Baseline triggered', renderCount - 1, 're-renders');
      console.log('   This IS a fair comparison\n');
    }

    // Log for visibility
    expect(renderCount).toBeGreaterThan(0);
  });

  it('should check if state reference changes', () => {
    const { result } = renderHook(() => useBlocBaseline<any>(DummyBloc));

    const initialState = result.current[0];
    console.log('\n=== STATE REFERENCE TEST ===');
    console.log('Initial state:', initialState);

    act(() => {
      result.current[1].increment();
    });

    const afterState = result.current[0];
    console.log('After increment state:', afterState);
    console.log('Same reference?', initialState === afterState);

    if (initialState === afterState) {
      console.log('❌ State reference NEVER changes');
      console.log('   React\'s useSyncExternalStore won\'t re-render!');
      console.log('   Baseline is measuring subscription overhead only\n');
    } else {
      console.log('✅ State reference changed');
      console.log('   React will re-render\n');
    }

    expect(initialState).toBeDefined();
  });
});
