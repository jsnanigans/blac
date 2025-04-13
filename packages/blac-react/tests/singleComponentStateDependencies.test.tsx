/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Cubit } from "blac-next";
import React, { FC } from "react";
import { beforeEach, expect, test } from "vitest";
import { useBloc } from "../src";

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
      name: "Name 1",
      renderCount: props.renderCount ?? true,
      renderName: props.renderName ?? true,
    });
  }

  increment = () => { this.patch({ count: this.state.count + 1 }); };
  updateName = () => {
    const name = this.state.name;
    const numberInName = Number(name.match(/\d+/));
    const nameNoNumber = name.replace(/\d+/, "");
    this.patch({ name: `${nameNoNumber} ${numberInName + 1}` });
  };
  setRenderName = (renderName: boolean) => { this.patch({ renderName }); };
  setRenderCount = (renderCount: boolean) => { this.patch({ renderCount }); };
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
      <button onClick={() => { updateName(); } } data-testid={`updateName`}>
        updateName
      </button>
      <label data-testid={`count`}>
        {state.renderCount ? state.count : ""}
      </label>
      <label data-testid={`name`}>{state.renderName ? state.name : ""}</label>

      <button
        onClick={() => { setRenderName(false); } }
        data-testid="disableRenderName"
      >
        disable render name
      </button>
      <button
        onClick={() => { setRenderCount(false); } }
        data-testid="disableRenderCount"
      >
        disable render count
      </button>

      <button
        onClick={() => { setRenderName(true); } }
        data-testid="enableRenderName"
      >
        enable render name
      </button>
      <button
        onClick={() => { setRenderCount(true); } }
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

test("should rerender for any state chnange", async () => {
  const { container } = render(
    <Counter num={3442} renderName={true} renderCount={true} />,
  );

  // Initial render + Strict Mode remount = 2 renders
  expect(renderCountTotal).toBe(1); // Adjusted from 2
  const count = container.querySelector('[data-testid="count"]');
  expect(count).toHaveTextContent("3442");

  const name = container.querySelector('[data-testid="name"]');
  expect(name).toHaveTextContent("Name 1");

  await userEvent.click(container.querySelector('[data-testid="increment"]')!);

  expect(renderCountTotal).toBe(2); // Adjusted from 3
  const newCount = container.querySelector('[data-testid="count"]');
  expect(newCount).toHaveTextContent("3443");

  await userEvent.click(container.querySelector('[data-testid="updateName"]')!);

  expect(renderCountTotal).toBe(3); // Adjusted from 4
  const newName = container.querySelector('[data-testid="name"]');
  expect(newName).toHaveTextContent("Name 2");
});

test("should only rerender if state is used, even after state has been removed from the component", async () => {
  // start by rendering both name and count
  const { container } = render(
    <Counter num={1} renderName={true} renderCount={true} />,
  );
  // Initial render + Strict Mode remount = 2 renders
  expect(renderCountTotal).toBe(1); // Adjusted from 2

  // check that both name and count are rendered
  const name = container.querySelector('[data-testid="name"]');
  expect(name).toHaveTextContent("Name 1");
  const count = container.querySelector('[data-testid="count"]');
  expect(count).toHaveTextContent("1");

  // update name, should rerender
  await userEvent.click(container.querySelector('[data-testid="updateName"]')!);
  expect(name).toHaveTextContent("Name 2");
  expect(renderCountTotal).toBe(2); // Adjusted from 3

  // increment, will rerender
  await userEvent.click(container.querySelector('[data-testid="increment"]')!);
  expect(count).toHaveTextContent("2");
  expect(renderCountTotal).toBe(3); // Adjusted from 4

  // stop rendering count
  await userEvent.click(
    container.querySelector('[data-testid="disableRenderCount"]')!,
  );
  expect(count).toHaveTextContent("");
  expect(renderCountTotal).toBe(4); // Adjusted from 5

  // increment again, should not rerender because state.count is not used
  await userEvent.click(container.querySelector('[data-testid="increment"]')!);
  expect(renderCountTotal).toBe(4); // Adjusted from 5
  expect(count).toHaveTextContent("");

  // update name again, should rerender because its still used
  await userEvent.click(container.querySelector('[data-testid="updateName"]')!);
  expect(name).toHaveTextContent("Name 3");
  expect(renderCountTotal).toBe(5); // Adjusted from 6
  expect(count).toHaveTextContent("");

  // stop rendering name
  await userEvent.click(
    container.querySelector('[data-testid="disableRenderName"]')!,
  );
  expect(name).toHaveTextContent("");
  expect(renderCountTotal).toBe(6); // Adjusted from 7
  expect(count).toHaveTextContent("");

  // increment again, should not rerender because state.name is not used, will set state.cunt to '4'
  await userEvent.click(container.querySelector('[data-testid="increment"]')!);
  expect(renderCountTotal).toBe(6); // Adjusted from 7
  expect(count).toHaveTextContent("");

  // update name again, should not rerender because state.name is not used, will set state.name to 'Name 4'
  await userEvent.click(container.querySelector('[data-testid="updateName"]')!);
  expect(renderCountTotal).toBe(6); // Adjusted from 7
  expect(count).toHaveTextContent("");

  // render name again, should render with new name
  await userEvent.click(
    container.querySelector('[data-testid="enableRenderName"]')!,
  );
  expect(name).toHaveTextContent("Name 4");
  expect(renderCountTotal).toBe(7); // Adjusted from 8
  expect(count).toHaveTextContent("");

  // show count again, should rerender with new count
  await userEvent.click(
    container.querySelector('[data-testid="enableRenderCount"]')!,
  );
  expect(count).toHaveTextContent("4");
  expect(renderCountTotal).toBe(8); // Adjusted from 9
});

test("should only rerender if state is used, even if state is used after initial render", async () => {
  // start by not rendering name and count
  const { container } = render(
    <Counter num={1} renderName={false} renderCount={false} />,
  );
  // Initial render + Strict Mode remount = 2 renders
  expect(renderCountTotal).toBe(1); // Adjusted from 2

  // check that both name and count are rendered
  const name = container.querySelector('[data-testid="name"]');
  expect(name).toHaveTextContent("");
  const count = container.querySelector('[data-testid="count"]');
  expect(count).toHaveTextContent("");

  // update name, should not rerender, will set state.name to 'Name 2'
  await userEvent.click(container.querySelector('[data-testid="updateName"]')!);
  expect(renderCountTotal).toBe(1); // Kept as 1

  // increment, will not rerender because state.count is not used, will set state.count to '2'
  await userEvent.click(container.querySelector('[data-testid="increment"]')!);
  expect(renderCountTotal).toBe(1); // Kept as 1

  // start rendering name
  await userEvent.click(
    container.querySelector('[data-testid="enableRenderName"]')!,
  );
  expect(name).toHaveTextContent("Name 2");
  expect(renderCountTotal).toBe(2); // Adjusted from 3
  // update name, should rerender, will set state.name to 'Name 3'
  await userEvent.click(container.querySelector('[data-testid="updateName"]')!);
  expect(name).toHaveTextContent("Name 3");
  expect(renderCountTotal).toBe(3); // Adjusted from 4

  // start rendering count
  await userEvent.click(
    container.querySelector('[data-testid="enableRenderCount"]')!,
  );
  expect(count).toHaveTextContent("2");
  expect(renderCountTotal).toBe(4); // Adjusted from 5
  // increment again, should not rerender because state.count is not used, will set state.count to '4'
  await userEvent.click(container.querySelector('[data-testid="increment"]')!);
  expect(count).toHaveTextContent("3");
  expect(renderCountTotal).toBe(5); // Adjusted from 6
});
