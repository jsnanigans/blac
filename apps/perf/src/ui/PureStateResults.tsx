import React from 'react';
import { formatBytes, formatMs } from '../shared/stats';
import type { PureStateResult, RetainedMemoryResult } from '../shared/types';

interface Props {
  results: PureStateResult[];
  memory: RetainedMemoryResult[];
}

const RetainedMemory: React.FC<{ memory: RetainedMemoryResult[] }> = ({
  memory,
}) => {
  if (memory.length === 0) return null;
  return (
    <div className="results-section">
      <h3>Retained Memory (per live instance)</h3>
      <table className="results-table">
        <thead>
          <tr>
            <th>Library</th>
            <th>Instances</th>
            <th>Median</th>
            <th>Min</th>
            <th>Max</th>
          </tr>
        </thead>
        <tbody>
          {memory.map((m) => (
            <tr key={m.library}>
              <td>{m.library}</td>
              <td>{m.instances}</td>
              <td>{formatBytes(m.bytesPerInstance.median)}</td>
              <td>{formatBytes(m.bytesPerInstance.min)}</td>
              <td>{formatBytes(m.bytesPerInstance.max)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const PureStateResults: React.FC<Props> = ({ results, memory }) => {
  if (results.length === 0) return null;

  const libraries = [...new Set(results.map((r) => r.library))];
  const operations = [...new Set(results.map((r) => r.operation))];

  return (
    <div className="results-section">
      <h3>Pure State Throughput (no React)</h3>
      <table className="results-table">
        <thead>
          <tr>
            <th>Operation</th>
            {libraries.map((lib) => (
              <th key={lib}>{lib}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {operations.map((op) => {
            const opResults = libraries.map((lib) =>
              results.find((r) => r.library === lib && r.operation === op),
            );
            const fastestOps = Math.max(
              ...opResults.map((r) => r?.opsPerSecond ?? 0),
            );

            return (
              <tr key={op}>
                <td>{op}</td>
                {opResults.map((r, i) => {
                  if (!r) return <td key={libraries[i]}>-</td>;
                  const isFastest = Math.abs(r.opsPerSecond - fastestOps) < 1;
                  return (
                    <td
                      key={libraries[i]}
                      style={{
                        color: isFastest
                          ? 'var(--color-fastest)'
                          : 'var(--color-ok)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      <strong>
                        {r.opsPerSecond > 1000
                          ? `${(r.opsPerSecond / 1000).toFixed(1)}k`
                          : r.opsPerSecond.toFixed(0)}{' '}
                        ops/s
                      </strong>
                      <br />
                      <span className="stat-detail">
                        avg: {formatMs(r.avgDuration.mean)} ±
                        {formatMs(r.avgDuration.stddev)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <RetainedMemory memory={memory} />
    </div>
  );
};
