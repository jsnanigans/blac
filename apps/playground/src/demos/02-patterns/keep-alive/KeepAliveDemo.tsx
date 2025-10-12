import { Cubit, Blac } from '@blac/core';
import { useBloc } from '@blac/react';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DemoLayout } from '@/core/layouts/DemoLayout';

interface CounterState {
  count: number;
  instanceId: number;
  lastUpdated: number;
}

let instanceCounter = 0;

// KeepAlive Cubit - persists even when no components are using it
class KeepAliveCounterCubit extends Cubit<CounterState> {
  static keepAlive = true; // This keeps the instance alive!

  constructor() {
    instanceCounter++;
    const instanceId = instanceCounter;
    super({
      count: 0,
      instanceId,
      lastUpdated: Date.now(),
    });
    console.log(`🟢 KeepAliveCounterCubit instance ${instanceId} CONSTRUCTED.`);
  }

  increment = () => {
    const newCount = this.state.count + 1;
    this.emit({
      ...this.state,
      count: newCount,
      lastUpdated: Date.now(),
    });
    console.log(
      `📈 KeepAliveCounterCubit instance ${this.state.instanceId} incremented to ${newCount}`,
    );
  };

  reset = () => {
    this.emit({
      ...this.state,
      count: 0,
      lastUpdated: Date.now(),
    });
    console.log(
      `🔄 KeepAliveCounterCubit instance ${this.state.instanceId} RESET.`,
    );
  };

  dispose = async () => {
    console.log(
      `🔴 KeepAliveCounterCubit instance ${this.state.instanceId} DISPOSED (should not happen with keepAlive!).`,
    );
    return super.dispose();
  };
}

// Regular Cubit - disposed when no components are using it
class RegularCounterCubit extends Cubit<CounterState> {
  // No keepAlive property - will be disposed when unused

  constructor() {
    instanceCounter++;
    const instanceId = instanceCounter;
    super({
      count: 0,
      instanceId,
      lastUpdated: Date.now(),
    });
    console.log(`🟢 RegularCounterCubit instance ${instanceId} CONSTRUCTED.`);
  }

  increment = () => {
    const newCount = this.state.count + 1;
    this.emit({
      ...this.state,
      count: newCount,
      lastUpdated: Date.now(),
    });
    console.log(
      `📈 RegularCounterCubit instance ${this.state.instanceId} incremented to ${newCount}`,
    );
  };

  reset = () => {
    this.emit({
      ...this.state,
      count: 0,
      lastUpdated: Date.now(),
    });
    console.log(
      `🔄 RegularCounterCubit instance ${this.state.instanceId} RESET.`,
    );
  };

  dispose = async () => {
    console.log(
      `🔴 RegularCounterCubit instance ${this.state.instanceId} DISPOSED.`,
    );
    return super.dispose();
  };
}

// Component that uses KeepAlive counter
const KeepAliveCounter: React.FC<{ id: string }> = React.memo(({ id }) => {
  const [state, cubit] = useBloc(KeepAliveCounterCubit);
  const renderCount = useRef(0);
  renderCount.current++;

  // Log mount/unmount only, not state changes
  useEffect(() => {
    console.log(
      `🔵 KeepAlive Counter (${id}) MOUNTED. Instance: ${state.instanceId}, Count: ${state.count}`,
    );
    return () => {
      console.log(
        `🟠 KeepAlive Counter (${id}) UNMOUNTING. Instance: ${state.instanceId}`,
      );
    };
  }, [id]); // Only depend on id, not state

  // Log state changes separately
  useEffect(() => {
    console.log(
      `📊 KeepAlive Counter (${id}) STATE UPDATE: count=${state.count}, render #${renderCount.current}`,
    );
  }, [id, state.count]);

  const handleIncrement = useCallback(() => {
    console.log(`👆 KeepAlive Counter (${id}) INCREMENT clicked`);
    cubit.increment();
  }, [cubit, id]);

  const handleReset = useCallback(() => {
    console.log(`👆 KeepAlive Counter (${id}) RESET clicked`);
    cubit.reset();
  }, [cubit, id]);

  return (
    <div className="p-4 border-2 border-blue-400 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-blue-700 dark:text-blue-300">
          KeepAlive Counter ({id})
        </h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Render #{renderCount.current}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-gray-600 dark:text-gray-400">Instance:</span>
          <span className="ml-1 font-mono font-bold text-blue-600 dark:text-blue-400">
            #{state.instanceId}
          </span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Updated:</span>
          <span className="ml-1 font-mono text-xs">
            {new Date(state.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      </div>
      <div className="text-3xl font-bold mb-3 text-center bg-white dark:bg-gray-800 rounded p-2">
        {state.count}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleIncrement}
          className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Increment
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
});

KeepAliveCounter.displayName = 'KeepAliveCounter';

// Component that uses Regular counter
const RegularCounter: React.FC<{ id: string }> = React.memo(({ id }) => {
  const [state, cubit] = useBloc(RegularCounterCubit);
  const renderCount = useRef(0);
  renderCount.current++;

  // Log mount/unmount only
  useEffect(() => {
    console.log(
      `🔵 Regular Counter (${id}) MOUNTED. Instance: ${state.instanceId}, Count: ${state.count}`,
    );
    return () => {
      console.log(
        `🟠 Regular Counter (${id}) UNMOUNTING. Instance: ${state.instanceId}`,
      );
    };
  }, [id]); // Only depend on id

  // Log state changes separately
  useEffect(() => {
    console.log(
      `📊 Regular Counter (${id}) STATE UPDATE: count=${state.count}, render #${renderCount.current}`,
    );
  }, [id, state.count]);

  const handleIncrement = useCallback(() => {
    console.log(`👆 Regular Counter (${id}) INCREMENT clicked`);
    cubit.increment();
  }, [cubit, id]);

  const handleReset = useCallback(() => {
    console.log(`👆 Regular Counter (${id}) RESET clicked`);
    cubit.reset();
  }, [cubit, id]);

  return (
    <div className="p-4 border-2 border-orange-400 dark:border-orange-600 rounded-lg bg-orange-50 dark:bg-orange-900/20">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-orange-700 dark:text-orange-300">
          Regular Counter ({id})
        </h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Render #{renderCount.current}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-gray-600 dark:text-gray-400">Instance:</span>
          <span className="ml-1 font-mono font-bold text-orange-600 dark:text-orange-400">
            #{state.instanceId}
          </span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Updated:</span>
          <span className="ml-1 font-mono text-xs">
            {new Date(state.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      </div>
      <div className="text-3xl font-bold mb-3 text-center bg-white dark:bg-gray-800 rounded p-2">
        {state.count}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleIncrement}
          className="flex-1 px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
        >
          Increment
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
});

RegularCounter.displayName = 'RegularCounter';

// Debug panel to show current Blac state
const DebugPanel: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<string>('');

  const updateDebugInfo = useCallback(() => {
    const blacInstance = Blac.getInstance();
    const info = {
      keepAliveInstances: 0,
      regularInstances: 0,
      totalInstances: 0,
    };

    // Count instances (this is a simplified version)
    try {
      // @ts-ignore - accessing private properties for debugging
      const blocMap = blacInstance.blocInstanceMap;
      if (blocMap) {
        info.totalInstances = blocMap.size;
        for (const [, instance] of blocMap) {
          if (instance.constructor.name === 'KeepAliveCounterCubit') {
            info.keepAliveInstances++;
          } else if (instance.constructor.name === 'RegularCounterCubit') {
            info.regularInstances++;
          }
        }
      }
    } catch (e) {
      // Ignore errors in debug panel
    }

    setDebugInfo(JSON.stringify(info, null, 2));
  }, []);

  useEffect(() => {
    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 1000);
    return () => clearInterval(interval);
  }, [updateDebugInfo]);

  return (
    <div className="mt-4 p-3 bg-gray-900 text-green-400 rounded font-mono text-xs">
      <div className="mb-1 text-gray-400">Debug Info:</div>
      <pre>{debugInfo}</pre>
    </div>
  );
};

export const KeepAliveDemo: React.FC = () => {
  const [showKeepAlive1, setShowKeepAlive1] = useState(true);
  const [showKeepAlive2, setShowKeepAlive2] = useState(false);
  const [showRegular1, setShowRegular1] = useState(true);
  const [showRegular2, setShowRegular2] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Clear console and add header when component mounts
  useEffect(() => {
    console.clear();
    console.log(
      '%c🚀 KeepAlive Demo Started',
      'font-size: 16px; font-weight: bold; color: #3b82f6;',
    );
    console.log('%cLegend:', 'font-weight: bold;');
    console.log('  🟢 = Construction');
    console.log('  🔴 = Disposal');
    console.log('  🔵 = Component Mount');
    console.log('  🟠 = Component Unmount');
    console.log('  📈 = Increment');
    console.log('  🔄 = Reset');
    console.log('  📊 = State Update');
    console.log('  👆 = User Click');
    console.log('-------------------');
  }, []);

  return (
    <DemoLayout>
      <div className="mb-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-2xl font-bold">KeepAlive Pattern Demo</h3>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {showDebug ? 'Hide' : 'Show'} Debug
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          KeepAlive Cubits persist in memory even when no components are using
          them. Regular Cubits are disposed when their last consumer unmounts.
        </p>
        <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded text-sm">
          <strong>📋 Instructions:</strong> Open the browser console (F12) to
          see detailed lifecycle logs. Try showing/hiding counters and
          incrementing values to see the difference!
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              KeepAlive Counters
            </h3>
          </div>
          <div className="space-y-3 mb-3">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  console.log(
                    `👆 User clicked: ${showKeepAlive1 ? 'Hide' : 'Show'} KeepAlive Counter 1`,
                  );
                  setShowKeepAlive1(!showKeepAlive1);
                }}
                className={`px-3 py-2 rounded transition-colors ${
                  showKeepAlive1
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {showKeepAlive1 ? '🔽 Hide' : '▶️ Show'} Counter 1
              </button>
              <button
                onClick={() => {
                  console.log(
                    `👆 User clicked: ${showKeepAlive2 ? 'Hide' : 'Show'} KeepAlive Counter 2`,
                  );
                  setShowKeepAlive2(!showKeepAlive2);
                }}
                className={`px-3 py-2 rounded transition-colors ${
                  showKeepAlive2
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {showKeepAlive2 ? '🔽 Hide' : '▶️ Show'} Counter 2
              </button>
            </div>
          </div>

          <div className="space-y-3 min-h-[200px]">
            {showKeepAlive1 && <KeepAliveCounter key="keepalive-1" id="1" />}
            {showKeepAlive2 && <KeepAliveCounter key="keepalive-2" id="2" />}
            {!showKeepAlive1 && !showKeepAlive2 && (
              <div className="p-4 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                <p className="text-blue-600 dark:text-blue-400 text-center">
                  <strong>✨ Magic!</strong>
                  <br />
                  No KeepAlive counters are mounted, but the Cubit instance
                  still exists in memory!
                  <br />
                  <span className="text-sm">
                    Toggle them back to see the preserved state.
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-orange-600 dark:text-orange-400">
              Regular Counters
            </h3>
          </div>
          <div className="space-y-3 mb-3">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  console.log(
                    `👆 User clicked: ${showRegular1 ? 'Hide' : 'Show'} Regular Counter 1`,
                  );
                  setShowRegular1(!showRegular1);
                }}
                className={`px-3 py-2 rounded transition-colors ${
                  showRegular1
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {showRegular1 ? '🔽 Hide' : '▶️ Show'} Counter 1
              </button>
              <button
                onClick={() => {
                  console.log(
                    `👆 User clicked: ${showRegular2 ? 'Hide' : 'Show'} Regular Counter 2`,
                  );
                  setShowRegular2(!showRegular2);
                }}
                className={`px-3 py-2 rounded transition-colors ${
                  showRegular2
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {showRegular2 ? '🔽 Hide' : '▶️ Show'} Counter 2
              </button>
            </div>
          </div>

          <div className="space-y-3 min-h-[200px]">
            {showRegular1 && <RegularCounter key="regular-1" id="1" />}
            {showRegular2 && <RegularCounter key="regular-2" id="2" />}
            {!showRegular1 && !showRegular2 && (
              <div className="p-4 border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-lg bg-orange-50/50 dark:bg-orange-900/10">
                <p className="text-orange-600 dark:text-orange-400 text-center">
                  <strong>💨 Gone!</strong>
                  <br />
                  No Regular counters are mounted. The Cubit was disposed!
                  <br />
                  <span className="text-sm">
                    Toggle them back and notice the new instance ID.
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-semibold mb-2 text-blue-700 dark:text-blue-300">
            🔷 KeepAlive Behavior
          </h4>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <li>✓ Same instance ID across all mounts</li>
            <li>✓ State preserved when unmounted</li>
            <li>✓ Shared state between all consumers</li>
            <li>✓ Never disposed (unless explicitly cleared)</li>
          </ul>
        </div>
        <div className="p-4 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
          <h4 className="font-semibold mb-2 text-orange-700 dark:text-orange-300">
            🔶 Regular Behavior
          </h4>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <li>✓ New instance for each mount cycle</li>
            <li>✓ State reset on remount</li>
            <li>✓ Independent instances per component</li>
            <li>✓ Disposed when last consumer unmounts</li>
          </ul>
        </div>
      </div>

      {showDebug && <DebugPanel />}

      <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h4 className="font-semibold mb-2">🎯 Try This Sequence:</h4>
        <ol className="space-y-1 text-sm list-decimal list-inside">
          <li>Increment KeepAlive Counter 1 a few times</li>
          <li>Hide KeepAlive Counter 1</li>
          <li>
            Show KeepAlive Counter 2 -{' '}
            <strong>it should show the same count!</strong>
          </li>
          <li>Increment Counter 2</li>
          <li>
            Show Counter 1 again -{' '}
            <strong>both counters should be in sync!</strong>
          </li>
          <li>
            Try the same with Regular counters -{' '}
            <strong>they reset each time!</strong>
          </li>
        </ol>
      </div>
    </DemoLayout>
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
