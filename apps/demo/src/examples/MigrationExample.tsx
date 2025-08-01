import React, { useEffect, useState } from 'react';
import { Cubit, BlocStreams } from '@blac/core';
import { useBloc, useBlocStream, useDerivedState } from '@blac/react';

// Example Cubit for demonstration
interface TimerState {
  seconds: number;
  isRunning: boolean;
}

class TimerCubit extends Cubit<TimerState> {
  private interval?: NodeJS.Timeout;

  constructor() {
    super({ seconds: 0, isRunning: false });
  }

  start = () => {
    if (this.state.isRunning) return;
    
    this.emit({ ...this.state, isRunning: true });
    this.interval = setInterval(() => {
      this.emit({ ...this.state, seconds: this.state.seconds + 1 });
    }, 1000);
  };

  stop = () => {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    this.emit({ ...this.state, isRunning: false });
  };

  reset = () => {
    this.stop();
    this.emit({ seconds: 0, isRunning: false });
  };
}

// OLD WAY: Using callback-based approach (DEPRECATED)
function OldTimerComponent() {
  const [state, bloc] = useBloc(TimerCubit);
  const [highestSeconds, setHighestSeconds] = useState(0);

  // Manual subscription for tracking highest value
  useEffect(() => {
    // ⚠️ DEPRECATED: Direct observer subscription
    const unsubscribe = bloc._observer.subscribe({
      id: 'highest-tracker',
      fn: (newState) => {
        setHighestSeconds(prev => Math.max(prev, newState.seconds));
      }
    });

    return unsubscribe; // Manual cleanup required
  }, [bloc]);

  return (
    <div className="p-4 border rounded bg-red-50">
      <h3 className="text-lg font-bold mb-2 text-red-700">
        ⚠️ OLD WAY (Deprecated)
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Using callback-based observer pattern
      </p>
      
      <div className="space-y-2">
        <p>Current: {state.seconds}s</p>
        <p>Highest: {highestSeconds}s</p>
        <p>Status: {state.isRunning ? '🟢 Running' : '🔴 Stopped'}</p>
      </div>
      
      <div className="flex gap-2 mt-4">
        <button
          onClick={bloc.start}
          disabled={state.isRunning}
          className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Start
        </button>
        <button
          onClick={bloc.stop}
          disabled={!state.isRunning}
          className="px-3 py-1 bg-red-500 text-white rounded disabled:opacity-50"
        >
          Stop
        </button>
        <button
          onClick={bloc.reset}
          className="px-3 py-1 bg-gray-500 text-white rounded"
        >
          Reset
        </button>
      </div>
      
      <div className="mt-4 p-2 bg-red-100 rounded text-sm">
        <strong>Problems with this approach:</strong>
        <ul className="list-disc list-inside mt-1">
          <li>Manual subscription management</li>
          <li>Risk of memory leaks if cleanup forgotten</li>
          <li>Accessing internal _observer API</li>
          <li>Complex for derived state</li>
        </ul>
      </div>
    </div>
  );
}

// NEW WAY: Using generator-based approach
function NewTimerComponent() {
  const { state, bloc, stream } = useBlocStream(TimerCubit);
  const [highestSeconds, setHighestSeconds] = useState(0);

  // Automatic subscription with generators
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      for await (const newState of stream) {
        if (controller.signal.aborted) break;
        setHighestSeconds(prev => Math.max(prev, newState.seconds));
      }
    })();

    return () => controller.abort(); // Automatic cleanup
  }, [stream]);

  // Even better: Use derived state
  const formattedTime = useDerivedState(
    TimerCubit,
    (state) => {
      const mins = Math.floor(state.seconds / 60);
      const secs = state.seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  );

  return (
    <div className="p-4 border rounded bg-green-50">
      <h3 className="text-lg font-bold mb-2 text-green-700">
        ✅ NEW WAY (Recommended)
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Using generator-based async iteration
      </p>
      
      <div className="space-y-2">
        <p>Current: {state.seconds}s ({formattedTime})</p>
        <p>Highest: {highestSeconds}s</p>
        <p>Status: {state.isRunning ? '🟢 Running' : '🔴 Stopped'}</p>
      </div>
      
      <div className="flex gap-2 mt-4">
        <button
          onClick={bloc.start}
          disabled={state.isRunning}
          className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Start
        </button>
        <button
          onClick={bloc.stop}
          disabled={!state.isRunning}
          className="px-3 py-1 bg-red-500 text-white rounded disabled:opacity-50"
        >
          Stop
        </button>
        <button
          onClick={bloc.reset}
          className="px-3 py-1 bg-gray-500 text-white rounded"
        >
          Reset
        </button>
      </div>
      
      <div className="mt-4 p-2 bg-green-100 rounded text-sm">
        <strong>Benefits of this approach:</strong>
        <ul className="list-disc list-inside mt-1">
          <li>Automatic cleanup with AbortController</li>
          <li>No memory leak risks</li>
          <li>Clean, modern async/await syntax</li>
          <li>Built-in derived state support</li>
          <li>Better TypeScript inference</li>
        </ul>
      </div>
    </div>
  );
}

// Advanced example with stream utilities
function AdvancedTimerComponent() {
  const [, bloc] = useBloc(TimerCubit);
  const [throttledSeconds, setThrottledSeconds] = useState(0);
  const [notifications, setNotifications] = useState<string[]>([]);

  // Throttled updates (max once per 2 seconds)
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      for await (const state of BlocStreams.throttle(bloc, 2000)) {
        if (controller.signal.aborted) break;
        setThrottledSeconds(state.seconds);
      }
    })();

    return () => controller.abort();
  }, [bloc]);

  // Milestone notifications
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      for await (const state of BlocStreams.filter(
        bloc,
        (s) => s.seconds > 0 && s.seconds % 10 === 0
      )) {
        if (controller.signal.aborted) break;
        setNotifications(prev => [
          ...prev.slice(-2),
          `Reached ${state.seconds} seconds!`
        ]);
      }
    })();

    return () => controller.abort();
  }, [bloc]);

  return (
    <div className="p-4 border rounded bg-blue-50">
      <h3 className="text-lg font-bold mb-2 text-blue-700">
        🚀 Advanced Generator Features
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Using BlocStreams utilities
      </p>
      
      <div className="space-y-2">
        <p>Throttled updates (2s): {throttledSeconds}s</p>
        
        <div>
          <p className="font-semibold">Milestone Notifications:</p>
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500">None yet...</p>
          ) : (
            <ul className="text-sm">
              {notifications.map((notif, i) => (
                <li key={i}>• {notif}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      <div className="mt-4 p-2 bg-blue-100 rounded text-sm">
        <strong>Stream utilities demonstrated:</strong>
        <ul className="list-disc list-inside mt-1">
          <li><code>throttle()</code> - Limit update frequency</li>
          <li><code>filter()</code> - Only process certain states</li>
          <li><code>debounce()</code> - Wait for inactivity</li>
          <li><code>map()</code> - Transform state values</li>
          <li><code>take()</code> - Limit iterations</li>
        </ul>
      </div>
    </div>
  );
}

export default function MigrationExample() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">
        BlaC Migration Example: Callback → Generator APIs
      </h2>
      
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-bold text-yellow-800 mb-2">⚡ Migration Notice</h3>
        <p className="text-sm">
          The callback-based observer APIs are deprecated in v2.4.0 and will be 
          removed in v3.0.0. This example shows how to migrate your code to use 
          the new generator-based APIs.
        </p>
      </div>
      
      <div className="grid gap-6 mb-6">
        <OldTimerComponent />
        <NewTimerComponent />
        <AdvancedTimerComponent />
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-bold mb-2">Quick Migration Checklist:</h3>
        <ul className="list-none space-y-2 text-sm">
          <li>
            ✅ Replace <code>bloc._observer.subscribe()</code> with 
            <code>bloc.stateStream()</code>
          </li>
          <li>
            ✅ Use <code>useBlocStream</code> hook instead of manual subscriptions
          </li>
          <li>
            ✅ Replace manual derived state with <code>useDerivedState</code>
          </li>
          <li>
            ✅ Use <code>BlocStreams</code> utilities for debouncing/throttling
          </li>
          <li>
            ✅ Replace unsubscribe callbacks with AbortController
          </li>
        </ul>
      </div>
    </div>
  );
}