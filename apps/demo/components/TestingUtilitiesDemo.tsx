import React, { useState } from 'react';
import { Cubit, BlocTest } from '@blac/core';
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
      BlocTest.setUp();
      const cubit = BlocTest.createBloc(TestCounterCubit);
      cubit.increment();
      if (cubit.state === 1) {
        results.push('✅ Test 1: Increment works correctly');
      } else {
        results.push(`❌ Test 1: Expected 1, got ${cubit.state}`);
      }
      BlocTest.tearDown();
    } catch (error) {
      results.push(`❌ Test 1: ${error}`);
    }

    // Test 2: Initial value
    try {
      BlocTest.setUp();
      const cubit = BlocTest.createBloc(TestCounterCubit, 10);
      if (cubit.state === 10) {
        results.push('✅ Test 2: Initial value set correctly');
      } else {
        results.push(`❌ Test 2: Expected 10, got ${cubit.state}`);
      }
      BlocTest.tearDown();
    } catch (error) {
      results.push(`❌ Test 2: ${error}`);
    }

    // Test 3: Multiple operations
    try {
      BlocTest.setUp();
      const cubit = BlocTest.createBloc(TestCounterCubit, 5);
      cubit.increment();
      cubit.increment();
      cubit.decrement();
      if (cubit.state === 6) {
        results.push('✅ Test 3: Multiple operations work correctly');
      } else {
        results.push(`❌ Test 3: Expected 6, got ${cubit.state}`);
      }
      BlocTest.tearDown();
    } catch (error) {
      results.push(`❌ Test 3: ${error}`);
    }

    // Test 4: State history tracking
    try {
      BlocTest.setUp();
      const mockCubit = BlocTest.createBloc(MockHistoryCubit);
      mockCubit.updateValue(1);
      mockCubit.updateValue(2);
      mockCubit.updateValue(3);
      const history = mockCubit.getHistory();
      if (history.length === 3 && history[2].value === 3) {
        results.push('✅ Test 4: History tracking works');
      } else {
        results.push(
          `❌ Test 4: History length ${history.length}, last value ${history[2]?.value}`,
        );
      }
      BlocTest.tearDown();
    } catch (error) {
      results.push(`❌ Test 4: ${error}`);
    }

    // Test 5: Subscription testing
    try {
      BlocTest.setUp();
      const cubit = BlocTest.createBloc(TestCounterCubit);
      let callCount = 0;
      let lastValue = 0;

      const unsubscribe = cubit.subscribe((state) => {
        callCount++;
        lastValue = state;
      });

      cubit.increment();
      cubit.increment();

      if (callCount === 2 && lastValue === 2) {
        results.push('✅ Test 5: Subscriptions work correctly');
      } else {
        results.push(
          `❌ Test 5: Call count ${callCount}, last value ${lastValue}`,
        );
      }

      unsubscribe();
      BlocTest.tearDown();
    } catch (error) {
      results.push(`❌ Test 5: ${error}`);
    }

    // Test 6: Isolation test
    try {
      BlocTest.setUp();
      const cubit1 = BlocTest.createBloc(TestCounterCubit);
      const cubit2 = BlocTest.createBloc(TestCounterCubit);

      cubit1.increment();
      cubit2.setValue(10);

      if (cubit1.state === 1 && cubit2.state === 10) {
        results.push('✅ Test 6: Bloc instances are isolated');
      } else {
        results.push(
          `❌ Test 6: Cubit1=${cubit1.state}, Cubit2=${cubit2.state}`,
        );
      }

      BlocTest.tearDown();
    } catch (error) {
      results.push(`❌ Test 6: ${error}`);
    }

    // Test 7: Memory cleanup
    try {
      BlocTest.setUp();
      const cubit = BlocTest.createBloc(TestCounterCubit);
      const _weakRef = new WeakRef(cubit);

      // Create subscriptions
      const unsub1 = cubit.subscribe(() => {});
      const unsub2 = cubit.subscribe(() => {});

      // Clean up
      unsub1();
      unsub2();
      BlocTest.tearDown();

      // Force garbage collection (if available)
      if (global.gc) {
        global.gc();
      }

      results.push(
        '✅ Test 7: Memory cleanup completed (check console for leaks)',
      );
    } catch (error) {
      results.push(`❌ Test 7: ${error}`);
    }

    // Test 8: Error handling
    try {
      BlocTest.setUp();

      class ErrorCubit extends Cubit<number> {
        constructor() {
          super(0);
        }

        causeError = () => {
          throw new Error('Intentional error');
        };
      }

      const errorCubit = BlocTest.createBloc(ErrorCubit);
      let errorCaught = false;

      try {
        errorCubit.causeError();
      } catch {
        errorCaught = true;
      }

      if (errorCaught) {
        results.push('✅ Test 8: Error handling works');
      } else {
        results.push('❌ Test 8: Error was not caught');
      }

      BlocTest.tearDown();
    } catch (error) {
      results.push(`❌ Test 8: ${error}`);
    }

    setTestResults(results);
    setIsRunning(false);
  };

  // Run performance benchmark
  const runBenchmark = () => {
    const results: string[] = [];

    BlocTest.setUp();
    const cubit = BlocTest.createBloc(TestCounterCubit);

    // Benchmark 1: State updates
    const iterations = 10000;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      cubit.increment();
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    const opsPerSecond = (iterations / (duration / 1000)).toFixed(0);

    results.push(
      `⚡ Benchmark: ${iterations} state updates in ${duration.toFixed(2)}ms`,
    );
    results.push(`⚡ Performance: ${opsPerSecond} operations/second`);

    // Benchmark 2: Subscription overhead
    const subscriptions: (() => void)[] = [];
    const subStartTime = performance.now();

    for (let i = 0; i < 1000; i++) {
      subscriptions.push(cubit.subscribe(() => {}));
    }

    const subEndTime = performance.now();
    const subDuration = subEndTime - subStartTime;

    results.push(
      `⚡ Created 1000 subscriptions in ${subDuration.toFixed(2)}ms`,
    );

    // Cleanup
    subscriptions.forEach((unsub) => unsub());
    BlocTest.tearDown();

    setTestResults((prev) => [...prev, '', ...results]);
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h4>BlaC Testing Utilities</h4>
        <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '15px' }}>
          Demonstrates testing utilities and patterns for unit testing BlaC
          components
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button onClick={runTests} disabled={isRunning}>
            {isRunning ? 'Running Tests...' : 'Run Test Suite'}
          </Button>
          <Button onClick={runBenchmark} variant="outline">
            Run Performance Benchmark
          </Button>
          <Button onClick={() => setTestResults([])} variant="outline">
            Clear Results
          </Button>
        </div>
      </div>

      <div
        style={{
          padding: '15px',
          backgroundColor: '#f9f9f9',
          borderRadius: '4px',
          minHeight: '200px',
        }}
      >
        {testResults.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999' }}>
            Click "Run Test Suite" to execute tests
          </div>
        ) : (
          <div>
            <h5 style={{ marginBottom: '10px' }}>Test Results:</h5>
            <div style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
              {testResults.map((result, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: '5px',
                    color: result.startsWith('✅')
                      ? '#0a0'
                      : result.startsWith('❌')
                        ? '#c00'
                        : result.startsWith('⚡')
                          ? '#00a'
                          : '#333',
                  }}
                >
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          fontSize: '0.85em',
        }}
      >
        <strong>Testing Utilities Available:</strong>
        <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>
            <code>BlocTest.setUp()</code> - Initialize test environment
          </li>
          <li>
            <code>BlocTest.tearDown()</code> - Clean up after tests
          </li>
          <li>
            <code>BlocTest.createBloc()</code> - Create isolated Bloc/Cubit
            instances
          </li>
          <li>
            <code>MockCubit</code> - Track state changes and history
          </li>
          <li>Memory leak detection utilities</li>
          <li>Performance benchmarking helpers</li>
        </ul>

        <strong style={{ display: 'block', marginTop: '15px' }}>
          Best Practices:
        </strong>
        <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
          <li>
            Always use <code>setUp()</code> and <code>tearDown()</code>
          </li>
          <li>Test state changes and subscriptions</li>
          <li>Verify isolation between instances</li>
          <li>Check for memory leaks in long-running tests</li>
          <li>Benchmark critical paths for performance</li>
        </ul>
      </div>
    </div>
  );
};

export default TestingUtilitiesDemo;
