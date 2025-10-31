/**
 * Comprehensive Hybrid Mode Performance Benchmark
 *
 * Tests multiple scenarios with Profiler integration:
 * 1. Many components with isolated bloc instances (each has own state)
 * 2. Many components sharing single bloc instance (shared state)
 * 3. Mixed dependency tracking (some read count, some read name, etc.)
 *
 * Profiler captures:
 * - Actual render count
 * - Base render duration
 * - Commit duration
 * - Reconciliation phase info
 */

import { useState, useRef, Profiler, ProfilerOnRenderCallback } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

// Benchmark Cubit with multiple properties for dependency tracking tests
class BenchmarkCubit extends Cubit<{
  count: number;
  name: string;
  nested: { value: number };
  timestamp: number;
}> {
  constructor() {
    super({
      count: 0,
      name: 'benchmark',
      nested: { value: 0 },
      timestamp: Date.now(),
    });
  }

  increment() {
    this.patch({ count: this.state.count + 1 });
  }

  setName(name: string) {
    this.patch({ name });
  }

  updateNested(value: number) {
    this.patch({
      nested: { value },
    });
  }

  updateTimestamp() {
    this.patch({ timestamp: Date.now() });
  }

  reset() {
    this.emit({
      count: 0,
      name: 'benchmark',
      nested: { value: 0 },
      timestamp: Date.now(),
    });
  }
}

// Shared cubit instance for shared scenario
const sharedCubit = new BenchmarkCubit();

// Profiler metrics storage
interface ProfilerMetrics {
  renderCount: number;
  totalBaseDuration: number;
  totalActualDuration: number;
  renders: Array<{
    phase: 'mount' | 'update' | 'nested-update';
    baseDuration: number;
    actualDuration: number;
    startTime: number;
    commitTime: number;
  }>;
}

// Component that only reads count (tests proxy tracking)
const CounterComponent = ({
  mode,
  id,
  shared = false,
}: {
  mode: 'simple' | 'concurrent';
  id: number;
  shared?: boolean;
}) => {
  const [state, bloc] = useBloc(BenchmarkCubit, {
    concurrent: mode === 'concurrent',
    ...(shared ? { instance: sharedCubit } : {}),
  });

  return (
    <div
      style={{
        padding: '8px',
        margin: '4px',
        background: mode === 'simple' ? '#e8f5e9' : '#e3f2fd',
        borderRadius: '4px',
        fontSize: '12px',
      }}
    >
      <div>
        #{id}: {state.count}
      </div>
    </div>
  );
};

// Component that only reads name (tests proxy tracking)
const NameComponent = ({
  mode,
  id,
  shared = false,
}: {
  mode: 'simple' | 'concurrent';
  id: number;
  shared?: boolean;
}) => {
  const [state] = useBloc(BenchmarkCubit, {
    concurrent: mode === 'concurrent',
    ...(shared ? { instance: sharedCubit } : {}),
  });

  return (
    <div
      style={{
        padding: '8px',
        margin: '4px',
        background: mode === 'simple' ? '#fff3e0' : '#e1f5fe',
        borderRadius: '4px',
        fontSize: '12px',
      }}
    >
      <div>
        #{id}: {state.name}
      </div>
    </div>
  );
};

// Component that reads nested value (tests deep tracking)
const NestedComponent = ({
  mode,
  id,
  shared = false,
}: {
  mode: 'simple' | 'concurrent';
  id: number;
  shared?: boolean;
}) => {
  const [state] = useBloc(BenchmarkCubit, {
    concurrent: mode === 'concurrent',
    ...(shared ? { instance: sharedCubit } : {}),
  });

  return (
    <div
      style={{
        padding: '8px',
        margin: '4px',
        background: mode === 'simple' ? '#fce4ec' : '#f3e5f5',
        borderRadius: '4px',
        fontSize: '12px',
      }}
    >
      <div>
        #{id}: {state.nested.value}
      </div>
    </div>
  );
};

// Benchmark scenario container with Profiler
const BenchmarkScenario = ({
  mode,
  scenario,
  componentCount,
}: {
  mode: 'simple' | 'concurrent';
  scenario: 'isolated' | 'shared';
  componentCount: number;
}) => {
  const metricsRef = useRef<ProfilerMetrics>({
    renderCount: 0,
    totalBaseDuration: 0,
    totalActualDuration: 0,
    renders: [],
  });

  const [, forceUpdate] = useState(0);

  const onRender: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
  ) => {
    metricsRef.current.renderCount++;
    metricsRef.current.totalBaseDuration += baseDuration;
    metricsRef.current.totalActualDuration += actualDuration;
    metricsRef.current.renders.push({
      phase,
      baseDuration,
      actualDuration,
      startTime,
      commitTime,
    });
  };

  // Get bloc instance for controls
  const [, bloc] = useBloc(BenchmarkCubit, {
    concurrent: mode === 'concurrent',
    ...(scenario === 'shared' ? { instance: sharedCubit } : {}),
  });

  const resetMetrics = () => {
    metricsRef.current = {
      renderCount: 0,
      totalBaseDuration: 0,
      totalActualDuration: 0,
      renders: [],
    };
    forceUpdate((prev) => prev + 1);
  };

  const metrics = metricsRef.current;
  const avgBaseDuration =
    metrics.renderCount > 0
      ? (metrics.totalBaseDuration / metrics.renderCount).toFixed(2)
      : '0';
  const avgActualDuration =
    metrics.renderCount > 0
      ? (metrics.totalActualDuration / metrics.renderCount).toFixed(2)
      : '0';

  const mountRenders = metrics.renders.filter(
    (r) => r.phase === 'mount',
  ).length;
  const updateRenders = metrics.renders.filter(
    (r) => r.phase === 'update',
  ).length;

  return (
    <div
      style={{
        border: `3px solid ${mode === 'simple' ? '#4caf50' : '#2196f3'}`,
        borderRadius: '8px',
        padding: '15px',
        background: 'white',
      }}
    >
      <h3 style={{ margin: '0 0 10px 0' }}>
        {mode === 'simple' ? '🟢 Simple' : '🔵 Concurrent'} -{' '}
        {scenario === 'isolated' ? '🔸 Isolated' : '🔶 Shared'}
      </h3>

      {/* Metrics Display */}
      <div
        style={{
          marginBottom: '15px',
          padding: '10px',
          background: '#f5f5f5',
          borderRadius: '4px',
          fontSize: '13px',
        }}
      >
        <div>
          <strong>Total Renders:</strong> {metrics.renderCount}
        </div>
        <div>
          <strong>Mount Renders:</strong> {mountRenders}
        </div>
        <div>
          <strong>Update Renders:</strong> {updateRenders}
        </div>
        <div>
          <strong>Avg Base Duration:</strong> {avgBaseDuration}ms
        </div>
        <div>
          <strong>Avg Actual Duration:</strong> {avgActualDuration}ms
        </div>
        <div>
          <strong>Total Actual Time:</strong>{' '}
          {metrics.totalActualDuration.toFixed(2)}ms
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '15px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => bloc.increment()}
          style={{ padding: '8px 12px', fontSize: '12px' }}
        >
          ✅ Increment (Count Components Should Render)
        </button>
        <button
          onClick={() => bloc.setName(`test-${Date.now()}`)}
          style={{ padding: '8px 12px', fontSize: '12px' }}
        >
          📝 Change Name (Name Components Should Render)
        </button>
        <button
          onClick={() => bloc.updateNested(Date.now())}
          style={{ padding: '8px 12px', fontSize: '12px' }}
        >
          🔗 Update Nested (Nested Components Should Render)
        </button>
        <button
          onClick={() => bloc.updateTimestamp()}
          style={{ padding: '8px 12px', fontSize: '12px' }}
        >
          ⏱️ Update Timestamp (No Components Should Render)
        </button>
        <button
          onClick={resetMetrics}
          style={{
            padding: '8px 12px',
            fontSize: '12px',
            background: '#ff9800',
            border: 'none',
            color: 'white',
          }}
        >
          🔄 Reset Metrics
        </button>
      </div>

      {/* Components Grid */}
      <Profiler id={`${mode}-${scenario}`} onRender={onRender}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '4px',
          }}
        >
          {/* Mix of component types */}
          {Array.from({ length: Math.floor(componentCount / 3) }, (_, i) => (
            <CounterComponent
              key={`count-${i}`}
              mode={mode}
              id={i}
              shared={scenario === 'shared'}
            />
          ))}
          {Array.from({ length: Math.floor(componentCount / 3) }, (_, i) => (
            <NameComponent
              key={`name-${i}`}
              mode={mode}
              id={i}
              shared={scenario === 'shared'}
            />
          ))}
          {Array.from(
            { length: componentCount - 2 * Math.floor(componentCount / 3) },
            (_, i) => (
              <NestedComponent
                key={`nested-${i}`}
                mode={mode}
                id={i}
                shared={scenario === 'shared'}
              />
            ),
          )}
        </div>
      </Profiler>
    </div>
  );
};

export const HybridModeBenchmark = () => {
  const [componentCount, setComponentCount] = useState(30);
  const [activeScenarios, setActiveScenarios] = useState<{
    simpleIsolated: boolean;
    simpleShared: boolean;
    concurrentIsolated: boolean;
    concurrentShared: boolean;
  }>({
    simpleIsolated: false,
    simpleShared: false,
    concurrentIsolated: false,
    concurrentShared: false,
  });

  const runScenario = (scenario: keyof typeof activeScenarios) => {
    setActiveScenarios((prev) => ({
      ...prev,
      [scenario]: !prev[scenario],
    }));
  };

  const runAll = () => {
    setActiveScenarios({
      simpleIsolated: true,
      simpleShared: true,
      concurrentIsolated: true,
      concurrentShared: true,
    });
  };

  const resetAll = () => {
    setActiveScenarios({
      simpleIsolated: false,
      simpleShared: false,
      concurrentIsolated: false,
      concurrentShared: false,
    });
  };

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h1 style={{ marginBottom: '10px' }}>
        🔬 Comprehensive Hybrid Mode Benchmark
      </h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Profiler-integrated performance testing with isolated and shared bloc
        instances
      </p>

      <div
        style={{
          marginBottom: '20px',
          padding: '15px',
          background: '#fff3cd',
          borderRadius: '4px',
        }}
      >
        <h3 style={{ marginTop: 0 }}>📋 Test Scenarios</h3>
        <ul style={{ marginBottom: 0 }}>
          <li>
            <strong>Isolated:</strong> Each component has its own bloc instance
            (independent state)
          </li>
          <li>
            <strong>Shared:</strong> All components share a single bloc instance
            (shared state)
          </li>
          <li>
            <strong>Mixed Components:</strong> 1/3 read count, 1/3 read name,
            1/3 read nested value
          </li>
          <li>
            <strong>Profiler Metrics:</strong> Captures render count,
            mount/update phases, and timing
          </li>
        </ul>
      </div>

      {/* Controls */}
      <div
        style={{
          marginBottom: '20px',
          padding: '15px',
          background: '#f5f5f5',
          borderRadius: '4px',
        }}
      >
        <div style={{ marginBottom: '10px' }}>
          <label style={{ marginRight: '10px' }}>
            Component Count: <strong>{componentCount}</strong>
          </label>
          <input
            type="range"
            min="9"
            max="150"
            step="3"
            value={componentCount}
            onChange={(e) => setComponentCount(parseInt(e.target.value))}
            style={{ width: '200px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={runAll}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              cursor: 'pointer',
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            🚀 Run All Scenarios
          </button>
          <button
            onClick={() => runScenario('simpleIsolated')}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            🟢🔸 {activeScenarios.simpleIsolated ? 'Hide' : 'Show'} Simple
            Isolated
          </button>
          <button
            onClick={() => runScenario('simpleShared')}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            🟢🔶 {activeScenarios.simpleShared ? 'Hide' : 'Show'} Simple Shared
          </button>
          <button
            onClick={() => runScenario('concurrentIsolated')}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            🔵🔸 {activeScenarios.concurrentIsolated ? 'Hide' : 'Show'}{' '}
            Concurrent Isolated
          </button>
          <button
            onClick={() => runScenario('concurrentShared')}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            🔵🔶 {activeScenarios.concurrentShared ? 'Hide' : 'Show'} Concurrent
            Shared
          </button>
          <button
            onClick={resetAll}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              cursor: 'pointer',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            🔄 Hide All
          </button>
        </div>
      </div>

      {/* Scenario Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '20px',
        }}
      >
        {activeScenarios.simpleIsolated && (
          <BenchmarkScenario
            mode="simple"
            scenario="isolated"
            componentCount={componentCount}
          />
        )}
        {activeScenarios.simpleShared && (
          <BenchmarkScenario
            mode="simple"
            scenario="shared"
            componentCount={componentCount}
          />
        )}
        {activeScenarios.concurrentIsolated && (
          <BenchmarkScenario
            mode="concurrent"
            scenario="isolated"
            componentCount={componentCount}
          />
        )}
        {activeScenarios.concurrentShared && (
          <BenchmarkScenario
            mode="concurrent"
            scenario="shared"
            componentCount={componentCount}
          />
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: '20px',
          padding: '20px',
          background: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ marginTop: 0 }}>🎯 Expected Behavior</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >
          <div>
            <h4 style={{ color: '#4caf50', marginTop: 0 }}>Simple Mode</h4>
            <ul
              style={{ paddingLeft: '20px', marginBottom: 0, fontSize: '14px' }}
            >
              <li>Initial render: 1 per component</li>
              <li>Increment: Only count components re-render</li>
              <li>Change Name: Only name components re-render</li>
              <li>Update Nested: Only nested components re-render</li>
              <li>Update Timestamp: No re-renders (not tracked)</li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: '#2196f3', marginTop: 0 }}>Concurrent Mode</h4>
            <ul
              style={{ paddingLeft: '20px', marginBottom: 0, fontSize: '14px' }}
            >
              <li>Initial render: 1-2 per component (useSyncExternalStore)</li>
              <li>Increment: Only count components (+ tearing check)</li>
              <li>Change Name: Only name components (+ tearing check)</li>
              <li>Update Nested: Only nested components (+ tearing check)</li>
              <li>Update Timestamp: No re-renders (not tracked)</li>
            </ul>
          </div>
          <div>
            <h4 style={{ marginTop: 0 }}>🔸 Isolated vs 🔶 Shared</h4>
            <ul
              style={{ paddingLeft: '20px', marginBottom: 0, fontSize: '14px' }}
            >
              <li>
                <strong>Isolated:</strong> Each component maintains independent
                state
              </li>
              <li>
                <strong>Shared:</strong> All components share same state
              </li>
              <li>Shared should show updates to ALL components of same type</li>
              <li>Isolated shows no cross-component updates</li>
            </ul>
          </div>
        </div>

        <div
          style={{
            marginTop: '20px',
            padding: '15px',
            background: 'white',
            borderRadius: '4px',
          }}
        >
          <h4 style={{ marginTop: 0 }}>📊 Profiler Metrics Explained</h4>
          <ul
            style={{ paddingLeft: '20px', marginBottom: 0, fontSize: '14px' }}
          >
            <li>
              <strong>Total Renders:</strong> How many times Profiler onRender
              was called
            </li>
            <li>
              <strong>Mount Renders:</strong> Initial renders when components
              first mount
            </li>
            <li>
              <strong>Update Renders:</strong> Subsequent renders from state
              changes
            </li>
            <li>
              <strong>Avg Base Duration:</strong> Time React would spend
              rendering without memoization
            </li>
            <li>
              <strong>Avg Actual Duration:</strong> Actual time spent rendering
              (includes memo benefits)
            </li>
            <li>
              <strong>Total Actual Time:</strong> Sum of all render times for
              the tree
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
