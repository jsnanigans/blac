/**
 * Graph Visualization Test Page
 *
 * Quick test of the BlocGraphVisualizer component with live Bloc instances.
 * This page allows you to create, update, and dispose Bloc instances
 * and see them visualized in real-time.
 */

import React, { useState } from 'react';
import { Cubit, Bloc } from '@blac/core';
import { useBloc } from '@blac/react';
import { DemoLayout } from '../core/layouts/DemoLayout';

// Test Cubits
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };

  reset = () => {
    this.emit(0);
  };
}

class NameCubit extends Cubit<string> {
  constructor() {
    super('Anonymous');
  }

  setName = (name: string) => {
    this.emit(name);
  };
}

// Test Bloc with events
class IncrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class DecrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class ResetEvent {}

type CounterEvents = IncrementEvent | DecrementEvent | ResetEvent;

class CounterBloc extends Bloc<number, CounterEvents> {
  constructor() {
    super(0);

    this.on(IncrementEvent, (event, emit) => {
      emit(this.state + event.amount);
    });

    this.on(DecrementEvent, (event, emit) => {
      emit(this.state - event.amount);
    });

    this.on(ResetEvent, (_event, emit) => {
      emit(0);
    });
  }

  increment = (amount = 1) => {
    this.add(new IncrementEvent(amount));
  };

  decrement = (amount = 1) => {
    this.add(new DecrementEvent(amount));
  };

  reset = () => {
    this.add(new ResetEvent());
  };
}

// Isolated Counter (each component gets its own instance)
class IsolatedCounterCubit extends Cubit<number> {
  static isolated = true;

  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

// KeepAlive Counter (persists even without consumers)
class KeepAliveCounterCubit extends Cubit<number> {
  static keepAlive = true;

  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

// Component that uses CounterCubit
function CounterDisplay() {
  const [count, counter] = useBloc(CounterCubit);

  return (
    <div className="p-4 border rounded bg-blue-50">
      <h3 className="font-bold mb-2">Counter Cubit (Shared)</h3>
      <p className="text-2xl mb-3">Count: {count}</p>
      <div className="flex gap-2">
        <button
          onClick={counter.increment}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          +1
        </button>
        <button
          onClick={counter.decrement}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          -1
        </button>
        <button
          onClick={counter.reset}
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// Component that uses NameCubit
function NameDisplay() {
  const [name, nameCubit] = useBloc(NameCubit);

  return (
    <div className="p-4 border rounded bg-green-50">
      <h3 className="font-bold mb-2">Name Cubit (Shared)</h3>
      <p className="mb-2">Name: {name}</p>
      <input
        type="text"
        value={name}
        onChange={(e) => nameCubit.setName(e.target.value)}
        className="px-2 py-1 border rounded w-full"
        placeholder="Enter name..."
      />
    </div>
  );
}

// Component that uses CounterBloc
function BlocCounterDisplay() {
  const [count, counterBloc] = useBloc(CounterBloc);

  return (
    <div className="p-4 border rounded bg-purple-50">
      <h3 className="font-bold mb-2">Counter Bloc (Event-Driven)</h3>
      <p className="text-2xl mb-3">Count: {count}</p>
      <div className="flex gap-2">
        <button
          onClick={() => counterBloc.increment(5)}
          className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          +5
        </button>
        <button
          onClick={() => counterBloc.decrement(3)}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          -3
        </button>
        <button
          onClick={counterBloc.reset}
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// Component that uses IsolatedCounterCubit
function IsolatedCounterDisplay() {
  const [count, counter] = useBloc(IsolatedCounterCubit);

  return (
    <div className="p-4 border rounded bg-orange-50">
      <h3 className="font-bold mb-2">Isolated Counter</h3>
      <p className="text-xl mb-2">Count: {count}</p>
      <button
        onClick={counter.increment}
        className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
      >
        +1
      </button>
    </div>
  );
}

// Component that uses KeepAliveCounterCubit
function KeepAliveCounterDisplay() {
  const [count, counter] = useBloc(KeepAliveCounterCubit);

  return (
    <div className="p-4 border rounded bg-violet-50">
      <h3 className="font-bold mb-2">Keep-Alive Counter</h3>
      <p className="text-xl mb-2">Count: {count}</p>
      <button
        onClick={counter.increment}
        className="px-3 py-1 bg-violet-500 text-white rounded hover:bg-violet-600"
      >
        +1
      </button>
    </div>
  );
}

export default function GraphTest() {
  const [showCounter, setShowCounter] = useState(true);
  const [showName, setShowName] = useState(true);
  const [showBlocCounter, setShowBlocCounter] = useState(true);
  const [showIsolated1, setShowIsolated1] = useState(false);
  const [showIsolated2, setShowIsolated2] = useState(false);
  const [showKeepAlive, setShowKeepAlive] = useState(false);

  return (
    <DemoLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          BlocGraphVisualizer Test
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Create and interact with Bloc instances to see them visualized in real-time
        </p>
      </div>

      {/* Controls */}
      <div>
        <h2 className="text-lg font-bold mb-4">Instance Controls</h2>

        {/* Toggle buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => setShowCounter(!showCounter)}
            className={`w-full px-4 py-2 rounded font-medium ${
              showCounter
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {showCounter ? '✓ ' : ''}Counter Cubit (Shared)
          </button>

          <button
            onClick={() => setShowName(!showName)}
            className={`w-full px-4 py-2 rounded font-medium ${
              showName
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {showName ? '✓ ' : ''}Name Cubit (Shared)
          </button>

          <button
            onClick={() => setShowBlocCounter(!showBlocCounter)}
            className={`w-full px-4 py-2 rounded font-medium ${
              showBlocCounter
                ? 'bg-purple-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {showBlocCounter ? '✓ ' : ''}Counter Bloc (Event-Driven)
          </button>

          <button
            onClick={() => setShowIsolated1(!showIsolated1)}
            className={`w-full px-4 py-2 rounded font-medium ${
              showIsolated1
                ? 'bg-orange-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {showIsolated1 ? '✓ ' : ''}Isolated Counter #1
          </button>

          <button
            onClick={() => setShowIsolated2(!showIsolated2)}
            className={`w-full px-4 py-2 rounded font-medium ${
              showIsolated2
                ? 'bg-orange-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {showIsolated2 ? '✓ ' : ''}Isolated Counter #2
          </button>

          <button
            onClick={() => setShowKeepAlive(!showKeepAlive)}
            className={`w-full px-4 py-2 rounded font-medium ${
              showKeepAlive
                ? 'bg-violet-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {showKeepAlive ? '✓ ' : ''}Keep-Alive Counter
          </button>
        </div>

        {/* Active components */}
        <h2 className="text-lg font-bold mb-4 mt-6">Active Instances</h2>
        <div className="space-y-3">
          {showCounter && <CounterDisplay />}
          {showName && <NameDisplay />}
          {showBlocCounter && <BlocCounterDisplay />}
          {showIsolated1 && <IsolatedCounterDisplay />}
          {showIsolated2 && <IsolatedCounterDisplay />}
          {showKeepAlive && <KeepAliveCounterDisplay />}
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
          <h3 className="font-bold mb-2">Instructions:</h3>
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li>Toggle instances on/off to see them appear/disappear</li>
            <li>Interact with controls to see state updates</li>
            <li>Notice how isolated instances create separate nodes</li>
            <li>Keep-alive persists even when toggled off</li>
            <li>Expand nodes in the graph to see detailed state</li>
          </ul>
        </div>
      </div>
    </DemoLayout>
  );
}
