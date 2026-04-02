import React from 'react';
import { formatMs } from '../shared/stats';
import { SCENARIO_CONFIGS } from '../shared/rerender-scenarios';
import type {
  RerenderLibraryResults,
  RerenderOperationResult,
  RerenderScenario,
  StatResult,
} from '../shared/types';
import { RERENDER_SCENARIO_LABELS } from '../shared/types';

interface Props {
  results: RerenderLibraryResults[];
}

function RenderCountCell({
  stat,
  optimal,
}: {
  stat: StatResult;
  optimal: number;
}) {
  let color: string;
  if (optimal === 0) {
    color = stat.median <= 0.5 ? 'var(--color-fastest)' : 'var(--color-slow)';
  } else {
    const ratio = stat.median / optimal;
    color =
      ratio <= 1.1
        ? 'var(--color-fastest)'
        : ratio <= 2
          ? 'var(--color-ok)'
          : 'var(--color-slow)';
  }

  return (
    <td style={{ color, fontVariantNumeric: 'tabular-nums' }}>
      <strong>{stat.median.toFixed(1)}</strong>
      <span style={{ fontSize: '0.75em', opacity: 0.7 }}> / {optimal} opt</span>
      <br />
      <span className="stat-detail">±{stat.stddev.toFixed(1)}</span>
    </td>
  );
}

function TimingCell({ stat, fastest }: { stat: StatResult; fastest: number }) {
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

export const RerenderResultsTable: React.FC<Props> = ({ results }) => {
  if (results.length === 0) return null;

  const allScenarios = results[0].scenarios.map(
    (s) => s.scenario,
  ) as RerenderScenario[];

  function getResult(
    lib: RerenderLibraryResults,
    scenario: RerenderScenario,
  ): RerenderOperationResult | undefined {
    return lib.scenarios.find((s) => s.scenario === scenario);
  }

  return (
    <div className="results-section">
      <h3>Render Count (lower is better — green = optimal)</h3>
      <table className="results-table">
        <thead>
          <tr>
            <th>Scenario</th>
            {results.map((r) => (
              <th key={r.library}>{r.library}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allScenarios.map((scenario) => {
            const optimal = SCENARIO_CONFIGS[scenario].optimalRenders;
            return (
              <tr key={scenario}>
                <td>
                  {RERENDER_SCENARIO_LABELS[scenario]}
                  <br />
                  <span className="stat-detail">
                    {SCENARIO_CONFIGS[scenario].description}
                  </span>
                </td>
                {results.map((r) => {
                  const opResult = getResult(r, scenario);
                  if (!opResult) return <td key={r.library}>-</td>;
                  return (
                    <RenderCountCell
                      key={r.library}
                      stat={opResult.totalRenders}
                      optimal={optimal}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3>End-to-End Timing</h3>
      <table className="results-table">
        <thead>
          <tr>
            <th>Scenario</th>
            {results.map((r) => (
              <th key={r.library}>{r.library}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allScenarios.map((scenario) => {
            const fastest = Math.min(
              ...results.map(
                (r) => getResult(r, scenario)?.endToEnd.median ?? Infinity,
              ),
            );
            return (
              <tr key={scenario}>
                <td>{RERENDER_SCENARIO_LABELS[scenario]}</td>
                {results.map((r) => {
                  const opResult = getResult(r, scenario);
                  if (!opResult) return <td key={r.library}>-</td>;
                  return (
                    <TimingCell
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
    </div>
  );
};
