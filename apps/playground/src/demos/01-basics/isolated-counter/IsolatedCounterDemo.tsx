import { useBloc } from '@blac/react';
import React from 'react';
import { Cubit } from '@blac/core';

interface CounterState {
  count: number;
}

// Shared counter - all instances share the same state
class SharedCounterCubit extends Cubit<CounterState> {
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
    this.patch({ count: 0 });
  };
}

// Isolated counter - each instance gets its own state
class IsolatedCounterCubit extends Cubit<CounterState> {
  static isolated = true; // This makes each component instance get its own Cubit

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
    this.patch({ count: 0 });
  };
}

// Component that uses shared counter
const SharedCounter: React.FC<{ label: string }> = ({ label }) => {
  const [state, cubit] = useBloc(SharedCounterCubit);

  return (
    <div className="p-4 border border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
      <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
        {label}
      </h4>
      <div className="text-2xl font-bold mb-3">{state.count}</div>
      <div className="flex gap-2">
        <button
          onClick={cubit.increment}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          +1
        </button>
        <button
          onClick={cubit.decrement}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          -1
        </button>
        <button
          onClick={cubit.reset}
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

// Component that uses isolated counter
const IsolatedCounter: React.FC<{ label: string }> = ({ label }) => {
  const [state, cubit] = useBloc(IsolatedCounterCubit);

  return (
    <div className="p-4 border border-green-300 dark:border-green-700 rounded-lg bg-green-50 dark:bg-green-900/20">
      <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">
        {label}
      </h4>
      <div className="text-2xl font-bold mb-3">{state.count}</div>
      <div className="flex gap-2">
        <button
          onClick={cubit.increment}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          +1
        </button>
        <button
          onClick={cubit.decrement}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          -1
        </button>
        <button
          onClick={cubit.reset}
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export const IsolatedCounterDemo: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">Shared vs Isolated Instances</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Shared counters share the same state across all instances. Isolated
          counters each have their own independent state.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 text-blue-600 dark:text-blue-400">
            Shared Counters (same state)
          </h3>
          <div className="space-y-3">
            <SharedCounter label="Shared Counter A" />
            <SharedCounter label="Shared Counter B" />
            <SharedCounter label="Shared Counter C" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
            All these counters share the same state. Changing one affects all.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3 text-green-600 dark:text-green-400">
            Isolated Counters (independent state)
          </h3>
          <div className="space-y-3">
            <IsolatedCounter label="Isolated Counter A" />
            <IsolatedCounter label="Isolated Counter B" />
            <IsolatedCounter label="Isolated Counter C" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
            Each counter has its own independent state. Changing one doesn't
            affect others.
          </p>
        </div>
      </div>
    </div>
  );
};

export const isolatedCounterCode = {
  usage: `import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';

// Shared Cubit - all instances share state
class SharedCounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
}

// Isolated Cubit - each instance has own state
class IsolatedCounterCubit extends Cubit<CounterState> {
  static isolated = true; // Key difference!

  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
}

// Usage in components
function SharedExample() {
  const [state, cubit] = useBloc(SharedCounterCubit);
  // All components using SharedCounterCubit share the same state
}

function IsolatedExample() {
  const [state, cubit] = useBloc(IsolatedCounterCubit);
  // Each component gets its own independent instance
}`,
  bloc: `import { Cubit } from '@blac/core';

interface CounterState {
  count: number;
}

// Default behavior: Shared instance
export class SharedCounterCubit extends Cubit<CounterState> {
  // No static isolated property means shared by default
  
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.patch({ count: this.state.count - 1 });
  };
}

// Isolated behavior: Each component gets its own
export class IsolatedCounterCubit extends Cubit<CounterState> {
  static isolated = true; // This is the key!
  
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.patch({ count: this.state.count - 1 });
  };
}

// You can also isolate instances using unique IDs
function ComponentWithId() {
  const uniqueId = useId(); // React hook for unique ID
  const [state, cubit] = useBloc(SharedCounterCubit, {
    id: uniqueId // This creates an isolated instance
  });
}`,
};
