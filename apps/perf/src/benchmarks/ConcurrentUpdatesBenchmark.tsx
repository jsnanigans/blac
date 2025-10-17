import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
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

  reset = () => {
    this.emit(0);
  };
}

interface ComponentHandle {
  increment: () => void;
  getRenderCount: () => number;
}

const SharedCounterComponent = forwardRef<ComponentHandle, { id: number }>(({ id }, ref) => {
  const [count, { increment }] = useBloc(CounterCubit);
  const renderCount = useRef(0);
  renderCount.current++;

  useImperativeHandle(ref, () => ({
    increment,
    getRenderCount: () => renderCount.current,
  }));

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
});

const IsolatedCounterComponent = forwardRef<ComponentHandle, { id: number }>(({ id }, ref) => {
  const [count, { increment }] = useBloc(IsolatedCounterCubit);
  const renderCount = useRef(0);
  renderCount.current++;

  useImperativeHandle(ref, () => ({
    increment,
    getRenderCount: () => renderCount.current,
  }));

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
});

export const ConcurrentUpdatesBenchmark: React.FC = () => {
  const [componentCount, setComponentCount] = useState(10);
  const [useIsolated, setUseIsolated] = useState(false);
  const [results, setResults] = useState<BenchmarkResult[]>([]);

  const componentRefs = useRef<(ComponentHandle | null)[]>([]);
  const [, forceUpdate] = useState(0);

  const [sharedCount, sharedCubit] = useBloc(CounterCubit);

  const Component = useIsolated ? IsolatedCounterComponent : SharedCounterComponent;

  // Update refs array when component count changes
  useEffect(() => {
    componentRefs.current = componentRefs.current.slice(0, componentCount);
  }, [componentCount]);

  const getTotalRenderCount = () => {
    return componentRefs.current.reduce(
      (sum, ref) => sum + (ref?.getRenderCount() || 0),
      0
    );
  };

  const resetAllRenderCounts = () => {
    // Force component re-mount to reset render counts
    forceUpdate((prev) => prev + 1);
  };

  const runSharedStateTest = async () => {
    PerformanceMetrics.clearResults();

    // Reset before test
    sharedCubit.reset();
    await PerformanceMetrics.nextFrame();

    const initialRenderCount = getTotalRenderCount();

    const result = PerformanceMetrics.measure(
      `Shared: ${componentCount} components, 100 updates`,
      () => {
        // Single state change that affects all N components
        for (let i = 0; i < 100; i++) {
          sharedCubit.increment();
        }
      }
    );

    setTimeout(() => {
      const finalRenderCount = getTotalRenderCount();
      const rendersDuringTest = finalRenderCount - initialRenderCount;

      setResults([
        result.metrics,
        {
          name: 'Total Component Re-renders',
          duration: 0,
          timestamp: Date.now(),
          iterations: rendersDuringTest,
        } as BenchmarkResult,
        {
          name: 'Expected Re-renders',
          duration: 0,
          timestamp: Date.now(),
          iterations: componentCount * 100, // N components × 100 updates
        } as BenchmarkResult,
      ]);
    }, 100);
  };

  const runIsolatedStateTest = async () => {
    PerformanceMetrics.clearResults();

    const initialRenderCount = getTotalRenderCount();

    const result = PerformanceMetrics.measure(
      `Isolated: ${componentCount} components, 100 updates each`,
      () => {
        // Each component gets 100 updates to its own isolated state
        for (let i = 0; i < 100; i++) {
          componentRefs.current.forEach((ref) => {
            ref?.increment();
          });
        }
      }
    );

    setTimeout(() => {
      const finalRenderCount = getTotalRenderCount();
      const rendersDuringTest = finalRenderCount - initialRenderCount;

      setResults([
        result.metrics,
        {
          name: 'Total Component Re-renders',
          duration: 0,
          timestamp: Date.now(),
          iterations: rendersDuringTest,
        } as BenchmarkResult,
        {
          name: 'Expected Re-renders',
          duration: 0,
          timestamp: Date.now(),
          iterations: componentCount * 100, // N components × 100 updates each
        } as BenchmarkResult,
      ]);
    }, 100);
  };

  const runConcurrentTest = () => {
    if (useIsolated) {
      runIsolatedStateTest();
    } else {
      runSharedStateTest();
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Concurrent Updates Performance</h2>
      <p>
        Tests how BlaC handles many components updating simultaneously. Measures batching,
        subscription performance, and re-render optimization.
      </p>

      <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f7ff', borderLeft: '4px solid #2196f3' }}>
        <h3 style={{ marginTop: 0 }}>Understanding This Benchmark</h3>
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '10px' }}>
            <strong>Shared Mode:</strong> All {componentCount} components subscribe to ONE shared state.
            Each update triggers re-renders in all components (1 update → {componentCount} re-renders).
          </p>
          <p style={{ marginBottom: 0 }}>
            <strong>Isolated Mode:</strong> Each component has its OWN isolated state instance.
            Updates only affect the specific component (1 update → 1 re-render).
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5' }}>
        <h3>Configuration</h3>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ marginRight: '20px' }}>
            Component Count:{' '}
            <input
              type="number"
              value={componentCount}
              onChange={(e) => setComponentCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              min="1"
              max="100"
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
        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
          Current: {useIsolated ? 'Each component has its own state' : `All ${componentCount} components share one state`}
        </div>
      </div>

      {!useIsolated && (
        <div style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5' }}>
          <h3>Shared State</h3>
          <div>Global Counter: {sharedCount}</div>
          <button onClick={sharedCubit.reset} style={{ marginTop: '10px', padding: '5px 10px' }}>
            Reset Counter
          </button>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3>Benchmark</h3>
        <button
          onClick={runConcurrentTest}
          style={{ marginRight: '10px', padding: '10px 20px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Run Concurrent Update Test (100 updates)
        </button>
        <button
          onClick={resetAllRenderCounts}
          style={{ padding: '10px 20px', background: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Reset Render Counts
        </button>
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
        {Array.from({ length: componentCount }, (_, i) => (
          <Component
            key={`comp-${i}`}
            id={i}
            ref={(el) => {
              componentRefs.current[i] = el;
            }}
          />
        ))}
      </div>

      {results.length > 0 && (
        <div>
          <h3>Results</h3>
          <div style={{ marginBottom: '15px', padding: '12px', background: useIsolated ? '#f3e5f5' : '#e3f2fd', borderRadius: '4px' }}>
            <strong>Mode: {useIsolated ? 'Isolated' : 'Shared'}</strong>
            <div style={{ fontSize: '13px', marginTop: '5px', color: '#666' }}>
              {useIsolated
                ? `Each of ${componentCount} components received 100 updates to their own state`
                : `1 shared state received 100 updates, notifying ${componentCount} components`
              }
            </div>
          </div>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #ddd',
            }}
          >
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Metric</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Value</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, i) => {
                const isRenderMetric = result.name.includes('Re-renders');
                const actual = result.iterations || 0;
                const expected = results.find(r => r.name === 'Expected Re-renders')?.iterations || 0;
                const isActualRow = result.name === 'Total Component Re-renders';
                const renderEfficiency = isActualRow && expected > 0
                  ? ((actual / expected) * 100).toFixed(1)
                  : null;

                return (
                  <tr key={i}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      {result.name}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontFamily: 'monospace' }}>
                      {isRenderMetric
                        ? actual.toLocaleString()
                        : PerformanceMetrics.formatDuration(result.duration)}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', color: '#666' }}>
                      {isActualRow && renderEfficiency && (
                        <span style={{ color: actual === expected ? '#4caf50' : '#ff9800' }}>
                          {actual === expected ? '✓ Exact match' : `${renderEfficiency}% of expected`}
                        </span>
                      )}
                      {result.name.includes('Expected') && (
                        <span>Theoretical maximum with React batching</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ marginTop: '15px', padding: '12px', background: '#fff9e6', borderRadius: '4px', fontSize: '13px' }}>
            <strong>💡 Interpretation:</strong>
            <div style={{ marginTop: '5px', lineHeight: '1.6' }}>
              {useIsolated ? (
                <>
                  <div>• Isolated mode: Each component manages its own state independently</div>
                  <div>• Total work: {componentCount} × 100 = {componentCount * 100} state updates</div>
                  <div>• Each update only re-renders the specific component that changed</div>
                </>
              ) : (
                <>
                  <div>• Shared mode: All components subscribe to the same state</div>
                  <div>• Total work: 100 state updates to 1 shared cubit</div>
                  <div>• Each update potentially triggers {componentCount} component re-renders</div>
                  <div>• React batching may reduce actual re-renders from theoretical {componentCount * 100}</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
