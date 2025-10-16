import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import React, { useState, useEffect } from 'react';
import { PerformanceMetrics, BenchmarkResult } from '../utils/PerformanceMetrics';

/**
 * Test concurrent updates from multiple components
 * Stresses the subscription system and re-render batching
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

  reset = () => {
    this.emit(0);
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

const SharedCounterComponent: React.FC<{ id: number }> = ({ id }) => {
  const [count, { increment }] = useBloc(CounterCubit);
  const renderCount = React.useRef(0);
  renderCount.current++;

  return (
    <div
      style={{
        padding: '8px',
        border: '1px solid #ccc',
        margin: '2px',
        fontSize: '11px',
      }}
    >
      <div>#{id} Count: {count}</div>
      <div style={{ color: '#666' }}>Renders: {renderCount.current}</div>
      <button onClick={increment} style={{ fontSize: '10px', padding: '2px 4px' }}>
        +
      </button>
    </div>
  );
};

const IsolatedCounterComponent: React.FC<{ id: number }> = ({ id }) => {
  const [count, { increment }] = useBloc(IsolatedCounterCubit);
  const renderCount = React.useRef(0);
  renderCount.current++;

  return (
    <div
      style={{
        padding: '8px',
        border: '1px solid #9c27b0',
        margin: '2px',
        fontSize: '11px',
      }}
    >
      <div>#{id} Isolated: {count}</div>
      <div style={{ color: '#666' }}>Renders: {renderCount.current}</div>
      <button onClick={increment} style={{ fontSize: '10px', padding: '2px 4px' }}>
        +
      </button>
    </div>
  );
};

const AutoIncrementComponent: React.FC<{
  id: number;
  interval: number;
  onUpdate: () => void;
}> = ({ id, interval, onUpdate }) => {
  const [count, { increment }] = useBloc(CounterCubit);

  useEffect(() => {
    const timer = setInterval(() => {
      increment();
      onUpdate();
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return (
    <div
      style={{
        padding: '8px',
        border: '2px solid #4caf50',
        margin: '2px',
        fontSize: '11px',
        background: '#f1f8f4',
      }}
    >
      <div>Auto #{id}</div>
      <div>Count: {count}</div>
    </div>
  );
};

export const ConcurrentUpdatesBenchmark: React.FC = () => {
  const [componentCount, setComponentCount] = useState(10);
  const [useIsolated, setUseIsolated] = useState(false);
  const [autoUpdateCount, setAutoUpdateCount] = useState(0);
  const [autoUpdateInterval, setAutoUpdateInterval] = useState(100);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [updateCounter, setUpdateCounter] = useState(0);

  const [count, { increment, reset }] = useBloc(CounterCubit);

  const Component = useIsolated ? IsolatedCounterComponent : SharedCounterComponent;

  const runSimultaneousUpdates = () => {
    PerformanceMetrics.clearResults();

    const result = PerformanceMetrics.measure('Simultaneous Updates', () => {
      // Trigger multiple updates rapidly
      for (let i = 0; i < 100; i++) {
        increment();
      }
    });

    setTimeout(() => {
      setResults([result.metrics]);
    }, 100);
  };

  const runRapidFireUpdates = async () => {
    PerformanceMetrics.clearResults();

    PerformanceMetrics.start('Rapid Fire Updates (1000x with RAF)');

    for (let i = 0; i < 1000; i++) {
      increment();
      if (i % 50 === 0) {
        await PerformanceMetrics.nextFrame();
      }
    }

    const result = PerformanceMetrics.end('Rapid Fire Updates (1000x with RAF)');
    setResults([result]);
  };

  const handleUpdate = () => {
    setUpdateCounter((prev) => prev + 1);
  };

  const startAutoUpdates = () => {
    setIsAutoRunning(true);
    PerformanceMetrics.start('Auto Updates');
  };

  const stopAutoUpdates = () => {
    setIsAutoRunning(false);
    const result = PerformanceMetrics.end('Auto Updates');
    setResults((prev) => [...prev, result]);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Concurrent Updates Performance</h2>
      <p>
        Tests how BlaC handles many components updating simultaneously. Measures batching,
        subscription performance, and re-render optimization.
      </p>

      <div style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5' }}>
        <h3>Shared State</h3>
        <div>Global Counter: {count}</div>
        <div>Total Updates: {updateCounter}</div>
        <button onClick={reset} style={{ marginTop: '10px', padding: '5px 10px' }}>
          Reset Counter
        </button>
      </div>

      <div style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5' }}>
        <h3>Configuration</h3>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ marginRight: '20px' }}>
            Component Count:{' '}
            <input
              type="number"
              value={componentCount}
              onChange={(e) => setComponentCount(parseInt(e.target.value, 10))}
              min="1"
              max="500"
              style={{ width: '80px', marginLeft: '5px' }}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={useIsolated}
              onChange={(e) => setUseIsolated(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Use Isolated Blocs
          </label>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Manual Benchmarks</h3>
        <button
          onClick={runSimultaneousUpdates}
          style={{ marginRight: '10px', padding: '10px 20px' }}
        >
          100 Simultaneous Updates
        </button>
        <button
          onClick={runRapidFireUpdates}
          style={{ marginRight: '10px', padding: '10px 20px' }}
        >
          1000 Rapid Fire Updates (with RAF)
        </button>
      </div>

      <div style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5' }}>
        <h3>Auto-Update Test</h3>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ marginRight: '20px' }}>
            Auto-Update Components:{' '}
            <input
              type="number"
              value={autoUpdateCount}
              onChange={(e) => setAutoUpdateCount(parseInt(e.target.value, 10))}
              min="0"
              max="20"
              style={{ width: '80px', marginLeft: '5px' }}
            />
          </label>
          <label>
            Interval (ms):{' '}
            <input
              type="number"
              value={autoUpdateInterval}
              onChange={(e) => setAutoUpdateInterval(parseInt(e.target.value, 10))}
              min="10"
              max="1000"
              step="10"
              style={{ width: '80px', marginLeft: '5px' }}
            />
          </label>
        </div>
        <button
          onClick={isAutoRunning ? stopAutoUpdates : startAutoUpdates}
          style={{ padding: '10px 20px' }}
        >
          {isAutoRunning ? 'Stop Auto Updates' : 'Start Auto Updates'}
        </button>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          Creates components that automatically update at the specified interval
        </div>
      </div>

      <div
        style={{
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '4px',
          maxHeight: '400px',
          overflow: 'auto',
          border: '1px solid #ddd',
          padding: '10px',
        }}
      >
        {isAutoRunning &&
          Array.from({ length: autoUpdateCount }, (_, i) => (
            <AutoIncrementComponent
              key={`auto-${i}`}
              id={i}
              interval={autoUpdateInterval}
              onUpdate={handleUpdate}
            />
          ))}
        {Array.from({ length: componentCount }, (_, i) => (
          <Component key={`comp-${i}`} id={i} />
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
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Operation</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Duration</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>
                  Avg (if batched)
                </th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Memory Delta</th>
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
                    {result.avgDuration
                      ? PerformanceMetrics.formatDuration(result.avgDuration)
                      : '-'}
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
