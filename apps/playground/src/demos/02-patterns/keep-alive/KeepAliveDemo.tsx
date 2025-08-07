import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import React, { useEffect, useState } from 'react';

interface CounterState {
  count: number;
  instanceId: number;
}

let instanceCounter = 0;

// KeepAlive Cubit - persists even when no components are using it
class KeepAliveCounterCubit extends Cubit<CounterState> {
  static keepAlive = true; // This keeps the instance alive!

  constructor() {
    instanceCounter++;
    super({ count: 0, instanceId: instanceCounter });
    console.log(
      `KeepAliveCounterCubit instance ${this.state.instanceId} CONSTRUCTED.`,
    );
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
    console.log(
      `KeepAliveCounterCubit instance ${this.state.instanceId} incremented to ${this.state.count + 1}`,
    );
  };

  reset = () => {
    this.patch({ count: 0 });
    console.log(
      `KeepAliveCounterCubit instance ${this.state.instanceId} RESET.`,
    );
  };
}

// Regular Cubit - disposed when no components are using it
class RegularCounterCubit extends Cubit<CounterState> {
  // No keepAlive property - will be disposed when unused

  constructor() {
    instanceCounter++;
    super({ count: 0, instanceId: instanceCounter });
    console.log(
      `RegularCounterCubit instance ${this.state.instanceId} CONSTRUCTED.`,
    );
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  reset = () => {
    this.patch({ count: 0 });
  };
}

// Component that uses KeepAlive counter
const KeepAliveCounter: React.FC<{ id: string }> = ({ id }) => {
  const [state, cubit] = useBloc(KeepAliveCounterCubit);

  useEffect(() => {
    console.log(
      `KeepAlive Counter (${id}) MOUNTED. Instance: ${state.instanceId}`,
    );
    return () => {
      console.log(
        `KeepAlive Counter (${id}) UNMOUNTED. Instance: ${state.instanceId}`,
      );
    };
  }, [id, state.instanceId]);

  return (
    <div className="p-4 border border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
      <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
        KeepAlive Counter ({id})
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        Instance ID: {state.instanceId}
      </p>
      <div className="text-2xl font-bold mb-3">{state.count}</div>
      <div className="flex gap-2">
        <button
          onClick={cubit.increment}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          +1
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

// Component that uses Regular counter
const RegularCounter: React.FC<{ id: string }> = ({ id }) => {
  const [state, cubit] = useBloc(RegularCounterCubit);

  useEffect(() => {
    console.log(
      `Regular Counter (${id}) MOUNTED. Instance: ${state.instanceId}`,
    );
    return () => {
      console.log(
        `Regular Counter (${id}) UNMOUNTED. Instance: ${state.instanceId}`,
      );
    };
  }, [id, state.instanceId]);

  return (
    <div className="p-4 border border-orange-300 dark:border-orange-700 rounded-lg bg-orange-50 dark:bg-orange-900/20">
      <h4 className="font-semibold text-orange-700 dark:text-orange-300 mb-2">
        Regular Counter ({id})
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        Instance ID: {state.instanceId}
      </p>
      <div className="text-2xl font-bold mb-3">{state.count}</div>
      <div className="flex gap-2">
        <button
          onClick={cubit.increment}
          className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          +1
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

export const KeepAliveDemo: React.FC = () => {
  const [showKeepAlive1, setShowKeepAlive1] = useState(true);
  const [showKeepAlive2, setShowKeepAlive2] = useState(false);
  const [showRegular1, setShowRegular1] = useState(true);
  const [showRegular2, setShowRegular2] = useState(false);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">KeepAlive Pattern</h3>
        <p className="text-gray-600 dark:text-gray-400">
          KeepAlive Cubits persist in memory even when no components are using
          them. Regular Cubits are disposed when their last consumer unmounts.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          Open the browser console to see lifecycle logs!
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 text-blue-600 dark:text-blue-400">
            KeepAlive Counters
          </h3>
          <div className="space-y-3 mb-3">
            <div className="flex gap-2">
              <button
                onClick={() => setShowKeepAlive1(!showKeepAlive1)}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {showKeepAlive1 ? 'Hide' : 'Show'} Counter 1
              </button>
              <button
                onClick={() => setShowKeepAlive2(!showKeepAlive2)}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {showKeepAlive2 ? 'Hide' : 'Show'} Counter 2
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {showKeepAlive1 && <KeepAliveCounter id="1" />}
            {showKeepAlive2 && <KeepAliveCounter id="2" />}
            {!showKeepAlive1 && !showKeepAlive2 && (
              <div className="p-4 border border-dashed border-blue-300 dark:border-blue-700 rounded-lg">
                <p className="text-blue-600 dark:text-blue-400">
                  No KeepAlive counters mounted, but the Cubit instance still
                  exists! Toggle them back to see the preserved state.
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3 text-orange-600 dark:text-orange-400">
            Regular Counters
          </h3>
          <div className="space-y-3 mb-3">
            <div className="flex gap-2">
              <button
                onClick={() => setShowRegular1(!showRegular1)}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {showRegular1 ? 'Hide' : 'Show'} Counter 1
              </button>
              <button
                onClick={() => setShowRegular2(!showRegular2)}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {showRegular2 ? 'Hide' : 'Show'} Counter 2
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {showRegular1 && <RegularCounter id="1" />}
            {showRegular2 && <RegularCounter id="2" />}
            {!showRegular1 && !showRegular2 && (
              <div className="p-4 border border-dashed border-orange-300 dark:border-orange-700 rounded-lg">
                <p className="text-orange-600 dark:text-orange-400">
                  No Regular counters mounted. The Cubit was disposed! Toggle
                  them back and notice the new instance ID.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h4 className="font-semibold mb-2">Key Differences:</h4>
        <ul className="space-y-1 text-sm">
          <li>
            • <strong>KeepAlive:</strong> Same instance ID across mounts, state
            preserved
          </li>
          <li>
            • <strong>Regular:</strong> New instance ID after unmount/remount,
            state reset
          </li>
          <li>• Check the console to see construction/disposal logs</li>
        </ul>
      </div>
    </div>
  );
};

export const keepAliveCode = {
  usage: `import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';

// KeepAlive Cubit - persists when unused
class KeepAliveCubit extends Cubit<State> {
  static keepAlive = true; // Key property!
  
  constructor() {
    super(initialState);
  }
}

// Regular Cubit - disposed when unused
class RegularCubit extends Cubit<State> {
  // No keepAlive property
  
  constructor() {
    super(initialState);
  }
}

// Usage is the same for both
function MyComponent() {
  const [state, cubit] = useBloc(KeepAliveCubit);
  // This cubit persists even if MyComponent unmounts
}`,
  bloc: `import { Cubit } from '@blac/core';

interface AppState {
  user: User | null;
  settings: Settings;
}

// Use KeepAlive for global app state
export class AppStateCubit extends Cubit<AppState> {
  static keepAlive = true; // Persists throughout app lifecycle
  
  constructor() {
    super({
      user: null,
      settings: defaultSettings,
    });
    
    // Load persisted data on construction
    this.loadPersistedData();
  }
  
  private loadPersistedData = async () => {
    const data = await localStorage.getItem('appState');
    if (data) {
      this.emit(JSON.parse(data));
    }
  };
  
  login = (user: User) => {
    this.patch({ user });
    this.persistState();
  };
  
  logout = () => {
    this.patch({ user: null });
    this.persistState();
  };
  
  private persistState = () => {
    localStorage.setItem('appState', JSON.stringify(this.state));
  };
}

// Use regular Cubit for temporary UI state
export class ModalCubit extends Cubit<ModalState> {
  // No keepAlive - disposed when modal closes
  
  constructor() {
    super({ isOpen: false, data: null });
  }
  
  open = (data: any) => {
    this.emit({ isOpen: true, data });
  };
  
  close = () => {
    this.emit({ isOpen: false, data: null });
  };
}`,
};
