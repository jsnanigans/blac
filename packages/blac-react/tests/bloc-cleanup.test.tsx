import { Blac, Cubit } from '@blac/core';
import { render, cleanup } from '@testing-library/react';
import React from 'react';
import { expect, test } from 'vitest';
import { useBloc } from '../src';

const log: any[] = [];
Blac.logSpy = log.push.bind(log);

let l = 0;
const logSoFar = () => {
  console.log(
    'Debug Log:',
    ++l,
    log.map((e) => e[0]),
  );
  log.length = 0; // Clear log after printing
};

beforeEach(() => {
  log.length = 0; // Clear log before each test
});

test('isolated blocs are properly cleaned up from all registries', async () => {
  class IsolatedCubit extends Cubit<{ count: number }> {
    static isolated = true;

    constructor() {
      super({ count: 0 });
    }

    increment = () => {
      this.emit({ count: this.state.count + 1 });
    };
  }

  const blac = Blac.getInstance();

  const Component = () => {
    const [state, cubit] = useBloc(IsolatedCubit);
    return <div>{state.count}</div>;
  };

  // Render component
  const { unmount } = render(<Component />);
  logSoFar();

  expect(blac.isolatedBlocIndex.size).toBe(1);
  expect(blac.isolatedBlocMap.size).toBe(1);
  expect(blac.uidRegistry.size).toBe(1);
  expect(blac.blocInstanceMap.size).toBe(0);

  // Unmount component
  unmount();
  logSoFar();

  // Wait for any async cleanup
  await cleanup();

  expect(log.map((e) => e[0])).toEqual([
    '[IsolatedCubit:IsolatedCubit] disposeBloc called. Isolated: true',
    'dispatched bloc',
  ]);
  logSoFar();

  // Verify all registries are cleaned up
  expect(blac.isolatedBlocIndex.size).toBe(0);
  expect(blac.isolatedBlocMap.size).toBe(0);
  expect(blac.uidRegistry.size).toBe(0);
  expect(blac.blocInstanceMap.size).toBe(0);
});

test('registered blocs are properly cleaned up from all registries', async () => {
  class MyCubit extends Cubit<{ count: number }> {
    constructor() {
      super({ count: 0 });
    }

    increment = () => {
      this.emit({ count: this.state.count + 1 });
    };
  }

  const blac = Blac.getInstance();

  const Component = () => {
    const [state, cubit] = useBloc(MyCubit);
    return <div>{state.count}</div>;
  };

  // Render component
  const { unmount } = render(<Component />);
  logSoFar();

  // Check registries after creation
  expect(blac.isolatedBlocIndex.size).toBe(0);
  expect(blac.isolatedBlocMap.size).toBe(0);
  expect(blac.uidRegistry.size).toBe(1);
  expect(blac.blocInstanceMap.size).toBe(1);

  // Unmount component
  unmount();
  logSoFar();

  // Wait for any async cleanup
  await cleanup();

  expect(log.map((e) => e[0])).toEqual([
    '[MyCubit:MyCubit] disposeBloc called. Isolated: false',
    'dispatched bloc',
  ]);
  logSoFar();

  // Verify all registries are cleaned up
  expect(blac.isolatedBlocIndex.size).toBe(0);
  expect(blac.isolatedBlocMap.size).toBe(0);
  expect(blac.uidRegistry.size).toBe(0);
  expect(blac.blocInstanceMap.size).toBe(0);
});
