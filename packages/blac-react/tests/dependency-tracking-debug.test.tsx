import { Cubit } from "@blac/core";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { useBloc } from "../src";

class TestCubit extends Cubit<{ count: number; name: string }> {
  constructor() {
    super({ count: 0, name: "test" });
  }

  increment = () => {
    this.emit({ ...this.state, count: this.state.count + 1 });
  };

  updateName = (name: string) => {
    this.emit({ ...this.state, name });
  };
}

test("dependency tracking - accessing state", async () => {
  let renderCount = 0;

  const Component = () => {
    const [state, cubit] = useBloc(TestCubit);
    renderCount++;
    return (
      <div>
        <span data-testid="count">{state.count}</span>
        <button data-testid="inc" onClick={cubit.increment}>+</button>
        <button data-testid="name" onClick={() => cubit.updateName("new")}>name</button>
      </div>
    );
  };

  const { getByTestId } = render(<Component />);
  expect(renderCount).toBe(1);

  // Should re-render when count changes (accessed property)
  await userEvent.click(getByTestId("inc"));
  expect(renderCount).toBe(2);

  // Should not re-render when name changes because we haven't accessed it
  await userEvent.click(getByTestId("name"));
  expect(renderCount).toBe(2);
});

test("dependency tracking - not accessing state", async () => {
  let renderCount = 0;

  const Component = () => {
    const [, cubit] = useBloc(TestCubit);
    renderCount++;
    return (
      <div>
        <span data-testid="static">Static</span>
        <button data-testid="inc" onClick={cubit.increment}>+</button>
      </div>
    );
  };

  const { getByTestId } = render(<Component />);
  expect(renderCount).toBe(1);

  // Should NOT re-render when state changes (no properties accessed)
  await userEvent.click(getByTestId("inc"));
  expect(renderCount).toBe(1);
});
