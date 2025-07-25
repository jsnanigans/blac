import { Blac, Cubit } from '@blac/core';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { expect, test } from 'vitest';
import { useBloc } from '../src';

class DebugCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}

test('adapter sharing debug', async () => {
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

  const Component1 = () => {
    const [state, cubit] = useBloc(DebugCubit);
    return (
      <div>
        <span data-testid="comp1">{state.count}</span>
        <button data-testid="btn1" onClick={cubit.increment}>
          +1
        </button>
      </div>
    );
  };

  const Component2 = () => {
    const [state] = useBloc(DebugCubit);
    return <span data-testid="comp2">{state.count}</span>;
  };

  const { getByTestId } = render(
    <>
      <Component1 />
      <Component2 />
    </>,
  );

  expect(log.map((e) => e[0])).toStrictEqual([
    '[DebugCubit:DebugCubit] (getBloc) No existing instance found. Creating new one.',
    'BlacObservable.subscribe: Subscribing observer.',
    'BlacObservable.subscribe: Subscribing observer.',
  ]);
  log.length = 0; // Clear log after initial render

  expect(getByTestId('comp1')).toHaveTextContent('0');
  expect(getByTestId('comp2')).toHaveTextContent('0');

  await userEvent.click(getByTestId('btn1'));

  expect(log.map((e) => e[0])).toStrictEqual([]);

  expect(getByTestId('comp1')).toHaveTextContent('1');
  expect(getByTestId('comp2')).toHaveTextContent('1');
});

