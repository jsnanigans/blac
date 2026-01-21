import { Cubit } from '@blac/core';
import { useBloc } from '@blac/preact';

interface CounterState {
  count: number;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.emit({ count: this.state.count - 1 });
  };

  reset = () => {
    this.emit({ count: 0 });
  };
}

export function CounterDemo() {
  const [state, counter] = useBloc(CounterCubit);

  return (
    <div className="demo-section">
      <h2>Counter Example</h2>
      <p>
        A simple counter demonstrating basic <code>useBloc</code> usage with a{' '}
        <code>Cubit</code>.
      </p>

      <div className="card">
        <div className="counter-display">{state.count}</div>
        <div className="counter-controls">
          <button className="primary" onClick={counter.decrement}>
            - Decrement
          </button>
          <button className="ghost" onClick={counter.reset}>
            Reset
          </button>
          <button className="primary" onClick={counter.increment}>
            + Increment
          </button>
        </div>
      </div>

      <div className="code-section">
        <h3>Code</h3>
        <pre className="code-block">
          {`class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}

// In component:
const [state, counter] = useBloc(CounterCubit);
// state.count is reactive!`}
        </pre>
      </div>
    </div>
  );
}
