import React from 'react';
import { formatMs } from '../shared/stats';
import type {
  LibraryResults,
  OperationName,
  StatResult,
} from '../shared/types';
import { OPERATION_LABELS } from '../shared/types';

interface Props {
  results: LibraryResults[];
}

function CellValue({ stat, fastest }: { stat: StatResult; fastest: number }) {
  const isFastest = Math.abs(stat.median - fastest) < 0.01;
  const ratio = fastest > 0 ? stat.median / fastest : 1;
  const color = isFastest
    ? 'var(--color-fastest)'
    : ratio < 1.5
      ? 'var(--color-ok)'
      : 'var(--color-slow)';

  return (
    <td style={{ color, fontVariantNumeric: 'tabular-nums' }}>
      <strong>{formatMs(stat.median)}</strong>
      <br />
      <span className="stat-detail">
        ±{formatMs(stat.stddev)} (p95: {formatMs(stat.p95)})
      </span>
    </td>
  );
}

export const ResultsTable: React.FC<Props> = ({ results }) => {
  if (results.length === 0) return null;

  const allOps = results[0].operations.map((o) => o.operation);

  return (
    <div className="results-section">
      <h3>End-to-End Timing</h3>
      <table className="results-table">
        <thead>
          <tr>
            <th>Operation</th>
            {results.map((r) => (
              <th key={r.library}>{r.library}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allOps.map((op) => {
            const fastest = Math.min(
              ...results.map(
                (r) =>
                  r.operations.find((o) => o.operation === op)?.endToEnd
                    .median ?? Infinity,
              ),
            );
            return (
              <tr key={op}>
                <td>{OPERATION_LABELS[op as OperationName] ?? op}</td>
                {results.map((r) => {
                  const opResult = r.operations.find((o) => o.operation === op);
                  if (!opResult) return <td key={r.library}>-</td>;
                  return (
                    <CellValue
                      key={r.library}
                      stat={opResult.endToEnd}
                      fastest={fastest}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3>React Render Duration (Profiler actualDuration)</h3>
      <table className="results-table">
        <thead>
          <tr>
            <th>Operation</th>
            {results.map((r) => (
              <th key={r.library}>{r.library}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allOps.map((op) => {
            const fastest = Math.min(
              ...results.map(
                (r) =>
                  r.operations.find((o) => o.operation === op)?.renderActual
                    .median ?? Infinity,
              ),
            );
            return (
              <tr key={op}>
                <td>{OPERATION_LABELS[op as OperationName] ?? op}</td>
                {results.map((r) => {
                  const opResult = r.operations.find((o) => o.operation === op);
                  if (!opResult) return <td key={r.library}>-</td>;
                  return (
                    <CellValue
                      key={r.library}
                      stat={opResult.renderActual}
                      fastest={fastest}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
