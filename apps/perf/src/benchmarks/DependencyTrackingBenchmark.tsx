import { Cubit, Blac } from '@blac/core';
import { useBloc } from '@blac/react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PerformanceMetrics,
  BenchmarkResult,
} from '../utils/PerformanceMetrics';

/**
 * Test proxy-based dependency tracking performance
 */

interface FlatState {
  counter: number;
  userName: string;
  userEmail: string;
  theme: string;
  itemName: string;
  metadataVersion: number;
}

class FlatStateCubit extends Cubit<FlatState> {
  constructor() {
    super({
      counter: 0,
      userName: 'John Doe',
      userEmail: 'john@example.com',
      theme: 'light',
      itemName: 'Item 0',
      metadataVersion: 1,
    });
  }

  // Each method updates ONLY ONE top-level property
  incrementCounter = () => {
    this.patch({
      counter: this.state.counter + 1,
    });
  };

  updateUserName = (name: string) => {
    this.patch({
      userName: name,
    });
  };

  updateEmail = (email: string) => {
    this.patch({
      userEmail: email,
    });
  };

  toggleTheme = () => {
    this.patch({
      theme: this.state.theme === 'light' ? 'dark' : 'light',
    });
  };

  updateItemName = (name: string) => {
    this.patch({
      itemName: name,
    });
  };

  updateMetadata = () => {
    this.patch({
      metadataVersion: this.state.metadataVersion + 1,
    });
  };

  reset = () => {
    this.emit({
      counter: 0,
      userName: 'John Doe',
      userEmail: 'john@example.com',
      theme: 'light',
      itemName: 'Item 0',
      metadataVersion: 1,
    });
  };
}

interface ComponentProps {
  label: string;
  onRender: () => void;
}

// Component that only reads counter (TOP-LEVEL property)
const CounterDisplay: React.FC<ComponentProps> = React.memo(
  ({ label, onRender }) => {
    const [state] = useBloc(FlatStateCubit);
    const renderCount = useRef(0);
    renderCount.current++;

    useEffect(() => {
      onRender();
    });

    return (
      <div
        style={{
          padding: '12px',
          border: `2px solid #ccc`,
          margin: '5px',
          borderRadius: '4px',
          background: 'white',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{label}</div>
        <div>Counter: {state.counter}</div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
          Renders: {renderCount.current}
        </div>
      </div>
    );
  },
);

// Component that reads userName (TOP-LEVEL property)
const UserNameDisplay: React.FC<ComponentProps> = React.memo(
  ({ label, onRender }) => {
    const [state] = useBloc(FlatStateCubit);
    const renderCount = useRef(0);
    renderCount.current++;

    useEffect(() => {
      onRender();
    });

    return (
      <div
        style={{
          padding: '12px',
          border: `2px solid #ccc`,
          margin: '5px',
          borderRadius: '4px',
          background: 'white',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{label}</div>
        <div>User: {state.userName}</div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
          Renders: {renderCount.current}
        </div>
      </div>
    );
  },
);

// Component that reads userEmail (TOP-LEVEL property)
const EmailDisplay: React.FC<ComponentProps> = React.memo(
  ({ label, onRender }) => {
    const [state] = useBloc(FlatStateCubit);
    const renderCount = useRef(0);
    renderCount.current++;

    useEffect(() => {
      onRender();
    });

    return (
      <div
        style={{
          padding: '12px',
          border: `2px solid #ccc`,
          margin: '5px',
          borderRadius: '4px',
          background: 'white',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '12px' }}>Email: {state.userEmail}</div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
          Renders: {renderCount.current}
        </div>
      </div>
    );
  },
);

// Component that reads theme (TOP-LEVEL property)
const ThemeDisplay: React.FC<ComponentProps> = React.memo(
  ({ label, onRender }) => {
    const [state] = useBloc(FlatStateCubit);
    const renderCount = useRef(0);
    renderCount.current++;

    useEffect(() => {
      onRender();
    });

    return (
      <div
        style={{
          padding: '12px',
          border: `2px solid #ccc`,
          margin: '5px',
          borderRadius: '4px',
          background: 'white',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{label}</div>
        <div>Theme: {state.theme}</div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
          Renders: {renderCount.current}
        </div>
      </div>
    );
  },
);

// Component that reads itemName (TOP-LEVEL property)
const ItemDisplay: React.FC<ComponentProps> = React.memo(
  ({ label, onRender }) => {
    const [state] = useBloc(FlatStateCubit);
    const renderCount = useRef(0);
    renderCount.current++;

    useEffect(() => {
      onRender();
    });

    return (
      <div
        style={{
          padding: '12px',
          border: `2px solid #ccc`,
          margin: '5px',
          borderRadius: '4px',
          background: 'white',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '12px' }}>Item: {state.itemName}</div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
          Renders: {renderCount.current}
        </div>
      </div>
    );
  },
);

type TestScenario =
  | 'counter'
  | 'userName'
  | 'email'
  | 'theme'
  | 'item'
  | 'metadata';

interface ScenarioResult {
  name: string;
  action: string;
  expectedWithProxy: string[];
  expectedWithoutProxy: string[];
  actualRenders: string[];
  passed: boolean;
}

export const DependencyTrackingBenchmark: React.FC = () => {
  const [proxyEnabled] = useState(Blac.config.proxyDependencyTracking);
  const [componentKey, setComponentKey] = useState(0);
  const [scenarioResults, setScenarioResults] = useState<ScenarioResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const renderTracker = useRef<Map<string, number>>(new Map());

  const cubit = Blac.getBloc(FlatStateCubit);

  const trackRender = useCallback((componentName: string) => {
    const current = renderTracker.current.get(componentName) || 0;
    renderTracker.current.set(componentName, current + 1);
  }, []);

  const resetTracking = () => {
    renderTracker.current.clear();
    setComponentKey((k) => k + 1);
    setScenarioResults([]);
  };

  const getRenderCounts = () => {
    const components = ['Counter', 'UserName', 'Email', 'Theme', 'Item'];
    return components.map((name) => ({
      name,
      count: renderTracker.current.get(name) || 0,
    }));
  };

  const runScenario = async (scenario: TestScenario) => {
    // Clear previous renders for this test
    const beforeCounts = getRenderCounts();

    // Perform the action
    switch (scenario) {
      case 'counter':
        cubit.incrementCounter();
        break;
      case 'userName':
        cubit.updateUserName(`User ${Date.now()}`);
        break;
      case 'email':
        cubit.updateEmail(`user${Date.now()}@example.com`);
        break;
      case 'theme':
        cubit.toggleTheme();
        break;
      case 'item':
        cubit.updateItemName(`Item ${Date.now()}`);
        break;
      case 'metadata':
        cubit.updateMetadata();
        break;
    }

    // Wait for re-renders
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Calculate which components rendered
    const afterCounts = getRenderCounts();
    const rendered = afterCounts
      .filter((after, i) => after.count > beforeCounts[i].count)
      .map((c) => c.name);

    // Determine expected behavior
    // With proxy: only the component reading the changed top-level property should re-render
    const expectedWithProxy: Record<TestScenario, string[]> = {
      counter: ['Counter'],
      userName: ['UserName'],
      email: ['Email'],
      theme: ['Theme'],
      item: ['Item'],
      metadata: [], // No component reads metadataVersion
    };

    // Without proxy: ALL components re-render on ANY state change
    const expectedWithoutProxy: Record<TestScenario, string[]> = {
      counter: ['Counter', 'UserName', 'Email', 'Theme', 'Item'],
      userName: ['Counter', 'UserName', 'Email', 'Theme', 'Item'],
      email: ['Counter', 'UserName', 'Email', 'Theme', 'Item'],
      theme: ['Counter', 'UserName', 'Email', 'Theme', 'Item'],
      item: ['Counter', 'UserName', 'Email', 'Theme', 'Item'],
      metadata: ['Counter', 'UserName', 'Email', 'Theme', 'Item'],
    };

    const expected = proxyEnabled
      ? expectedWithProxy[scenario]
      : expectedWithoutProxy[scenario];

    const passed =
      expected.length === rendered.length &&
      expected.every((name) => rendered.includes(name));

    const scenarioNames: Record<TestScenario, string> = {
      counter: 'Update counter',
      userName: 'Update userName',
      email: 'Update userEmail',
      theme: 'Update theme',
      item: 'Update itemName',
      metadata: 'Update metadataVersion',
    };

    return {
      name: scenarioNames[scenario],
      action: scenario,
      expectedWithProxy: expectedWithProxy[scenario],
      expectedWithoutProxy: expectedWithoutProxy[scenario],
      actualRenders: rendered,
      passed,
    };
  };

  const runAllTests = async () => {
    setIsRunning(true);
    resetTracking();
    cubit.reset();

    await new Promise((resolve) => setTimeout(resolve, 200));

    const scenarios: TestScenario[] = [
      'counter',
      'userName',
      'email',
      'theme',
      'item',
      'metadata',
    ];
    const results: ScenarioResult[] = [];

    for (const scenario of scenarios) {
      const result = await runScenario(scenario);
      results.push(result);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    setScenarioResults(results);
    setIsRunning(false);
  };

  const passedTests = scenarioResults.filter((r) => r.passed).length;
  const totalTests = scenarioResults.length;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Dependency Tracking Performance</h2>
      <p>
        Tests proxy-based dependency tracking. Components should only re-render
        when their accessed properties change.
      </p>

      <div
        style={{
          marginBottom: '20px',
          padding: '15px',
          background: '#fff3cd',
          borderLeft: '4px solid #ffc107',
          borderRadius: '4px',
        }}
      >
        <div
          style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}
        >
          ⚠️ Important: Top-Level Tracking Only
        </div>
        <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
          <div>
            • BlaC's proxy tracking only works at the <strong>top level</strong>{' '}
            of state objects
          </div>
          <div>
            • Accessing <code>state.user.name</code> tracks{' '}
            <code>state.user</code> (the whole object)
          </div>
          <div>
            • This benchmark uses a <strong>flat state structure</strong> for
            accurate testing
          </div>
          <div>
            • Each component reads a different top-level property (counter,
            userName, userEmail, etc.)
          </div>
        </div>
      </div>

      <div
        style={{
          marginBottom: '20px',
          padding: '15px',
          background: proxyEnabled ? '#d4edda' : '#f8d7da',
          borderLeft: `4px solid ${proxyEnabled ? '#28a745' : '#dc3545'}`,
          borderRadius: '4px',
        }}
      >
        <div
          style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}
        >
          Proxy Tracking: {proxyEnabled ? '✓ ENABLED' : '✗ DISABLED'}
        </div>
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          {proxyEnabled ? (
            <>
              <div>
                • Components only re-render when their accessed top-level
                properties change
              </div>
              <div>
                • Optimal for large flat state objects with many subscribers
              </div>
              <div>• Slight overhead from proxy wrapping</div>
            </>
          ) : (
            <>
              <div>• All components re-render on ANY state change</div>
              <div>• Simple but potentially inefficient</div>
              <div>• No proxy overhead</div>
            </>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={runAllTests}
          disabled={isRunning}
          style={{
            marginRight: '10px',
            padding: '12px 24px',
            background: isRunning ? '#ccc' : '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </button>
        <button
          onClick={resetTracking}
          disabled={isRunning}
          style={{
            padding: '12px 24px',
            background: '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          Reset
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Live Component Views</h3>
        <div
          style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}
        ></div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px',
          }}
        >
          <CounterDisplay
            key={`counter-${componentKey}`}
            label="Counter (state.counter)"
            onRender={() => trackRender('Counter')}
          />
          <UserNameDisplay
            key={`username-${componentKey}`}
            label="User Name (state.userName)"
            onRender={() => trackRender('UserName')}
          />
          <EmailDisplay
            key={`email-${componentKey}`}
            label="Email (state.userEmail)"
            onRender={() => trackRender('Email')}
          />
          <ThemeDisplay
            key={`theme-${componentKey}`}
            label="Theme (state.theme)"
            onRender={() => trackRender('Theme')}
          />
          <ItemDisplay
            key={`item-${componentKey}`}
            label="Item (state.itemName)"
            onRender={() => trackRender('Item')}
          />
        </div>
      </div>

      {scenarioResults.length > 0 && (
        <div>
          <h3>Test Results</h3>
          <div
            style={{
              marginBottom: '15px',
              padding: '12px',
              background: passedTests === totalTests ? '#d4edda' : '#fff3cd',
              borderRadius: '4px',
            }}
          >
            <strong>
              {passedTests === totalTests ? '✓' : '⚠'} Passed {passedTests} /{' '}
              {totalTests} tests
            </strong>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #ddd',
                fontSize: '13px',
              }}
            >
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th
                    style={{
                      padding: '10px',
                      border: '1px solid #ddd',
                      textAlign: 'left',
                    }}
                  >
                    Test
                  </th>
                  <th
                    style={{
                      padding: '10px',
                      border: '1px solid #ddd',
                      textAlign: 'left',
                    }}
                  >
                    Expected (Proxy ON)
                  </th>
                  <th
                    style={{
                      padding: '10px',
                      border: '1px solid #ddd',
                      textAlign: 'left',
                    }}
                  >
                    Expected (Proxy OFF)
                  </th>
                  <th
                    style={{
                      padding: '10px',
                      border: '1px solid #ddd',
                      textAlign: 'left',
                    }}
                  >
                    Actual Renders
                  </th>
                  <th
                    style={{
                      padding: '10px',
                      border: '1px solid #ddd',
                      textAlign: 'center',
                    }}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {scenarioResults.map((result, i) => (
                  <tr key={i}>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                      <strong>{result.name}</strong>
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                      {result.expectedWithProxy.length > 0
                        ? result.expectedWithProxy.join(', ')
                        : 'None'}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                      {result.expectedWithoutProxy.join(', ')}
                    </td>
                    <td
                      style={{
                        padding: '10px',
                        border: '1px solid #ddd',
                        fontFamily: 'monospace',
                        background: result.passed ? '#e8f5e9' : '#ffebee',
                      }}
                    >
                      {result.actualRenders.length > 0
                        ? result.actualRenders.join(', ')
                        : 'None'}
                    </td>
                    <td
                      style={{
                        padding: '10px',
                        border: '1px solid #ddd',
                        textAlign: 'center',
                        fontSize: '18px',
                      }}
                    >
                      {result.passed ? '✓' : '✗'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: '15px',
              padding: '12px',
              background: '#f0f7ff',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          >
            <strong>💡 Understanding the Results:</strong>
            <div style={{ marginTop: '8px', lineHeight: '1.6' }}>
              {proxyEnabled ? (
                <>
                  <div>
                    • <strong>With Proxy Tracking Enabled:</strong> Each test
                    should only trigger re-renders in components that access the
                    changed top-level property
                  </div>
                  <div>
                    • Example: Updating <code>counter</code> should only
                    re-render the Counter component
                  </div>
                  <div>
                    • The <code>metadataVersion</code> test updates a property
                    that NO component reads, so nothing should re-render
                  </div>
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px',
                      background: '#fff3cd',
                      borderRadius: '4px',
                    }}
                  >
                    <strong>Note:</strong> If you had nested state like{' '}
                    <code>state.user.name</code>, updating ANY property in{' '}
                    <code>user</code> would re-render ALL components that access
                    ANY part of <code>user</code>. This is why flat state works
                    better with proxy tracking.
                  </div>
                </>
              ) : (
                <>
                  <div>
                    • <strong>With Proxy Tracking Disabled:</strong> ANY state
                    change triggers ALL components to re-render
                  </div>
                  <div>
                    • This is less efficient but simpler and has no proxy
                    overhead
                  </div>
                  <div>
                    • All tests should show all 5 components re-rendering
                    (except initial mount)
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
