import { Cubit } from '@blac/core';
import { useBloc } from '@blac/preact';

interface CounterState {
  count: number;
  label: string;
}

class IsolatedCounterCubit extends Cubit<CounterState> {
  static isolated = true;

  constructor() {
    super({ count: 0, label: '' });
  }

  increment = () => {
    this.emit({ ...this.state, count: this.state.count + 1 });
  };

  decrement = () => {
    this.emit({ ...this.state, count: this.state.count - 1 });
  };

  setLabel = (label: string) => {
    this.emit({ ...this.state, label });
  };
}

function IsolatedCounter({ name }: { name: string }) {
  const [state, counter] = useBloc(IsolatedCounterCubit);

  return (
    <div className="isolated-counter">
      <h4>{name}</h4>
      {state.label && <p className="label">{state.label}</p>}
      <div className="counter-row">
        <button onClick={counter.decrement}>-</button>
        <span className="count">{state.count}</span>
        <button onClick={counter.increment}>+</button>
      </div>
      <input
        type="text"
        placeholder="Set label..."
        value={state.label}
        onInput={(e) => counter.setLabel((e.target as HTMLInputElement).value)}
      />
    </div>
  );
}

export function IsolatedDemo() {
  return (
    <div className="demo-section">
      <h2>Isolated Instances</h2>
      <p>
        Each component gets its own isolated instance of the Cubit. Changes in
        one counter don't affect the others.
      </p>

      <div className="card">
        <div className="isolated-grid">
          <IsolatedCounter name="Counter A" />
          <IsolatedCounter name="Counter B" />
          <IsolatedCounter name="Counter C" />
        </div>
      </div>

      <div className="code-section">
        <h3>Code</h3>
        <pre className="code-block">
          {`class IsolatedCounterCubit extends Cubit<CounterState> {
  // Mark as isolated - each component gets its own instance
  static isolated = true;

  constructor() {
    super({ count: 0, label: '' });
  }
}

// Each usage creates a separate instance:
const [stateA, counterA] = useBloc(IsolatedCounterCubit);
const [stateB, counterB] = useBloc(IsolatedCounterCubit);
// stateA and stateB are independent!`}
        </pre>
      </div>
    </div>
  );
}
