import { Cubit, Blac } from '@blac/core';
import { useBloc } from '@blac/react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ProxyFactory } from '@blac/core';

/**
 * V3 Deep Dependency Tracking Performance Benchmark
 *
 * Tests the new V3 nested proxy-based dependency tracking.
 * Demonstrates how components only re-render when their specific
 * nested paths change, not entire parent objects.
 */

interface NestedState {
  // Shallow properties
  counter: number;
  theme: string;

  // Nested user object
  user: {
    name: string;
    email: string;
    profile: {
      bio: string;
      address: {
        city: string;
        country: string;
        zipCode: string;
      };
      preferences: {
        notifications: boolean;
        language: string;
      };
    };
  };

  // Nested data array
  items: Array<{
    id: number;
    name: string;
    metadata: {
      created: string;
      updated: string;
    };
  }>;

  // Deep nesting test
  deep: {
    level1: {
      level2: {
        level3: {
          value: number;
        };
      };
    };
  };
}

class NestedStateCubit extends Cubit<NestedState> {
  constructor() {
    super({
      counter: 0,
      theme: 'light',
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        profile: {
          bio: 'Software developer',
          address: {
            city: 'New York',
            country: 'USA',
            zipCode: '10001',
          },
          preferences: {
            notifications: true,
            language: 'en',
          },
        },
      },
      items: [
        { id: 1, name: 'Item 1', metadata: { created: '2024-01-01', updated: '2024-01-01' } },
        { id: 2, name: 'Item 2', metadata: { created: '2024-01-02', updated: '2024-01-02' } },
      ],
      deep: {
        level1: {
          level2: {
            level3: {
              value: 0,
            },
          },
        },
      },
    });
  }

  // Shallow updates
  incrementCounter = () => {
    this.patch({ counter: this.state.counter + 1 });
  };

  toggleTheme = () => {
    this.patch({ theme: this.state.theme === 'light' ? 'dark' : 'light' });
  };

  // Nested updates - user.name
  updateUserName = (name: string) => {
    this.patch({
      user: {
        ...this.state.user,
        name,
      },
    });
  };

  // Nested updates - user.email
  updateUserEmail = (email: string) => {
    this.patch({
      user: {
        ...this.state.user,
        email,
      },
    });
  };

  // Deep nested updates - user.profile.address.city
  updateCity = (city: string) => {
    this.patch({
      user: {
        ...this.state.user,
        profile: {
          ...this.state.user.profile,
          address: {
            ...this.state.user.profile.address,
            city,
          },
        },
      },
    });
  };

  // Deep nested updates - user.profile.address.country
  updateCountry = (country: string) => {
    this.patch({
      user: {
        ...this.state.user,
        profile: {
          ...this.state.user.profile,
          address: {
            ...this.state.user.profile.address,
            country,
          },
        },
      },
    });
  };

  // Deep nested updates - user.profile.bio
  updateBio = (bio: string) => {
    this.patch({
      user: {
        ...this.state.user,
        profile: {
          ...this.state.user.profile,
          bio,
        },
      },
    });
  };

  // Array element update - items[0].name
  updateFirstItemName = (name: string) => {
    this.patch({
      items: [
        { ...this.state.items[0], name },
        ...this.state.items.slice(1),
      ],
    });
  };

  // Array element update - items[1].metadata.updated
  updateSecondItemMetadata = (updated: string) => {
    this.patch({
      items: [
        this.state.items[0],
        {
          ...this.state.items[1],
          metadata: {
            ...this.state.items[1].metadata,
            updated,
          },
        },
      ],
    });
  };

  // Very deep nested update
  incrementDeepValue = () => {
    this.patch({
      deep: {
        level1: {
          level2: {
            level3: {
              value: this.state.deep.level1.level2.level3.value + 1,
            },
          },
        },
      },
    });
  };

  reset = () => {
    this.emit({
      counter: 0,
      theme: 'light',
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        profile: {
          bio: 'Software developer',
          address: {
            city: 'New York',
            country: 'USA',
            zipCode: '10001',
          },
          preferences: {
            notifications: true,
            language: 'en',
          },
        },
      },
      items: [
        { id: 1, name: 'Item 1', metadata: { created: '2024-01-01', updated: '2024-01-01' } },
        { id: 2, name: 'Item 2', metadata: { created: '2024-01-02', updated: '2024-01-02' } },
      ],
      deep: {
        level1: {
          level2: {
            level3: {
              value: 0,
            },
          },
        },
      },
    });
  };
}

interface ComponentProps {
  label: string;
  accessPath: string;
  onRender: () => void;
}

// Component reading shallow property
const CounterDisplay: React.FC<ComponentProps> = React.memo(({ label, accessPath, onRender }) => {
  const [state] = useBloc(NestedStateCubit);
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    onRender();
  });

  return (
    <div style={{ padding: '12px', border: '2px solid #4CAF50', margin: '5px', borderRadius: '4px', background: 'white' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: '#2196F3' }}>{state.counter}</div>
      <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>Accesses: <code>{accessPath}</code></div>
      <div style={{ fontSize: '11px', color: '#666' }}>Renders: {renderCount.current}</div>
    </div>
  );
});

// Component reading user.name (nested level 1)
const UserNameDisplay: React.FC<ComponentProps> = React.memo(({ label, accessPath, onRender }) => {
  const [state] = useBloc(NestedStateCubit);
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    onRender();
  });

  return (
    <div style={{ padding: '12px', border: '2px solid #2196F3', margin: '5px', borderRadius: '4px', background: 'white' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: '#2196F3' }}>{state.user.name}</div>
      <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>Accesses: <code>{accessPath}</code></div>
      <div style={{ fontSize: '11px', color: '#666' }}>Renders: {renderCount.current}</div>
    </div>
  );
});

// Component reading user.email (nested level 1)
const UserEmailDisplay: React.FC<ComponentProps> = React.memo(({ label, accessPath, onRender }) => {
  const [state] = useBloc(NestedStateCubit);
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    onRender();
  });

  return (
    <div style={{ padding: '12px', border: '2px solid #2196F3', margin: '5px', borderRadius: '4px', background: 'white' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: '#2196F3' }}>{state.user.email}</div>
      <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>Accesses: <code>{accessPath}</code></div>
      <div style={{ fontSize: '11px', color: '#666' }}>Renders: {renderCount.current}</div>
    </div>
  );
});

// Component reading user.profile.address.city (nested level 3)
const CityDisplay: React.FC<ComponentProps> = React.memo(({ label, accessPath, onRender }) => {
  const [state] = useBloc(NestedStateCubit);
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    onRender();
  });

  return (
    <div style={{ padding: '12px', border: '2px solid #FF9800', margin: '5px', borderRadius: '4px', background: 'white' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: '#FF9800' }}>{state.user.profile.address.city}</div>
      <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>Accesses: <code>{accessPath}</code></div>
      <div style={{ fontSize: '11px', color: '#666' }}>Renders: {renderCount.current}</div>
    </div>
  );
});

// Component reading user.profile.address.country (nested level 3)
const CountryDisplay: React.FC<ComponentProps> = React.memo(({ label, accessPath, onRender }) => {
  const [state] = useBloc(NestedStateCubit);
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    onRender();
  });

  return (
    <div style={{ padding: '12px', border: '2px solid #FF9800', margin: '5px', borderRadius: '4px', background: 'white' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: '#FF9800' }}>{state.user.profile.address.country}</div>
      <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>Accesses: <code>{accessPath}</code></div>
      <div style={{ fontSize: '11px', color: '#666' }}>Renders: {renderCount.current}</div>
    </div>
  );
});

// Component reading items[0].name (array access)
const FirstItemDisplay: React.FC<ComponentProps> = React.memo(({ label, accessPath, onRender }) => {
  const [state] = useBloc(NestedStateCubit);
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    onRender();
  });

  return (
    <div style={{ padding: '12px', border: '2px solid #9C27B0', margin: '5px', borderRadius: '4px', background: 'white' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: '#9C27B0' }}>{state.items[0].name}</div>
      <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>Accesses: <code>{accessPath}</code></div>
      <div style={{ fontSize: '11px', color: '#666' }}>Renders: {renderCount.current}</div>
    </div>
  );
});

// Component reading items[1].metadata.updated (deep array access)
const SecondItemMetadataDisplay: React.FC<ComponentProps> = React.memo(({ label, accessPath, onRender }) => {
  const [state] = useBloc(NestedStateCubit);
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    onRender();
  });

  return (
    <div style={{ padding: '12px', border: '2px solid #9C27B0', margin: '5px', borderRadius: '4px', background: 'white' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: '#9C27B0' }}>{state.items[1].metadata.updated}</div>
      <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>Accesses: <code>{accessPath}</code></div>
      <div style={{ fontSize: '11px', color: '#666' }}>Renders: {renderCount.current}</div>
    </div>
  );
});

// Component reading deep.level1.level2.level3.value (very deep nesting)
const DeepValueDisplay: React.FC<ComponentProps> = React.memo(({ label, accessPath, onRender }) => {
  const [state] = useBloc(NestedStateCubit);
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    onRender();
  });

  return (
    <div style={{ padding: '12px', border: '2px solid #F44336', margin: '5px', borderRadius: '4px', background: 'white' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: '#F44336' }}>{state.deep.level1.level2.level3.value}</div>
      <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>Accesses: <code>{accessPath}</code></div>
      <div style={{ fontSize: '11px', color: '#666' }}>Renders: {renderCount.current}</div>
    </div>
  );
});

type TestScenario =
  | 'counter'
  | 'theme'
  | 'userName'
  | 'userEmail'
  | 'city'
  | 'country'
  | 'bio'
  | 'firstItem'
  | 'secondItemMeta'
  | 'deepValue';

interface ScenarioResult {
  name: string;
  action: string;
  targetPath: string;
  expectedRenders: string[];
  actualRenders: string[];
  passed: boolean;
  improvement?: string;
}

export const DependencyTrackingBenchmark: React.FC = () => {
  const [proxyEnabled] = useState(Blac.config.proxyDependencyTracking);
  const [componentKey, setComponentKey] = useState(0);
  const [scenarioResults, setScenarioResults] = useState<ScenarioResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [proxyStats, setProxyStats] = useState<any>(null);

  const renderTracker = useRef<Map<string, number>>(new Map());

  const cubit = Blac.getBloc(NestedStateCubit);

  const trackRender = useCallback((componentName: string) => {
    const current = renderTracker.current.get(componentName) || 0;
    renderTracker.current.set(componentName, current + 1);
  }, []);

  const resetTracking = () => {
    renderTracker.current.clear();
    setComponentKey((k) => k + 1);
    setScenarioResults([]);
    ProxyFactory.resetStats();
    setProxyStats(null);
  };

  const getRenderCounts = () => {
    const components = [
      'Counter',
      'UserName',
      'UserEmail',
      'City',
      'Country',
      'FirstItem',
      'SecondItemMeta',
      'DeepValue',
    ];
    return components.map((name) => ({
      name,
      count: renderTracker.current.get(name) || 0,
    }));
  };

  const runScenario = async (scenario: TestScenario) => {
    const beforeCounts = getRenderCounts();

    // Perform the action
    switch (scenario) {
      case 'counter':
        cubit.incrementCounter();
        break;
      case 'theme':
        cubit.toggleTheme();
        break;
      case 'userName':
        cubit.updateUserName(`User ${Date.now()}`);
        break;
      case 'userEmail':
        cubit.updateUserEmail(`user${Date.now()}@example.com`);
        break;
      case 'city':
        cubit.updateCity(`City ${Date.now()}`);
        break;
      case 'country':
        cubit.updateCountry(`Country ${Date.now()}`);
        break;
      case 'bio':
        cubit.updateBio(`Bio ${Date.now()}`);
        break;
      case 'firstItem':
        cubit.updateFirstItemName(`Item ${Date.now()}`);
        break;
      case 'secondItemMeta':
        cubit.updateSecondItemMetadata(new Date().toISOString());
        break;
      case 'deepValue':
        cubit.incrementDeepValue();
        break;
    }

    // Wait for re-renders
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Calculate which components rendered
    const afterCounts = getRenderCounts();
    const rendered = afterCounts
      .filter((after, i) => after.count > beforeCounts[i].count)
      .map((c) => c.name);

    // V3 expectations: ONLY components accessing the exact changed path should re-render
    const expectedWithProxyV3: Record<TestScenario, string[]> = {
      counter: ['Counter'],
      theme: [], // No component reads theme
      userName: ['UserName'], // Only UserName reads user.name
      userEmail: ['UserEmail'], // Only UserEmail reads user.email
      city: ['City'], // V3: Only City reads user.profile.address.city
      country: ['Country'], // V3: Only Country reads user.profile.address.country
      bio: [], // No component reads user.profile.bio
      firstItem: ['FirstItem'], // Only FirstItem reads items[0].name
      secondItemMeta: ['SecondItemMeta'], // Only SecondItemMeta reads items[1].metadata.updated
      deepValue: ['DeepValue'], // Only DeepValue reads deep.level1.level2.level3.value
    };

    // Without proxy: ALL components re-render
    const expectedWithoutProxy: Record<TestScenario, string[]> = {
      counter: ['Counter', 'UserName', 'UserEmail', 'City', 'Country', 'FirstItem', 'SecondItemMeta', 'DeepValue'],
      theme: ['Counter', 'UserName', 'UserEmail', 'City', 'Country', 'FirstItem', 'SecondItemMeta', 'DeepValue'],
      userName: ['Counter', 'UserName', 'UserEmail', 'City', 'Country', 'FirstItem', 'SecondItemMeta', 'DeepValue'],
      userEmail: ['Counter', 'UserName', 'UserEmail', 'City', 'Country', 'FirstItem', 'SecondItemMeta', 'DeepValue'],
      city: ['Counter', 'UserName', 'UserEmail', 'City', 'Country', 'FirstItem', 'SecondItemMeta', 'DeepValue'],
      country: ['Counter', 'UserName', 'UserEmail', 'City', 'Country', 'FirstItem', 'SecondItemMeta', 'DeepValue'],
      bio: ['Counter', 'UserName', 'UserEmail', 'City', 'Country', 'FirstItem', 'SecondItemMeta', 'DeepValue'],
      firstItem: ['Counter', 'UserName', 'UserEmail', 'City', 'Country', 'FirstItem', 'SecondItemMeta', 'DeepValue'],
      secondItemMeta: ['Counter', 'UserName', 'UserEmail', 'City', 'Country', 'FirstItem', 'SecondItemMeta', 'DeepValue'],
      deepValue: ['Counter', 'UserName', 'UserEmail', 'City', 'Country', 'FirstItem', 'SecondItemMeta', 'DeepValue'],
    };

    const expected = proxyEnabled
      ? expectedWithProxyV3[scenario]
      : expectedWithoutProxy[scenario];

    const passed =
      expected.length === rendered.length &&
      expected.every((name) => rendered.includes(name));

    const scenarioInfo: Record<TestScenario, { name: string; path: string }> = {
      counter: { name: 'Update counter', path: 'state.counter' },
      theme: { name: 'Update theme', path: 'state.theme' },
      userName: { name: 'Update user.name', path: 'state.user.name' },
      userEmail: { name: 'Update user.email', path: 'state.user.email' },
      city: { name: 'Update city', path: 'state.user.profile.address.city' },
      country: { name: 'Update country', path: 'state.user.profile.address.country' },
      bio: { name: 'Update bio', path: 'state.user.profile.bio' },
      firstItem: { name: 'Update items[0].name', path: 'state.items[0].name' },
      secondItemMeta: { name: 'Update items[1].metadata', path: 'state.items[1].metadata.updated' },
      deepValue: { name: 'Update deep value', path: 'state.deep.level1.level2.level3.value' },
    };

    const info = scenarioInfo[scenario];
    const improvement = proxyEnabled
      ? `${expectedWithoutProxy[scenario].length - expected.length} fewer renders`
      : undefined;

    return {
      name: info.name,
      action: scenario,
      targetPath: info.path,
      expectedRenders: expected,
      actualRenders: rendered,
      passed,
      improvement,
    };
  };

  const runAllTests = async () => {
    setIsRunning(true);
    resetTracking();
    cubit.reset();

    await new Promise((resolve) => setTimeout(resolve, 200));

    const scenarios: TestScenario[] = [
      'counter',
      'theme',
      'userName',
      'userEmail',
      'city',
      'country',
      'bio',
      'firstItem',
      'secondItemMeta',
      'deepValue',
    ];
    const results: ScenarioResult[] = [];

    for (const scenario of scenarios) {
      const result = await runScenario(scenario);
      results.push(result);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    setScenarioResults(results);
    setProxyStats(ProxyFactory.getStats());
    setIsRunning(false);
  };

  const passedTests = scenarioResults.filter((r) => r.passed).length;
  const totalTests = scenarioResults.length;

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h2>V3 Deep Dependency Tracking Performance</h2>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
        Tests V3's nested proxy-based dependency tracking. Components only re-render when their specific nested paths change.
      </p>

      <div
        style={{
          marginBottom: '20px',
          padding: '15px',
          background: proxyEnabled ? '#d4edda' : '#f8d7da',
          borderLeft: `4px solid ${proxyEnabled ? '#28a745' : '#dc3545'}`,
          borderRadius: '4px',
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
          V3 Proxy Tracking: {proxyEnabled ? '✓ ENABLED' : '✗ DISABLED'}
        </div>
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          {proxyEnabled ? (
            <>
              <div>✨ <strong>V3 Deep Tracking Features:</strong></div>
              <div>• Tracks FULL paths: <code>user.profile.address.city</code> not just <code>user</code></div>
              <div>• Changing <code>city</code> doesn't re-render components reading <code>country</code></div>
              <div>• Array elements tracked individually: <code>items[0].name</code> vs <code>items[1].name</code></div>
              <div>• Works with arbitrary nesting depth (5+ levels tested)</div>
              <div>• 3-level cache (target → consumer → path) for optimal performance</div>
            </>
          ) : (
            <>
              <div>⚠️ <strong>Without Proxy Tracking:</strong></div>
              <div>• All components re-render on ANY state change</div>
              <div>• Simple but inefficient for complex nested state</div>
              <div>• No tracking overhead</div>
            </>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={runAllTests}
          disabled={isRunning}
          style={{
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
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
          Each component accesses a different nested path. Watch render counts!
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px',
          }}
        >
          <CounterDisplay
            key={`counter-${componentKey}`}
            label="Counter (Shallow)"
            accessPath="state.counter"
            onRender={() => trackRender('Counter')}
          />
          <UserNameDisplay
            key={`username-${componentKey}`}
            label="User Name (Nested L1)"
            accessPath="state.user.name"
            onRender={() => trackRender('UserName')}
          />
          <UserEmailDisplay
            key={`email-${componentKey}`}
            label="User Email (Nested L1)"
            accessPath="state.user.email"
            onRender={() => trackRender('UserEmail')}
          />
          <CityDisplay
            key={`city-${componentKey}`}
            label="City (Nested L3)"
            accessPath="state.user.profile.address.city"
            onRender={() => trackRender('City')}
          />
          <CountryDisplay
            key={`country-${componentKey}`}
            label="Country (Nested L3)"
            accessPath="state.user.profile.address.country"
            onRender={() => trackRender('Country')}
          />
          <FirstItemDisplay
            key={`first-${componentKey}`}
            label="First Item (Array)"
            accessPath="state.items[0].name"
            onRender={() => trackRender('FirstItem')}
          />
          <SecondItemMetadataDisplay
            key={`second-${componentKey}`}
            label="Second Item Meta (Deep Array)"
            accessPath="state.items[1].metadata.updated"
            onRender={() => trackRender('SecondItemMeta')}
          />
          <DeepValueDisplay
            key={`deep-${componentKey}`}
            label="Deep Value (5 Levels)"
            accessPath="state.deep.level1.level2.level3.value"
            onRender={() => trackRender('DeepValue')}
          />
        </div>
      </div>

      {proxyStats && (
        <div
          style={{
            marginBottom: '20px',
            padding: '15px',
            background: '#e3f2fd',
            borderRadius: '4px',
            borderLeft: '4px solid #2196F3',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Proxy Cache Performance</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', fontSize: '13px' }}>
            <div>
              <strong>Total Proxies:</strong> {proxyStats.totalProxiesCreated}
            </div>
            <div>
              <strong>Nested Proxies:</strong> {proxyStats.nestedProxiesCreated}
            </div>
            <div>
              <strong>Cache Hits:</strong> {proxyStats.cacheHits}
            </div>
            <div>
              <strong>Cache Misses:</strong> {proxyStats.cacheMisses}
            </div>
            <div>
              <strong>Hit Rate:</strong> {proxyStats.cacheHitRate || proxyStats.cacheEfficiency}
            </div>
          </div>
        </div>
      )}

      {scenarioResults.length > 0 && (
        <div>
          <h3>Test Results</h3>
          <div
            style={{
              marginBottom: '15px',
              padding: '12px',
              background: passedTests === totalTests ? '#d4edda' : '#fff3cd',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            {passedTests === totalTests ? '✓' : '⚠'} Passed {passedTests} / {totalTests} tests
            {proxyEnabled && passedTests === totalTests && (
              <div style={{ fontSize: '14px', fontWeight: 'normal', marginTop: '5px', color: '#155724' }}>
                🎉 V3 deep tracking working perfectly!
              </div>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Test</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Changed Path</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Expected Renders</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Actual Renders</th>
                  {proxyEnabled && (
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Improvement</th>
                  )}
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {scenarioResults.map((result, i) => (
                  <tr key={i} style={{ background: result.passed ? '#f8fff8' : '#fff8f8' }}>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                      <strong>{result.name}</strong>
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #ddd', fontFamily: 'monospace', fontSize: '12px' }}>
                      {result.targetPath}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                      {result.expectedRenders.length > 0 ? result.expectedRenders.join(', ') : 'None'}
                    </td>
                    <td
                      style={{
                        padding: '10px',
                        border: '1px solid #ddd',
                        fontFamily: 'monospace',
                        background: result.passed ? '#e8f5e9' : '#ffebee',
                      }}
                    >
                      {result.actualRenders.length > 0 ? result.actualRenders.join(', ') : 'None'}
                    </td>
                    {proxyEnabled && (
                      <td style={{ padding: '10px', border: '1px solid #ddd', color: '#2e7d32', fontWeight: 'bold' }}>
                        {result.improvement || '-'}
                      </td>
                    )}
                    <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontSize: '18px' }}>
                      {result.passed ? '✓' : '✗'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: '20px',
              padding: '15px',
              background: '#f0f7ff',
              borderRadius: '4px',
              fontSize: '13px',
              lineHeight: '1.6',
            }}
          >
            <strong>💡 Key V3 Improvements:</strong>
            <div style={{ marginTop: '8px' }}>
              {proxyEnabled ? (
                <>
                  <div>
                    <strong>✨ Precise Tracking:</strong> Changing <code>city</code> doesn't re-render components reading <code>country</code>
                  </div>
                  <div>
                    <strong>📊 Array Precision:</strong> Updating <code>items[0]</code> doesn't affect components reading <code>items[1]</code>
                  </div>
                  <div>
                    <strong>🎯 Deep Nesting:</strong> Works with any depth - tested up to 5 levels deep
                  </div>
                  <div>
                    <strong>⚡ Smart Caching:</strong> 3-level cache minimizes proxy creation overhead
                  </div>
                  <div style={{ marginTop: '8px', padding: '8px', background: '#fff3cd', borderRadius: '4px' }}>
                    <strong>Note:</strong> Due to intermediate path tracking, changing <code>city</code> may still re-render
                    components that access parent paths like <code>user.profile.address</code>. This is a known limitation
                    documented in the V3 plan.
                  </div>
                </>
              ) : (
                <div>
                  Without proxy tracking, ALL {getRenderCounts().length} components re-render on EVERY state change,
                  regardless of which property changed. This is simple but inefficient for complex nested state.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
