import React, { useRef, useState } from 'react';
import { BlacFrameworkBenchmark } from './libraries/blac/FrameworkBenchmark';
import {
  ProfilerWrapper,
  type ProfilerHandle,
} from './harness/ProfilerWrapper';
import { measureEndToEnd } from './harness/timing';
import type { BenchmarkAPI } from './shared/types';
import { OPERATION_LABELS, type OperationName } from './shared/types';
import './demo.css';

const MAX_LOG_ENTRIES = 8;

interface TimingEntry {
  label: string;
  endToEnd: number;
  renderActual: number;
  renderBase: number;
}

/**
 * Interactive manual demo of the Blac js-framework-benchmark harness, served
 * at `/demo`. Lets you trigger each operation by hand and watch the full
 * table render, separate from the automated Dashboard benchmark suite.
 */
export const DemoPage: React.FC = () => {
  const apiRef = useRef<BenchmarkAPI | null>(null);
  const profilerRef = useRef<ProfilerHandle | null>(null);
  const [selectId, setSelectId] = useState('');
  const [removeId, setRemoveId] = useState('');
  const [log, setLog] = useState<TimingEntry[]>([]);

  const handleReady = (api: BenchmarkAPI) => {
    apiRef.current = api;
  };

  const runTimed = async (label: string, fn: () => void) => {
    profilerRef.current?.reset();
    const endToEnd = await measureEndToEnd(fn);
    const metrics = profilerRef.current?.getMetrics() ?? [];
    const renderMetrics = metrics.filter(
      (m) => m.phase === 'update' || m.phase === 'mount',
    );
    const last = renderMetrics[renderMetrics.length - 1];
    setLog((prev) =>
      [
        {
          label,
          endToEnd,
          renderActual: last?.actualDuration ?? 0,
          renderBase: last?.baseDuration ?? 0,
        },
        ...prev,
      ].slice(0, MAX_LOG_ENTRIES),
    );
  };

  const operations: OperationName[] = [
    'run',
    'runLots',
    'add',
    'update',
    'clear',
    'swapRows',
  ];

  return (
    <div className="demo-page">
      <h1>Blac Framework Benchmark Demo</h1>
      <p style={{ maxWidth: 720 }}>
        Manually trigger the same operations the automated benchmark measures
        and see the full table render. Not part of the benchmark suite.
      </p>

      <div className="demo-controls">
        {operations.map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => {
              const api = apiRef.current;
              if (api) void runTimed(OPERATION_LABELS[op], () => api[op]());
            }}
          >
            {OPERATION_LABELS[op]}
          </button>
        ))}
      </div>

      <div className="demo-forms">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const id = Number(selectId);
            const api = apiRef.current;
            if (!Number.isNaN(id) && api) {
              void runTimed('Select row', () => api.select(id));
            }
          }}
        >
          <input
            type="number"
            placeholder="row id"
            value={selectId}
            onChange={(e) => setSelectId(e.target.value)}
          />
          <button type="submit">Select row</button>
        </form>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const id = Number(removeId);
            const api = apiRef.current;
            if (!Number.isNaN(id) && api) {
              void runTimed('Remove row', () => api.remove(id));
            }
          }}
        >
          <input
            type="number"
            placeholder="row id"
            value={removeId}
            onChange={(e) => setRemoveId(e.target.value)}
          />
          <button type="submit">Remove row</button>
        </form>
      </div>

      <div className="demo-stats">
        <h3>Operation timing</h3>
        {log.length === 0 ? (
          <p className="stat-detail">
            Trigger an operation above to see timing.
          </p>
        ) : (
          <table className="results-table">
            <thead>
              <tr>
                <th>Operation</th>
                <th>End-to-end (ms)</th>
                <th>Render actual (ms)</th>
                <th>Render base (ms)</th>
              </tr>
            </thead>
            <tbody>
              {log.map((entry, i) => (
                <tr key={i}>
                  <td>{entry.label}</td>
                  <td>{entry.endToEnd.toFixed(2)}</td>
                  <td>{entry.renderActual.toFixed(2)}</td>
                  <td>{entry.renderBase.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ProfilerWrapper id="demo" ref={profilerRef}>
        <BlacFrameworkBenchmark onReady={handleReady} />
      </ProfilerWrapper>
    </div>
  );
};
