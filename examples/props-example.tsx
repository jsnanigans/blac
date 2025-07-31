import React from 'react';
import { Bloc, Cubit, PropsUpdated } from '@blac/core';
import useBloc from '@blac/react';

// Example 1: Bloc with Props (Event-Based)
// =========================================

interface SearchProps {
  query: string;
  filters?: string[];
}

interface SearchState {
  results: string[];
  loading: boolean;
}

class SearchBloc extends Bloc<SearchState, PropsUpdated<SearchProps>> {
  constructor(private config: { apiEndpoint: string }) {
    super({ results: [], loading: false });

    // Handle prop updates as events
    this.on(PropsUpdated<SearchProps>, async (event, emit) => {
      const { query, filters } = event.props;

      if (!query) {
        emit({ results: [], loading: false });
        return;
      }

      emit({ ...this.state, loading: true });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      emit({
        results: [`Result for: ${query}`, ...(filters || [])],
        loading: false
      });
    });
  }
}

// Usage in React
function SearchComponent({ query, filters }: { query: string; filters?: string[] }) {
  const bloc = useBloc(
    SearchBloc,
    { props: { apiEndpoint: '/api/search', query, filters } }
  );

  return (
    <div>
      {bloc.state.loading ? (
        <p>Searching...</p>
      ) : (
        <ul>
          {bloc.state.results.map((result, i) => (
            <li key={i}>{result}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Example 2: Cubit with Props (Method-Based)
// ==========================================

interface CounterProps {
  step: number;
  max?: number;
}

interface CounterState {
  count: number;
  stepSize: number;
}

class CounterCubit extends Cubit<CounterState, CounterProps> {
  constructor() {
    super({ count: 0, stepSize: 1 });
  }

  protected onPropsChanged(oldProps: CounterProps | undefined, newProps: CounterProps): void {
    // React to step size change
    if (oldProps?.step !== newProps.step) {
      this.emit({ ...this.state, stepSize: newProps.step });
    }
  }

  increment = () => {
    const step = this.props?.step ?? 1;
    const max = this.props?.max ?? Infinity;

    const newCount = Math.min(this.state.count + step, max);
    this.emit({ count: newCount, stepSize: step });
  };

  decrement = () => {
    const step = this.props?.step ?? 1;
    this.emit({ count: this.state.count - step, stepSize: step });
  };

  reset = () => {
    this.emit({ count: 0, stepSize: this.props?.step ?? 1 });
  };
}

// Usage in React
function Counter({ step, max }: { step: number; max?: number }) {
  const cubit = useBloc(
    CounterCubit,
    { props: { step, max } }
  );

  return (
    <div>
      <p>Count: {cubit.state.count} (step: {cubit.state.stepSize})</p>
      <button onClick={cubit.increment}>+</button>
      <button onClick={cubit.decrement}>-</button>
      <button onClick={cubit.reset}>Reset</button>
    </div>
  );
}

// Example 3: Props Ownership
// ==========================

function App() {
  const [searchQuery, setSearchQuery] = React.useState('');

  return (
    <div>
      <h1>Props Example</h1>

      {/* This component owns the SearchBloc props */}
      <SearchComponent query={searchQuery} filters={['active']} />

      {/* This component reads the same SearchBloc but can't set props */}
      <SearchStatusReader />

      <input
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search..."
      />

      <Counter step={5} max={100} />
    </div>
  );
}

function SearchStatusReader() {
  // Read-only consumer - constructor params but no reactive props
  const bloc = useBloc(SearchBloc, { props: { apiEndpoint: '/api/search' } });

  return <p>Total results: {bloc.state.results.length}</p>;
}

// Example 4: Isolated Props
// =========================

class IsolatedCounter extends Cubit<CounterState, CounterProps> {
  static isolated = true; // Each component gets its own instance

  constructor() {
    super({ count: 0, stepSize: 1 });
  }

  protected onPropsChanged(oldProps: CounterProps | undefined, newProps: CounterProps): void {
    if (oldProps?.step !== newProps.step) {
      this.emit({ ...this.state, stepSize: newProps.step });
    }
  }

  increment = () => {
    const step = this.props?.step ?? 1;
    this.emit({ count: this.state.count + step, stepSize: step });
  };
}

function IsolatedExample() {
  return (
    <div>
      {/* Each counter has its own instance with its own props */}
      <IsolatedCounterComponent step={1} />
      <IsolatedCounterComponent step={5} />
      <IsolatedCounterComponent step={10} />
    </div>
  );
}

function IsolatedCounterComponent({ step }: { step: number }) {
  const cubit = useBloc(
    IsolatedCounter,
    { props: { step } }
  );

  return (
    <div>
      <p>Isolated Count: {cubit.state.count} (step: {step})</p>
      <button onClick={cubit.increment}>+{step}</button>
    </div>
  );
}

export { SearchComponent, Counter, IsolatedExample, App };
