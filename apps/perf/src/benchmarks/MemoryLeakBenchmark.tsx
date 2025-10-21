import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import React, { useState } from 'react';
import {
  PerformanceMetrics,
  BenchmarkResult,
} from '../utils/PerformanceMetrics';

/**
 * Test memory leaks with mount/unmount cycles
 * This tests if BlaC properly cleans up subscriptions and prevents memory leaks
 */

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
}

class IsolatedCounterCubit extends Cubit<number> {
  static isolated = true;

  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

const CounterComponent: React.FC = () => {
  const [count, { increment }] = useBloc(CounterCubit);
  return (
    <div style={{ padding: '4px', border: '1px solid #ccc', margin: '2px' }}>
      <span>Count: {count}</span>
      <button onClick={increment}>+</button>
    </div>
  );
};

const IsolatedCounterComponent: React.FC = () => {
  const [count, { increment }] = useBloc(IsolatedCounterCubit);
  return (
    <div style={{ padding: '4px', border: '1px solid #ccc', margin: '2px' }}>
      <span>Isolated: {count}</span>
      <button onClick={increment}>+</button>
    </div>
  );
};

export const MemoryLeakBenchmark: React.FC = () => {
  const [componentCount, setComponentCount] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [useIsolated, setUseIsolated] = useState(false);

  const Component = useIsolated ? IsolatedCounterComponent : CounterComponent;

  const runCycle = async () => {
    setIsRunning(true);
    PerformanceMetrics.clearResults();

    const cyclesToRun = 10;
    const componentsPerCycle = 100;

    for (let i = 0; i < cyclesToRun; i++) {
      // Mount
      PerformanceMetrics.start(`mount-${i}`);
      setComponentCount(componentsPerCycle);
      await PerformanceMetrics.nextFrame();
      await PerformanceMetrics.nextFrame(); // Wait for React to finish
      PerformanceMetrics.end(`mount-${i}`);

      // Unmount
      PerformanceMetrics.start(`unmount-${i}`);
      setComponentCount(0);
      await PerformanceMetrics.nextFrame();
      await PerformanceMetrics.nextFrame(); // Wait for cleanup
      PerformanceMetrics.end(`unmount-${i}`);

      setCycles(i + 1);
    }

    setResults(PerformanceMetrics.getResults());
    setIsRunning(false);
  };

  const mountMany = () => {
    const count = 1000;
    PerformanceMetrics.measure('mount-many', () => {
      setComponentCount(count);
    });
    setTimeout(() => {
      setResults(PerformanceMetrics.getResults());
    }, 100);
  };

  const unmountAll = () => {
    PerformanceMetrics.measure('unmount-all', () => {
      setComponentCount(0);
    });
    setTimeout(() => {
      setResults(PerformanceMetrics.getResults());
    }, 100);
  };

  const memory = PerformanceMetrics.getMemoryUsage();

  return (
    <div style={{ padding: '20px' }}>
      <h2>Memory Leak Detection</h2>
      <p>
        Tests mount/unmount cycles to detect memory leaks in BlaC subscriptions
        and React integration.
      </p>

      <div
        style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5' }}
      >
        <h3>Current Memory Usage</h3>
        {memory ? (
          <div>
            <div>
              Used: {PerformanceMetrics.formatBytes(memory.usedJSHeapSize)}
            </div>
            <div>
              Total: {PerformanceMetrics.formatBytes(memory.totalJSHeapSize)}
            </div>
            <div>
              Limit: {PerformanceMetrics.formatBytes(memory.jsHeapSizeLimit)}
            </div>
          </div>
        ) : (
          <div>Memory API not available (Chrome/Edge only)</div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px' }}>
          <input
            type="checkbox"
            checked={useIsolated}
            onChange={(e) => setUseIsolated(e.target.checked)}
          />
          Use Isolated Blocs
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={runCycle}
          disabled={isRunning}
          style={{ marginRight: '10px', padding: '10px 20px' }}
        >
          Run 10 Mount/Unmount Cycles (100 components each)
        </button>
        <button
          onClick={mountMany}
          disabled={isRunning}
          style={{ marginRight: '10px', padding: '10px 20px' }}
        >
          Mount 1000 Components
        </button>
        <button
          onClick={unmountAll}
          disabled={isRunning}
          style={{ padding: '10px 20px' }}
        >
          Unmount All
        </button>
      </div>

      {isRunning && <div>Running... Cycle {cycles}/10</div>}

      <div style={{ marginBottom: '20px' }}>
        <strong>Active Components: {componentCount}</strong>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '4px',
          marginBottom: '20px',
        }}
      >
        {Array.from({ length: componentCount }, (_, i) => (
          <Component key={i} />
        ))}
      </div>

      {results.length > 0 && (
        <div>
          <h3>Results</h3>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #ddd',
            }}
          >
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>
                  Operation
                </th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>
                  Duration
                </th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>
                  Memory Delta
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, i) => (
                <tr key={i}>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    {result.name}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    {PerformanceMetrics.formatDuration(result.duration)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    {result.memoryDelta
                      ? PerformanceMetrics.formatBytes(result.memoryDelta)
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
