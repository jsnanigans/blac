import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';

// Counter state and Cubit
interface CounterState {
  count: number;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.patch({ count: this.state.count - 1 });
  };

  reset = () => {
    this.emit({ count: 0 });
  };
}

// Demo component
export function CounterDemo() {
  const [state, cubit] = useBloc(CounterCubit);

  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="text-6xl font-bold mb-4">{state.count}</div>
        <p className="text-muted-foreground">
          A simple counter demonstrating basic Cubit usage
        </p>
      </div>
      
      <div className="flex justify-center gap-2">
        <button
          onClick={cubit.decrement}
          className="px-4 py-2 border rounded-md hover:bg-accent"
        >
          Decrement
        </button>
        <button
          onClick={cubit.reset}
          className="px-4 py-2 border rounded-md hover:bg-accent"
        >
          Reset
        </button>
        <button
          onClick={cubit.increment}
          className="px-4 py-2 border rounded-md hover:bg-accent bg-primary text-primary-foreground"
        >
          Increment
        </button>
      </div>
    </div>
  );
}

// Export code for display
export const counterDemoCode = {
  cubit: `class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.patch({ count: this.state.count - 1 });
  };

  reset = () => {
    this.emit({ count: 0 });
  };
}`,
  usage: `function CounterDemo() {
  const [state, cubit] = useBloc(CounterCubit);

  return (
    <div>
      <div>{state.count}</div>
      <button onClick={cubit.increment}>+</button>
      <button onClick={cubit.decrement}>-</button>
    </div>
  );
}`
};