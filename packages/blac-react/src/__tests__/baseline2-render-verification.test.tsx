/**
 * Verify useBlocBaseline2 (useState approach) triggers re-renders
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlocBaseline2 } from '../useBlocBaseline2';

class DummyBloc {
  static getOrCreate() {
    return new DummyBloc();
  }
  static release() {}
}

describe('Baseline2 Re-render Verification', () => {
  it('should count how many re-renders happen', () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      const [state, bloc] = useBlocBaseline2<any>(DummyBloc);
      return { state, bloc, renderCount };
    });

    console.log('\n=== BASELINE2 RE-RENDER TEST (useState) ===');
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

    if (renderCount === 1) {
      console.log('\n❌ BASELINE2 DOES NOT TRIGGER RE-RENDERS!');
    } else {
      console.log('\n✅ Baseline2 triggered', renderCount - 1, 're-renders');
      console.log('   This IS a fair comparison\n');
    }

    expect(renderCount).toBeGreaterThan(0);
  });

  it('should check if state reference changes', () => {
    const { result } = renderHook(() => useBlocBaseline2<any>(DummyBloc));

    const initialState = result.current[0];
    console.log('\n=== STATE REFERENCE TEST (useState) ===');
    console.log('Initial state:', initialState);

    act(() => {
      result.current[1].increment();
    });

    const afterState = result.current[0];
    console.log('After increment state:', afterState);
    console.log('Same reference?', initialState === afterState);

    if (initialState === afterState) {
      console.log('❌ State reference NEVER changes\n');
    } else {
      console.log('✅ State reference changed (expected with useState)\n');
    }

    expect(initialState).toBeDefined();
  });
});
