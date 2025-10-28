/**
 * Real Performance Benchmark - Run in Browser
 *
 * This file creates actual browser-based performance tests that can be profiled
 * using React DevTools Profiler to see real reconciliation and render behavior.
 *
 * To use:
 * 1. Import this component into your app
 * 2. Open React DevTools Profiler
 * 3. Start recording
 * 4. Click "Run Benchmark"
 * 5. Stop recording
 * 6. Compare results
 */

import React, { useState, Profiler, ProfilerOnRenderCallback } from 'react';
import { Cubit } from '@blac/core';
import { useBloc, BlocConfig } from '../index';

// Benchmark Cubit
class BenchmarkCubit extends Cubit<{
  count: number;
  name: string;
  items: number[];
}> {
  static isolated = true;

  constructor() {
    super({
      count: 0,
      name: 'benchmark',
      items: [],
    });
  }

  increment() {
    this.update((state) => ({ ...state, count: state.count + 1 }));
  }

  setName(name: string) {
    this.update((state) => ({ ...state, name }));
  }

  addItem(item: number) {
    this.update((state) => ({
      ...state,
      items: [...state.items, item],
    }));
  }

  reset() {
    this.update(() => ({
      count: 0,
      name: 'benchmark',
      items: [],
    }));
  }
}

// Component that only uses count
const SimpleCounter = ({ mode }: { mode: 'simple' | 'concurrent' }) => {
  const [state, bloc] = useBloc(BenchmarkCubit, {
    concurrent: mode === 'concurrent',
  });

  return (
    <div>
      <h3>{mode === 'simple' ? 'Simple Mode' : 'Concurrent Mode'}</h3>
      <div>Count: {state.count}</div>
      <button onClick={() => bloc.increment()}>Increment</button>
      <button onClick={() => bloc.setName('changed')}>Change Name (Not Rendered)</button>
    </div>
  );
};

// Performance metrics collector
interface PerformanceMetrics {
  mode: string;
  totalRenders: number;
  totalDuration: number;
  avgDuration: number;
  renders: Array<{
    phase: 'mount' | 'update';
    duration: number;
  }>;
}

export const PerformanceBenchmarkApp = () => {
  const [simpleMetrics, setSimpleMetrics] = useState<PerformanceMetrics>({
    mode: 'simple',
    totalRenders: 0,
    totalDuration: 0,
    avgDuration: 0,
    renders: [],
  });

  const [concurrentMetrics, setConcurrentMetrics] = useState<PerformanceMetrics>({
    mode: 'concurrent',
    totalRenders: 0,
    totalDuration: 0,
    avgDuration: 0,
    renders: [],
  });

  const [showSimple, setShowSimple] = useState(false);
  const [showConcurrent, setShowConcurrent] = useState(false);
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);

  const onRenderSimple: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
  ) => {
    setSimpleMetrics((prev) => {
      const newRenders = [
        ...prev.renders,
        { phase, duration: actualDuration },
      ];
      const totalDuration = prev.totalDuration + actualDuration;
      return {
        mode: 'simple',
        totalRenders: prev.totalRenders + 1,
        totalDuration,
        avgDuration: totalDuration / newRenders.length,
        renders: newRenders,
      };
    });
  };

  const onRenderConcurrent: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
  ) => {
    setConcurrentMetrics((prev) => {
      const newRenders = [
        ...prev.renders,
        { phase, duration: actualDuration },
      ];
      const totalDuration = prev.totalDuration + actualDuration;
      return {
        mode: 'concurrent',
        totalRenders: prev.totalRenders + 1,
        totalDuration,
        avgDuration: totalDuration / newRenders.length,
        renders: newRenders,
      };
    });
  };

  const runBenchmark = async (mode: 'simple' | 'concurrent' | 'both') => {
    setBenchmarkRunning(true);

    // Reset metrics
    if (mode === 'simple' || mode === 'both') {
      setSimpleMetrics({
        mode: 'simple',
        totalRenders: 0,
        totalDuration: 0,
        avgDuration: 0,
        renders: [],
      });
      setShowSimple(false);
    }

    if (mode === 'concurrent' || mode === 'both') {
      setConcurrentMetrics({
        mode: 'concurrent',
        totalRenders: 0,
        totalDuration: 0,
        avgDuration: 0,
        renders: [],
      });
      setShowConcurrent(false);
    }

    // Small delay to ensure clean state
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (mode === 'simple' || mode === 'both') {
      setShowSimple(true);
    }

    if (mode === 'concurrent' || mode === 'both') {
      setShowConcurrent(true);
    }

    setBenchmarkRunning(false);
  };

  const resetBenchmark = () => {
    setShowSimple(false);
    setShowConcurrent(false);
    setSimpleMetrics({
      mode: 'simple',
      totalRenders: 0,
      totalDuration: 0,
      avgDuration: 0,
      renders: [],
    });
    setConcurrentMetrics({
      mode: 'concurrent',
      totalRenders: 0,
      totalDuration: 0,
      avgDuration: 0,
      renders: [],
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔬 useBloc Performance Benchmark</h1>

      <div style={{ marginBottom: '20px', padding: '10px', background: '#f0f0f0' }}>
        <h2>Instructions</h2>
        <ol>
          <li>Open React DevTools Profiler</li>
          <li>Start recording</li>
          <li>Run a benchmark below</li>
          <li>Click buttons to trigger updates</li>
          <li>Stop recording and compare results</li>
        </ol>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => runBenchmark('both')}
          disabled={benchmarkRunning}
          style={{ marginRight: '10px', padding: '10px' }}
        >
          Run Both (Side-by-Side)
        </button>
        <button
          onClick={() => runBenchmark('simple')}
          disabled={benchmarkRunning}
          style={{ marginRight: '10px', padding: '10px' }}
        >
          Run Simple Only
        </button>
        <button
          onClick={() => runBenchmark('concurrent')}
          disabled={benchmarkRunning}
          style={{ marginRight: '10px', padding: '10px' }}
        >
          Run Concurrent Only
        </button>
        <button
          onClick={resetBenchmark}
          style={{ padding: '10px' }}
        >
          Reset
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        {showSimple && (
          <div style={{ flex: 1, border: '2px solid green', padding: '10px' }}>
            <Profiler id="simple" onRender={onRenderSimple}>
              <SimpleCounter mode="simple" />
            </Profiler>
            <div style={{ marginTop: '20px', fontSize: '12px' }}>
              <h4>Metrics</h4>
              <div>Total Renders: {simpleMetrics.totalRenders}</div>
              <div>Total Duration: {simpleMetrics.totalDuration.toFixed(2)}ms</div>
              <div>Avg Duration: {simpleMetrics.avgDuration.toFixed(2)}ms</div>
              <div>
                Mounts: {simpleMetrics.renders.filter((r) => r.phase === 'mount').length}
              </div>
              <div>
                Updates: {simpleMetrics.renders.filter((r) => r.phase === 'update').length}
              </div>
            </div>
          </div>
        )}

        {showConcurrent && (
          <div style={{ flex: 1, border: '2px solid blue', padding: '10px' }}>
            <Profiler id="concurrent" onRender={onRenderConcurrent}>
              <SimpleCounter mode="concurrent" />
            </Profiler>
            <div style={{ marginTop: '20px', fontSize: '12px' }}>
              <h4>Metrics</h4>
              <div>Total Renders: {concurrentMetrics.totalRenders}</div>
              <div>Total Duration: {concurrentMetrics.totalDuration.toFixed(2)}ms</div>
              <div>Avg Duration: {concurrentMetrics.avgDuration.toFixed(2)}ms</div>
              <div>
                Mounts: {concurrentMetrics.renders.filter((r) => r.phase === 'mount').length}
              </div>
              <div>
                Updates:{' '}
                {concurrentMetrics.renders.filter((r) => r.phase === 'update').length}
              </div>
            </div>
          </div>
        )}
      </div>

      {showSimple && showConcurrent && (
        <div style={{ marginTop: '20px', padding: '10px', background: '#fff3cd' }}>
          <h3>Comparison</h3>
          <div>
            Render Count Difference:{' '}
            {concurrentMetrics.totalRenders - simpleMetrics.totalRenders}{' '}
            {concurrentMetrics.totalRenders > simpleMetrics.totalRenders
              ? '(Concurrent has more renders)'
              : '(Simple has more renders)'}
          </div>
          <div>
            Duration Difference:{' '}
            {(concurrentMetrics.totalDuration - simpleMetrics.totalDuration).toFixed(2)}ms
            {concurrentMetrics.totalDuration > simpleMetrics.totalDuration
              ? ' (Concurrent is slower)'
              : ' (Simple is slower)'}
          </div>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '10px', background: '#e7f3ff' }}>
        <h3>Expected Results</h3>
        <p>
          <strong>Simple Mode:</strong> Should show fewer renders in React DevTools when clicking
          "Change Name" because proxy tracking filters out unaccessed properties.
        </p>
        <p>
          <strong>Concurrent Mode:</strong> May show additional reconciliation phases in DevTools
          Profiler due to useSyncExternalStore's tearing prevention checks.
        </p>
        <p>
          <strong>Key Metric:</strong> Look at the DevTools Profiler flame graph. Simple mode
          should have a cleaner, simpler render tree with fewer reconciliation phases.
        </p>
      </div>
    </div>
  );
};

// Export for use in other apps
export default PerformanceBenchmarkApp;
