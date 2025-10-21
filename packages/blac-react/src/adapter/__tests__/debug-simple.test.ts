/**
 * Debug test to isolate the issue
 */

import { describe, it, expect } from 'vitest';
import { Cubit } from '@blac/core';
import { ReactBlocAdapter } from '../ReactBlocAdapter';

class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    console.log('CounterCubit.increment called, current state:', this.state);
    this.emit(this.state + 1);
    console.log('CounterCubit.increment after emit, new state:', this.state);
  };
}

describe('Debug Simple Test', () => {
  it('should update state when increment is called', () => {
    const cubit = new CounterCubit();
    console.log('Initial cubit state:', cubit.state);

    cubit.increment();
    console.log('After increment, cubit state:', cubit.state);

    expect(cubit.state).toBe(1);
  });

  it('should update adapter snapshot when state changes', () => {
    const cubit = new CounterCubit();
    const adapter = new ReactBlocAdapter(cubit);

    console.log('Initial adapter snapshot:', adapter.getSnapshot());
    console.log('Initial adapter version:', adapter.getVersion());

    cubit.increment();

    console.log('After increment, adapter snapshot:', adapter.getSnapshot());
    console.log('After increment, adapter version:', adapter.getVersion());
    console.log('After increment, cubit state:', cubit.state);

    expect(adapter.getSnapshot()).toBe(1);
    expect(adapter.getVersion()).toBe(1);
  });
});
