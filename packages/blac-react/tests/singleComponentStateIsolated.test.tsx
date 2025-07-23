import { Cubit } from "@blac/core";
import { render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { FC } from "react";
import { beforeEach, expect, test } from "vitest";
import { useBloc } from "../src";

type CounterCubitProps = {
  initialState?: number;
};
class CounterCubit extends Cubit<{ count: number }, CounterCubitProps> {
  static isolated = true;

  constructor(props: CounterCubitProps = {}) {
    super({ count: props.initialState ?? 0 });
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}

/**
 * 
 * @param props 
 * @returns 
 */
let renderCount = 0;
const Counter: FC<{ num: number }> = ({ num }) => {
  const [state, { increment }] = useBloc(CounterCubit, { props: { initialState: num } });
  renderCount += 1;
  return (
    <div>
      <button onClick={increment}>+1</button>
      <label>{state.count}</label>
    </div>
  );
};

beforeEach(() => {
  renderCount = 0;
});

test("should get state and instance", () => {
  const { result } = renderHook(() =>
    useBloc(CounterCubit, { props: { initialState: 3442 } }),
  );
  const [state, instance] = result.current;
  expect(state.count).toBe(3442);
  expect(instance).toBeInstanceOf(CounterCubit);
});

test("should update state", async () => {
  render(<Counter num={3442} />);
  const instance = screen.getByText("3442");
  expect(instance).toBeInTheDocument();
  await userEvent.click(screen.getByText("+1"));
  expect(screen.getByText("3443")).toBeInTheDocument();
});

test("should rerender when state changes", async () => {
  render(<Counter num={3442} />);
  const instance = screen.getByText("3442");
  expect(instance).toBeInTheDocument();

  // Initial render 
  expect(renderCount).toBe(1);
  await userEvent.click(screen.getByText("+1"));
  expect(screen.getByText("3443")).toBeInTheDocument();
  // State change causes another render
  expect(renderCount).toBe(2);
});

test("should not rerender when state changes that is not used", async () => {
  let localRenderCount = 0;
  const CounterNoState: FC<{ num: number }> = ({ num }) => {
    const [, { increment }] = useBloc(CounterCubit, { props: { initialState: num } });
    localRenderCount += 1;
    return (
      <div>
        <button onClick={increment}>+1</button>
        <label>{num}</label>
      </div>
    );
  };

  render(<CounterNoState num={3442} />);
  const instance = screen.getByText("3442");
  expect(instance).toBeInTheDocument();

  // Initial render 
  expect(localRenderCount).toBe(1);
  await userEvent.click(screen.getByText("+1"));
  // Should not rerender because state is not used in component
  expect(localRenderCount).toBe(1);
});
