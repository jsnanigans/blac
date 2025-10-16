import { Cubit, Blac } from '@blac/core';
import { useBloc } from '@blac/react';
import React, { useState } from 'react';
import { PerformanceMetrics, BenchmarkResult } from '../utils/PerformanceMetrics';

/**
 * Test proxy-based dependency tracking performance
 * Compares performance with and without dependency tracking
 */

interface ComplexState {
  counter: number;
  user: {
    name: string;
    email: string;
    preferences: {
      theme: string;
      notifications: boolean;
    };
  };
  items: Array<{ id: number; name: string; value: number }>;
  metadata: {
    lastUpdated: number;
    version: number;
  };
}

class ComplexStateCubit extends Cubit<ComplexState> {
  constructor() {
    super({
      counter: 0,
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        preferences: {
          theme: 'light',
          notifications: true,
        },
      },
      items: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random() * 100,
      })),
      metadata: {
        lastUpdated: Date.now(),
        version: 1,
      },
    });
  }

  incrementCounter = () => {
    this.patch({
      counter: this.state.counter + 1,
      metadata: {
        ...this.state.metadata,
        lastUpdated: Date.now(),
      },
    });
  };

  updateUserName = (name: string) => {
    this.patch({
      user: {
        ...this.state.user,
        name,
      },
      metadata: {
        ...this.state.metadata,
        lastUpdated: Date.now(),
      },
    });
  };

  toggleTheme = () => {
    this.patch({
      user: {
        ...this.state.user,
        preferences: {
          ...this.state.user.preferences,
          theme: this.state.user.preferences.theme === 'light' ? 'dark' : 'light',
        },
      },
      metadata: {
        ...this.state.metadata,
        lastUpdated: Date.now(),
      },
    });
  };

  updateItemValue = (id: number) => {
    this.patch({
      items: this.state.items.map((item) =>
        item.id === id ? { ...item, value: Math.random() * 100 } : item
      ),
      metadata: {
        ...this.state.metadata,
        lastUpdated: Date.now(),
      },
    });
  };
}

// Component that only reads counter (should not re-render on other changes with proxy tracking)
const CounterDisplay: React.FC<{ renderCount: React.MutableRefObject<number> }> = ({
  renderCount,
}) => {
  const [state] = useBloc(ComplexStateCubit);
  renderCount.current++;

  return (
    <div style={{ padding: '10px', border: '1px solid blue', margin: '5px' }}>
      <div>Counter: {state.counter}</div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        Renders: {renderCount.current}
      </div>
    </div>
  );
};

// Component that only reads user name (should not re-render on counter changes with proxy tracking)
const UserNameDisplay: React.FC<{ renderCount: React.MutableRefObject<number> }> = ({
  renderCount,
}) => {
  const [state] = useBloc(ComplexStateCubit);
  renderCount.current++;

  return (
    <div style={{ padding: '10px', border: '1px solid green', margin: '5px' }}>
      <div>User: {state.user.name}</div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        Renders: {renderCount.current}
      </div>
    </div>
  );
};

// Component that only reads theme (should not re-render on counter/name changes with proxy tracking)
const ThemeDisplay: React.FC<{ renderCount: React.MutableRefObject<number> }> = ({
  renderCount,
}) => {
  const [state] = useBloc(ComplexStateCubit);
  renderCount.current++;

  return (
    <div style={{ padding: '10px', border: '1px solid purple', margin: '5px' }}>
      <div>Theme: {state.user.preferences.theme}</div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        Renders: {renderCount.current}
      </div>
    </div>
  );
};

export const DependencyTrackingBenchmark: React.FC = () => {
  const [proxyEnabled, setProxyEnabled] = useState(
    Blac.getConfig().proxyDependencyTracking
  );
  const [results, setResults] = useState<BenchmarkResult[]>([]);

  const counterRenderCount = React.useRef(0);
  const userNameRenderCount = React.useRef(0);
  const themeRenderCount = React.useRef(0);

  const [, { incrementCounter, updateUserName, toggleTheme, updateItemValue }] =
    useBloc(ComplexStateCubit);

  const toggleProxy = () => {
    const newValue = !proxyEnabled;
    Blac.setConfig({ proxyDependencyTracking: newValue });
    setProxyEnabled(newValue);
    // Force re-mount to apply new config
    window.location.reload();
  };

  const resetRenderCounts = () => {
    counterRenderCount.current = 0;
    userNameRenderCount.current = 0;
    themeRenderCount.current = 0;
  };

  const runBenchmark = () => {
    resetRenderCounts();
    PerformanceMetrics.clearResults();

    // Benchmark counter updates
    const counterResult = PerformanceMetrics.benchmark(
      'Counter Updates (100x)',
      () => {
        incrementCounter();
      },
      100
    );

    setTimeout(() => {
      const currentResults = [
        counterResult,
        {
          name: 'Counter Component Renders',
          duration: 0,
          timestamp: Date.now(),
          iterations: counterRenderCount.current,
        } as BenchmarkResult,
        {
          name: 'UserName Component Renders',
          duration: 0,
          timestamp: Date.now(),
          iterations: userNameRenderCount.current,
        } as BenchmarkResult,
        {
          name: 'Theme Component Renders',
          duration: 0,
          timestamp: Date.now(),
          iterations: themeRenderCount.current,
        } as BenchmarkResult,
      ];

      setResults(currentResults);
    }, 500);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Dependency Tracking Performance</h2>
      <p>
        Tests the proxy-based dependency tracking. With tracking enabled, components should
        only re-render when their accessed properties change.
      </p>

      <div style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5' }}>
        <h3>Configuration</h3>
        <label>
          <input
            type="checkbox"
            checked={proxyEnabled}
            onChange={toggleProxy}
            style={{ marginRight: '10px' }}
          />
          Proxy Dependency Tracking Enabled
        </label>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          Note: Toggling this will reload the page
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={runBenchmark}
          style={{ marginRight: '10px', padding: '10px 20px' }}
        >
          Run Benchmark
        </button>
        <button onClick={resetRenderCounts} style={{ padding: '10px 20px' }}>
          Reset Render Counts
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Test Components</h3>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
          Each component reads different parts of the state. With proxy tracking, they should
          only re-render when their specific data changes.
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <CounterDisplay renderCount={counterRenderCount} />
          <UserNameDisplay renderCount={userNameRenderCount} />
          <ThemeDisplay renderCount={themeRenderCount} />
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Manual Tests</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={incrementCounter} style={{ padding: '8px 16px' }}>
            Increment Counter (should only update Counter component)
          </button>
          <button
            onClick={() => updateUserName('Jane Doe')}
            style={{ padding: '8px 16px' }}
          >
            Update User Name (should only update UserName component)
          </button>
          <button onClick={toggleTheme} style={{ padding: '8px 16px' }}>
            Toggle Theme (should only update Theme component)
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div>
          <h3>Benchmark Results</h3>
          <div
            style={{
              marginBottom: '10px',
              padding: '10px',
              background: proxyEnabled ? '#d4edda' : '#f8d7da',
            }}
          >
            <strong>Proxy Tracking: {proxyEnabled ? 'ENABLED' : 'DISABLED'}</strong>
            {proxyEnabled ? (
              <div style={{ fontSize: '12px', marginTop: '5px' }}>
                ✓ Components should only re-render when their accessed properties change
              </div>
            ) : (
              <div style={{ fontSize: '12px', marginTop: '5px' }}>
                ✗ All components will re-render on any state change
              </div>
            )}
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
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Metric</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Value</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Expected</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, i) => {
                let expected = '';
                if (result.name.includes('Counter Component')) {
                  expected = proxyEnabled ? '~100' : '~100';
                } else if (result.name.includes('UserName Component')) {
                  expected = proxyEnabled ? '0' : '~100';
                } else if (result.name.includes('Theme Component')) {
                  expected = proxyEnabled ? '0' : '~100';
                }

                return (
                  <tr key={i}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      {result.name}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      {result.duration > 0
                        ? PerformanceMetrics.formatDuration(result.avgDuration || 0)
                        : result.iterations || 0}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      {expected}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
