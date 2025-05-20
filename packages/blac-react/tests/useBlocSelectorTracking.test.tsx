import { Cubit } from '@blac/core';
import { renderHook } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { expect, test } from 'vitest';
import { externalBlocStore } from '../src';

class CounterCubit extends Cubit<{ count: number }> {
  static isolated = true;
  constructor() {
    super({ count: 0 });
  }
}

test('usedKeys remains empty when selector is provided', () => {
  const selector = () => [];
  const { result } = renderHook(() => {
    const { externalStore, usedKeys } = externalBlocStore(CounterCubit, { selector });
    const state = useSyncExternalStore(
      externalStore.subscribe,
      externalStore.getSnapshot,
      externalStore.getServerSnapshot,
    );
    // Access state to potentially trigger tracking
    void state.count;
    return usedKeys;
  });

  expect(result.current.current.size).toBe(0);
});
