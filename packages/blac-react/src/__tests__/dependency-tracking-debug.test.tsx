/**
 * Debug test to understand exactly how dependency tracking works
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { useBlocMinimal } from '../useBlocMinimal';
import { useBlocMinimalSimpleFix } from '../useBlocMinimalSimpleFix';

class TestBloc extends Cubit<{
  a: number;
  b: number;
  c: number;
}> {
  static isolated = true;

  constructor() {
    super({ a: 0, b: 0, c: 0 });
  }

  incrementA = () => this.emit({ ...this.state, a: this.state.a + 1 });
  incrementB = () => this.emit({ ...this.state, b: this.state.b + 1 });
  incrementC = () => this.emit({ ...this.state, c: this.state.c + 1 });
}

describe('Dependency Tracking Debug', () => {
  afterEach(() => {
    TestBloc.release();
  });

  it('should show how original useBlocMinimal tracks dependencies', () => {
    let renderCount = 0;
    let phase = 1;

    console.log('\n=== Testing Original useBlocMinimal ===');

    const { result } = renderHook(() => {
      const [state, bloc] = useBlocMinimal(TestBloc);
      renderCount++;

      console.log(`Render ${renderCount}, Phase ${phase}`);

      // Phase 1: Only access 'a'
      if (phase === 1) {
        console.log(`  Accessing: state.a = ${state.a}`);
        return { value: state.a, bloc };
      }
      // Phase 2: Only access 'b'
      else if (phase === 2) {
        console.log(`  Accessing: state.b = ${state.b}`);
        return { value: state.b, bloc };
      }
      // Phase 3: Access both 'a' and 'b'
      else {
        console.log(`  Accessing: state.a = ${state.a}, state.b = ${state.b}`);
        return { valueA: state.a, valueB: state.b, bloc };
      }
    });

    const bloc = result.current.bloc;

    // Phase 1: Only accessing 'a'
    console.log('\nPhase 1: Only accessing property "a"');
    expect(renderCount).toBe(1);

    console.log('  Updating a...');
    act(() => bloc.incrementA());
    console.log(`  Render count after updating a: ${renderCount}`);
    expect(renderCount).toBe(2); // Should re-render

    console.log('  Updating b...');
    act(() => bloc.incrementB());
    console.log(`  Render count after updating b: ${renderCount}`);
    // If it only tracks first render deps, this should NOT trigger re-render
    const countAfterB = renderCount;
    console.log(`  Did it re-render? ${countAfterB > 2 ? 'YES' : 'NO'}`);

    console.log('  Updating c...');
    act(() => bloc.incrementC());
    console.log(`  Render count after updating c: ${renderCount}`);
    expect(renderCount).toBe(countAfterB); // Should not re-render for 'c'

    // Phase 2: Switch to accessing 'b'
    console.log('\nPhase 2: Switching to access property "b"');
    phase = 2;
    act(() => bloc.incrementA()); // Force re-render by updating tracked prop
    const countAfterPhaseChange = renderCount;
    console.log(`  Render count after phase change: ${renderCount}`);

    console.log('  Updating b...');
    act(() => bloc.incrementB());
    console.log(`  Render count after updating b: ${renderCount}`);
    // Key test: Does updating 'b' now trigger re-render?
    const didBTriggerRender = renderCount > countAfterPhaseChange;
    console.log(`  Did updating b trigger re-render? ${didBTriggerRender ? 'YES' : 'NO'}`);

    console.log('\nConclusion:');
    if (countAfterB === 2 && !didBTriggerRender) {
      console.log('  ✓ Original only tracks dependencies from first render');
    } else if (countAfterB > 2 || didBTriggerRender) {
      console.log('  ✗ Original tracks dependencies dynamically!');
    }
  });

  it('should show how fixed version tracks dependencies', () => {
    let renderCount = 0;
    let phase = 1;

    console.log('\n=== Testing Fixed useBlocMinimal ===');

    const { result } = renderHook(() => {
      const [state, bloc] = useBlocMinimalSimpleFix(TestBloc);
      renderCount++;

      console.log(`Render ${renderCount}, Phase ${phase}`);

      // Phase 1: Only access 'a'
      if (phase === 1) {
        console.log(`  Accessing: state.a = ${state.a}`);
        return { value: state.a, bloc };
      }
      // Phase 2: Only access 'b'
      else if (phase === 2) {
        console.log(`  Accessing: state.b = ${state.b}`);
        return { value: state.b, bloc };
      }
      // Phase 3: Access both 'a' and 'b'
      else {
        console.log(`  Accessing: state.a = ${state.a}, state.b = ${state.b}`);
        return { valueA: state.a, valueB: state.b, bloc };
      }
    });

    const bloc = result.current.bloc;

    // Phase 1: Only accessing 'a'
    console.log('\nPhase 1: Only accessing property "a"');
    expect(renderCount).toBe(1);

    console.log('  Updating a...');
    act(() => bloc.incrementA());
    console.log(`  Render count after updating a: ${renderCount}`);
    expect(renderCount).toBe(2); // Should re-render

    console.log('  Updating b...');
    act(() => bloc.incrementB());
    console.log(`  Render count after updating b: ${renderCount}`);
    const countAfterB = renderCount;
    console.log(`  Did it re-render? ${countAfterB > 2 ? 'YES' : 'NO'}`);

    // Phase 2: Switch to accessing 'b'
    console.log('\nPhase 2: Switching to access property "b"');
    phase = 2;
    act(() => bloc.incrementA()); // Force re-render by updating tracked prop
    const countAfterPhaseChange = renderCount;
    console.log(`  Render count after phase change: ${renderCount}`);

    console.log('  Updating b...');
    act(() => bloc.incrementB());
    console.log(`  Render count after updating b: ${renderCount}`);
    const didBTriggerRender = renderCount > countAfterPhaseChange;
    console.log(`  Did updating b trigger re-render? ${didBTriggerRender ? 'YES' : 'NO'}`);

    console.log('\nConclusion:');
    if (countAfterB === 2 && didBTriggerRender) {
      console.log('  ✓ Fixed version accumulates dependencies correctly');
    } else {
      console.log('  ✗ Fixed version not working as expected');
    }
  });
});