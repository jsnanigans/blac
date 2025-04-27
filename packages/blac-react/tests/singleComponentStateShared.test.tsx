/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Cubit } from "blac-next";
import React, { FC } from "react";
import { beforeEach, expect, test } from "vitest";
import { useBloc } from "../src";

class CounterCubit extends Cubit<
  { count: number; name: string },
  { initialState?: number }
> {
  constructor(props: { initialState?: number } = {}) {
    super({
      count: props.initialState ?? 0,
      name: "John Doe",
    });
  }

  increment = () => { this.patch({ count: this.state.count + 1 }); };
  updateName = (name: string) => { this.patch({ name }); };
}

let renderCountTotal = 0;
const Counter: FC<{ num: number; id: string }> = ({ num, id }) => {
  const [{ count }, { increment, updateName }] = useBloc(CounterCubit, {
    props: { initialState: num },
  });
  renderCountTotal += 1;
  return (
    <div>
      {/* eslint-disable-next-line arrow-body-style */}
      <button onClick={increment} data-testid={`${id}-increment`}>
        +1
      </button>
      <button
        onClick={() => { updateName("new name"); } }
        data-testid={`${id}-updateName`}
      >
        updateName
      </button>
      <label data-testid={`${id}-label`}>{count}</label>
    </div>
  );
};

beforeEach(() => {
  renderCountTotal = 0;
});

test("all instances should get the same state", async () => {
  const { container } = render(
    <>
      <Counter num={3442} id="1" />
      <Counter num={3442} id="2" />
    </>,
  );

  const label1 = container.querySelector('[data-testid="1-label"]');
  const label2 = container.querySelector('[data-testid="2-label"]');
  expect(label1).toHaveTextContent("3442");
  expect(label2).toHaveTextContent("3442");
  expect(renderCountTotal).toBe(2);

  await userEvent.click(container.querySelector('[data-testid="1-increment"]')!);
  expect(label1).toHaveTextContent("3443");
  expect(label2).toHaveTextContent("3443");
  expect(renderCountTotal).toBe(4);

  await userEvent.click(container.querySelector('[data-testid="2-increment"]')!);
  expect(label1).toHaveTextContent("3444");
  expect(label2).toHaveTextContent("3444");
  expect(renderCountTotal).toBe(6);
});
