import React, { useRef, useState } from 'react';
import { BlacFrameworkBenchmark } from './libraries/blac/FrameworkBenchmark';
import type { BenchmarkAPI } from './shared/types';
import { OPERATION_LABELS, type OperationName } from './shared/types';

/**
 * Interactive manual demo of the Blac js-framework-benchmark harness, served
 * at `/demo`. Lets you trigger each operation by hand and watch the full
 * table render, separate from the automated Dashboard benchmark suite.
 */
export const DemoPage: React.FC = () => {
  const apiRef = useRef<BenchmarkAPI | null>(null);
  const [selectId, setSelectId] = useState('');
  const [removeId, setRemoveId] = useState('');

  const handleReady = (api: BenchmarkAPI) => {
    apiRef.current = api;
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
    <div style={{ fontFamily: 'sans-serif', padding: 16 }}>
      <h1>Blac Framework Benchmark Demo</h1>
      <p style={{ maxWidth: 720 }}>
        Manually trigger the same operations the automated benchmark measures
        and see the full table render. Not part of the benchmark suite.
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          margin: '16px 0',
        }}
      >
        {operations.map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => apiRef.current?.[op]()}
          >
            {OPERATION_LABELS[op]}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          margin: '16px 0',
        }}
      >
        <form
          style={{ display: 'flex', gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            const id = Number(selectId);
            if (!Number.isNaN(id)) apiRef.current?.select(id);
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
          style={{ display: 'flex', gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            const id = Number(removeId);
            if (!Number.isNaN(id)) apiRef.current?.remove(id);
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

      <BlacFrameworkBenchmark onReady={handleReady} />
    </div>
  );
};
