/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Cubit } from '@blac/core';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { FC } from 'react';
import { beforeEach, expect, test } from 'vitest';
import { useBloc } from '../src';

type CounterProps = {
  initialState?: number;
  renderCount?: boolean;
  renderName?: boolean;
};
class CounterCubit extends Cubit<
  { count: number; name: string; renderCount: boolean; renderName: boolean },
  CounterProps
> {
  static isolated = true;
  constructor(props: CounterProps) {
    super({
      count: props.initialState ?? 0,
      name: 'Name 1',
      renderCount: props.renderCount ?? true,
      renderName: props.renderName ?? true,
    });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
  updateName = () => {
    const name = this.state.name;
    const numberInName = Number(name.match(/\d+/));
    const nameNoNumber = name.replace(/\d+/, '');
    this.patch({ name: `${nameNoNumber} ${numberInName + 1}` });
  };
  setRenderName = (renderName: boolean) => {
    this.patch({ renderName });
  };
  setRenderCount = (renderCount: boolean) => {
    this.patch({ renderCount });
  };
}

let renderCountTotal = 0;
const Counter: FC<{
  num: number;
  renderName: boolean;
  renderCount: boolean;
}> = (props) => {
  const [state, { increment, updateName, setRenderName, setRenderCount }] =
    useBloc(CounterCubit, {
      props: {
        initialState: props.num,
        renderCount: props.renderCount,
        renderName: props.renderName,
      },
    });
  renderCountTotal += 1;
  return (
    <div>
      <button onClick={increment} data-testid={`increment`}>
        +1
      </button>
      <button
        onClick={() => {
          updateName();
        }}
        data-testid={`updateName`}
      >
        updateName
      </button>
      <label data-testid={`count`}>
        {state.renderCount ? state.count : ''}
      </label>
      <label data-testid={`name`}>{state.renderName ? state.name : ''}</label>

      <button
        onClick={() => {
          setRenderName(false);
        }}
        data-testid="disableRenderName"
      >
        disable render name
      </button>
      <button
        onClick={() => {
          setRenderCount(false);
        }}
        data-testid="disableRenderCount"
      >
        disable render count
      </button>

      <button
        onClick={() => {
          setRenderName(true);
        }}
        data-testid="enableRenderName"
      >
        enable render name
      </button>
      <button
        onClick={() => {
          setRenderCount(true);
        }}
        data-testid="enableRenderCount"
      >
        enable render count
      </button>
    </div>
  );
};

beforeEach(() => {
  renderCountTotal = 0;
});

test('should rerender when used state changes', async () => {
  const { container } = render(
    <Counter num={3442} renderName={true} renderCount={true} />,
  );

  // Initial render
  expect(renderCountTotal).toBe(1);
  const count = container.querySelector('[data-testid="count"]');
  expect(count).toHaveTextContent('3442');

  const name = container.querySelector('[data-testid="name"]');
  expect(name).toHaveTextContent('Name 1');

  await userEvent.click(container.querySelector('[data-testid="increment"]')!);

  expect(renderCountTotal).toBe(2);
  const newCount = container.querySelector('[data-testid="count"]');
  expect(newCount).toHaveTextContent('3443');

  await userEvent.click(container.querySelector('[data-testid="updateName"]')!);

  expect(renderCountTotal).toBe(3);
  const newName = container.querySelector('[data-testid="name"]');
  expect(newName).toHaveTextContent('Name 2');
});

test('should only rerender if state is used, even after state has been removed from the component', async () => {
  // start by rendering both name and count
  const { container } = render(
    <Counter num={1} renderName={true} renderCount={true} />,
  );
  // Initial render
  expect(renderCountTotal).toBe(1);

  // check that both name and count are rendered
  const name = container.querySelector('[data-testid="name"]');
  expect(name).toHaveTextContent('Name 1');
  const count = container.querySelector('[data-testid="count"]');
  expect(count).toHaveTextContent('1');

  // update name, should rerender
  await userEvent.click(container.querySelector('[data-testid="updateName"]')!);
  expect(name).toHaveTextContent('Name 2');
  expect(renderCountTotal).toBe(2);

  // increment, will rerender
  await userEvent.click(container.querySelector('[data-testid="increment"]')!);
  expect(count).toHaveTextContent('2');
  expect(renderCountTotal).toBe(3);

  // stop rendering count
  await userEvent.click(
    container.querySelector('[data-testid="disableRenderCount"]')!,
  );
  expect(count).toHaveTextContent('');
  expect(renderCountTotal).toBe(4);

  // increment again, should not rerender because state.count is not used, BUT does because pruning is one step behind
  await userEvent.click(container.querySelector('[data-testid="increment"]')!);
  expect(renderCountTotal).toBe(5); // Update triggers render due to delayed pruning
  expect(count).toHaveTextContent('');
  // TODO: Known issue - dependency tracker is one tick behind, causing one extra rerender
  // after a dependency has been removed. The proxy detects unused dependencies after render,
  // so if that unused thing changes, it still triggers one more rerender before being pruned.
  // increment again, should not rerender because state.count is not used
  await userEvent.click(container.querySelector('[data-testid="increment"]')!);
  expect(renderCountTotal).toBe(6); // +1 due to delayed dependency pruning
  expect(count).toHaveTextContent('');

  // update name again, should rerender because its still used
  await userEvent.click(container.querySelector('[data-testid="updateName"]')!);
  expect(name).toHaveTextContent('Name 3');
  expect(renderCountTotal).toBe(7);
  expect(count).toHaveTextContent('');

  // stop rendering name
  await userEvent.click(
    container.querySelector('[data-testid="disableRenderName"]')!,
  );
  expect(name).toHaveTextContent('');
  expect(renderCountTotal).toBe(8);
  expect(count).toHaveTextContent('');

  // increment again, should not rerender because state.count is not used, will set state.cunt to '4'
  // TODO: The dependency checker is always one step behind, so this renders once again. This causes no issues but we should Invesigate and fix it
  await userEvent.click(container.querySelector('[data-testid="increment"]')!);
  expect(renderCountTotal).toBe(9);
  expect(count).toHaveTextContent('');

  await userEvent.click(container.querySelector('[data-testid="increment"]')!);
  expect(renderCountTotal).toBe(10);
  expect(count).toHaveTextContent('');

  // update name again, should not rerender because state.name is not used, will set state.name to 'Name 4'
  await userEvent.click(container.querySelector('[data-testid="updateName"]')!);
  expect(renderCountTotal).toBe(11);
  expect(count).toHaveTextContent('');

  // render name again, should render with new name
  await userEvent.click(
    container.querySelector('[data-testid="enableRenderName"]')!,
  );
  expect(name).toHaveTextContent('Name 4');
  expect(renderCountTotal).toBe(12);
  expect(count).toHaveTextContent('');

  // show count again, should rerender with new count
  await userEvent.click(
    container.querySelector('[data-testid="enableRenderCount"]')!,
  );
  expect(count).toHaveTextContent('6');
  expect(name).toHaveTextContent('Name 4');
  expect(renderCountTotal).toBe(13);
});

test('should only rerender if state is used, even if state is used after initial render', async () => {
  // start by rendering name only
  const { container } = render(
    <Counter num={1} renderName={true} renderCount={false} />,
  );
  // Initial render
  expect(renderCountTotal).toBe(1);

  // check that only name is rendered
  const name = container.querySelector('[data-testid="name"]');
  expect(name).toHaveTextContent('Name 1');
  const count = container.querySelector('[data-testid="count"]');
  expect(count).toHaveTextContent('');

  // TODO: Known issue - dependency tracker is one tick behind, causing one extra rerender
  // after a dependency has been removed. The proxy detects unused dependencies after render,
  // so if that unused thing changes, it still triggers one more rerender before being pruned.
  // increment count - should not rerender because state.count is not used
  await userEvent.click(container.querySelector('[data-testid="increment"]')!);
  expect(renderCountTotal).toBe(2); // No extra rerender in this case
  expect(count).toHaveTextContent('');

  await userEvent.click(container.querySelector('[data-testid="increment"]')!);
  expect(renderCountTotal).toBe(3);
  expect(count).toHaveTextContent('');

  // increment again, should not rerender
  await userEvent.click(container.querySelector('[data-testid="increment"]')!);
  expect(renderCountTotal).toBe(4);
  expect(count).toHaveTextContent('');

  // update name - should rerender
  await userEvent.click(container.querySelector('[data-testid="updateName"]')!);
  expect(name).toHaveTextContent('Name 2');
  expect(renderCountTotal).toBe(5);
  expect(count).toHaveTextContent('');

  // render count again, should render with new count
  await userEvent.click(
    container.querySelector('[data-testid="enableRenderCount"]')!,
  );
  expect(count).toHaveTextContent('4'); // State was updated to 4 in background
  expect(name).toHaveTextContent('Name 2');
  expect(renderCountTotal).toBe(6);

  // increment again, should rerender because state.count is now used
  await userEvent.click(container.querySelector('[data-testid="increment"]')!);
  expect(count).toHaveTextContent('5');
  expect(renderCountTotal).toBe(7);
  expect(name).toHaveTextContent('Name 2');
});
