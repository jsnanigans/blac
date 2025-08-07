import React, { useState } from 'react';
import { Cubit, Blac } from '@blac/core';
import { Button } from './ui/Button';

// Sample Cubit for testing
class TestCounterCubit extends Cubit<number> {
  constructor(initial: number = 0) {
    super(initial);
  }

  increment = () => this.emit(this.state + 1);
  decrement = () => this.emit(this.state - 1);
  setValue = (value: number) => this.emit(value);
}

// Mock Cubit for testing with history
class MockHistoryCubit extends Cubit<{ value: number; timestamp: number }> {
  history: Array<{ value: number; timestamp: number }> = [];

  constructor() {
    super({ value: 0, timestamp: Date.now() });
  }

  updateValue = (value: number) => {
    const newState = { value, timestamp: Date.now() };
    this.history.push(newState);
    this.emit(newState);
  };

  getHistory = () => this.history;
  clearHistory = () => {
    this.history = [];
  };
}

const TestingUtilitiesDemo: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Run a suite of tests
  const runTests = async () => {
    setIsRunning(true);
    const results: string[] = [];

    // Test 1: Basic state management
    try {
      Blac.resetInstance();
      Blac.enableLog = false;
      const cubit = new TestCounterCubit();
      Blac.activateBloc(cubit as any);
      cubit.increment();
      if (cubit.state === 1) {
        results.push('✅ Test 1: Basic state management - PASSED');
      } else {
        results.push('❌ Test 1: Basic state management - FAILED');
      }
      Blac.resetInstance();
    } catch (error) {
      results.push(`❌ Test 1: Error - ${error}`);
    }

    // Test 2: Initial state
    try {
      Blac.resetInstance();
      Blac.enableLog = false;
      const cubit = new TestCounterCubit(10);
      Blac.activateBloc(cubit as any);
      if (cubit.state === 10) {
        results.push('✅ Test 2: Initial state - PASSED');
      } else {
        results.push('❌ Test 2: Initial state - FAILED');
      }
      Blac.resetInstance();
    } catch (error) {
      results.push(`❌ Test 2: Error - ${error}`);
    }

    // Test 3: Multiple operations
    try {
      Blac.resetInstance();
      Blac.enableLog = false;
      const cubit = new TestCounterCubit(5);
      Blac.activateBloc(cubit as any);
      cubit.increment();
      cubit.increment();
      cubit.decrement();
      if (cubit.state === 6) {
        results.push('✅ Test 3: Multiple operations - PASSED');
      } else {
        results.push('❌ Test 3: Multiple operations - FAILED');
      }
      Blac.resetInstance();
    } catch (error) {
      results.push(`❌ Test 3: Error - ${error}`);
    }

    // Test 4: Mock with history
    try {
      Blac.resetInstance();
      Blac.enableLog = false;
      const mockCubit = new MockHistoryCubit();
      Blac.activateBloc(mockCubit as any);
      mockCubit.updateValue(10);
      mockCubit.updateValue(20);
      mockCubit.updateValue(30);
      const history = mockCubit.getHistory();
      if (history.length === 3 && mockCubit.state.value === 30) {
        results.push('✅ Test 4: Mock with history - PASSED');
      } else {
        results.push('❌ Test 4: Mock with history - FAILED');
      }
      Blac.resetInstance();
    } catch (error) {
      results.push(`❌ Test 4: Error - ${error}`);
    }

    // Test 5: Subscription testing
    try {
      Blac.resetInstance();
      Blac.enableLog = false;
      const cubit = new TestCounterCubit();
      Blac.activateBloc(cubit as any);
      let callCount = 0;
      const unsubscribe = cubit.subscribe(() => {
        callCount++;
      });
      cubit.increment();
      cubit.increment();
      unsubscribe();
      cubit.increment(); // Should not trigger callback
      if (callCount === 2) {
        results.push('✅ Test 5: Subscription testing - PASSED');
      } else {
        results.push('❌ Test 5: Subscription testing - FAILED');
      }
      Blac.resetInstance();
    } catch (error) {
      results.push(`❌ Test 5: Error - ${error}`);
    }

    // Test 6: Isolated instances
    try {
      Blac.resetInstance();
      Blac.enableLog = false;
      const cubit1 = new TestCounterCubit();
      const cubit2 = new TestCounterCubit();
      Blac.activateBloc(cubit1 as any);
      Blac.activateBloc(cubit2 as any);
      cubit1.increment();
      if (cubit1.state === 1 && cubit2.state === 0) {
        results.push('✅ Test 6: Isolated instances - PASSED');
      } else {
        results.push('❌ Test 6: Isolated instances - FAILED');
      }
      Blac.resetInstance();
    } catch (error) {
      results.push(`❌ Test 6: Error - ${error}`);
    }

    // Test 7: State transitions
    try {
      Blac.resetInstance();
      Blac.enableLog = false;
      const cubit = new TestCounterCubit();
      Blac.activateBloc(cubit as any);
      const states: number[] = [];
      cubit.subscribe((state: number) => states.push(state));
      cubit.setValue(5);
      cubit.setValue(10);
      cubit.setValue(15);
      if (states.length === 3 && states[2] === 15) {
        results.push('✅ Test 7: State transitions - PASSED');
      } else {
        results.push('❌ Test 7: State transitions - FAILED');
      }
      Blac.resetInstance();
    } catch (error) {
      results.push(`❌ Test 7: Error - ${error}`);
    }

    // Test 8: Error handling
    class ErrorCubit extends Cubit<number> {
      constructor() {
        super(0);
      }
      throwError = () => {
        throw new Error('Test error');
      };
    }

    try {
      Blac.resetInstance();
      Blac.enableLog = false;
      const errorCubit = new ErrorCubit();
      Blac.activateBloc(errorCubit as any);
      let errorCaught = false;
      try {
        errorCubit.throwError();
      } catch {
        errorCaught = true;
      }
      if (errorCaught) {
        results.push('✅ Test 8: Error handling - PASSED');
      } else {
        results.push('❌ Test 8: Error handling - FAILED');
      }
      Blac.resetInstance();
    } catch (error) {
      results.push(`❌ Test 8: Error - ${error}`);
    }

    setTestResults(results);
    setIsRunning(false);
  };

  // Performance benchmark
  const runBenchmark = () => {
    Blac.resetInstance();
    Blac.enableLog = false;
    const cubit = new TestCounterCubit();
    Blac.activateBloc(cubit as any);

    const iterations = 10000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      cubit.increment();
    }

    const end = performance.now();
    const duration = end - start;
    const opsPerSecond = (iterations / (duration / 1000)).toFixed(0);

    setTestResults([
      `⚡ Performance Benchmark:`,
      `   Iterations: ${iterations.toLocaleString()}`,
      `   Duration: ${duration.toFixed(2)}ms`,
      `   Operations/sec: ${Number(opsPerSecond).toLocaleString()}`,
      `   Final state: ${cubit.state}`,
    ]);

    Blac.resetInstance();
  };

  // Memory leak detection simulation
  const checkMemoryLeaks = () => {
    const results: string[] = ['🔍 Memory Leak Detection:'];

    // Create and dispose multiple cubits
    for (let i = 0; i < 100; i++) {
      Blac.resetInstance();
      const cubit = new TestCounterCubit();
      Blac.activateBloc(cubit as any);
      const unsub = cubit.subscribe(() => {});
      unsub();
    }

    // Check if instances are properly cleaned up
    // Note: WeakRef is used for memory leak detection in real scenarios
    // but requires manual GC to verify cleanup

    // Force garbage collection (note: this is just a simulation)
    results.push('   ✅ Created 100 cubits');
    results.push('   ✅ All subscriptions cleaned up');
    results.push('   ✅ Memory leak detection simulated');
    results.push('   ℹ️  Manual GC required to verify cleanup');

    setTestResults(results);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Testing Utilities</h2>

      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Test Utilities</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Blac provides utilities for testing your state management logic.
        </p>
        <ul className="space-y-2 text-sm">
          <li>
            <code>Blac.resetInstance()</code> - Initialize test environment
          </li>
          <li>
            <code>Blac.enableLog = false</code> - Disable logging in tests
          </li>
          <li>
            <code>Blac.getBloc()</code> - Create/get Bloc/Cubit instances
          </li>
          <li>
            <code>Blac.activateBloc()</code> - Activate isolated instances
          </li>
        </ul>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runTests} disabled={isRunning}>
            {isRunning ? 'Running Tests...' : 'Run Test Suite'}
          </Button>
          <Button onClick={runBenchmark} variant="secondary">
            Run Benchmark
          </Button>
          <Button onClick={checkMemoryLeaks} variant="secondary">
            Check Memory
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h4 className="font-semibold mb-2">Test Results:</h4>
            <div className="space-y-1 font-mono text-sm">
              {testResults.map((result, index) => (
                <div key={index}>{result}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Testing Best Practices</h3>
        <ul className="space-y-2 text-sm">
          <li>
            • Always call <code>Blac.resetInstance()</code> in beforeEach
          </li>
          <li>
            • Use <code>Blac.enableLog = false</code> to reduce test noise
          </li>
          <li>• Clean up subscriptions to prevent memory leaks</li>
          <li>• Test state transitions, not implementation details</li>
          <li>• Use mocks for external dependencies</li>
          <li>• Verify error handling and edge cases</li>
        </ul>
      </div>
    </div>
  );
};

export default TestingUtilitiesDemo;
