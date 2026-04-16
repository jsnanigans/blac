import React, { useCallback, useMemo, useState } from 'react';
import { formatMs } from '../shared/stats';
import type {
  LibraryResults,
  OperationResult,
  PureStateResult,
  StatResult,
} from '../shared/types';

interface Props {
  pureResults: PureStateResult[];
  reactResults: LibraryResults[];
}

const CATEGORIES: Record<string, string[]> = {
  'CRUD Operations': [
    'create 1k',
    'create 10k',
    'append 1k',
    'update every 10th',
    'clear',
  ],
  'State Update Patterns': [
    'redundant emit',
    'redundant patch',
    'patch 1 of 20 fields',
    'nested object update',
    'batch rapid updates',
  ],
  'Subscription & Notification': [
    'notify 100 subscribers',
    'selector notification skip',
    'subscriber with computed filter',
  ],
  'Derived & Cross-Store': [
    'derived state computation',
    'cross-store propagation',
    'multi-store coordination',
  ],
};

interface ComparisonRow {
  operation: string;
  results: Map<string, PureStateResult>;
  fastest: string;
  slowestRatio: number;
  blacRatio: number | null;
}

function buildComparisons(results: PureStateResult[]): ComparisonRow[] {
  const operations = [...new Set(results.map((r) => r.operation))];
  return operations.map((op) => {
    const opResults = results.filter((r) => r.operation === op);
    const byLib = new Map(opResults.map((r) => [r.library, r]));
    const fastestResult = opResults.reduce((a, b) =>
      a.avgDuration.median < b.avgDuration.median ? a : b,
    );
    const slowestResult = opResults.reduce((a, b) =>
      a.avgDuration.median > b.avgDuration.median ? a : b,
    );
    const blac = byLib.get('Blac');
    const blacRatio =
      blac && fastestResult.avgDuration.median > 0
        ? blac.avgDuration.median / fastestResult.avgDuration.median
        : null;
    return {
      operation: op,
      results: byLib,
      fastest: fastestResult.library,
      slowestRatio:
        fastestResult.avgDuration.median > 0
          ? slowestResult.avgDuration.median / fastestResult.avgDuration.median
          : 1,
      blacRatio,
    };
  });
}

function getRatioColor(ratio: number): string {
  if (ratio <= 1.05) return 'var(--color-fastest)';
  if (ratio <= 1.5) return 'var(--color-ok)';
  return 'var(--color-slow)';
}

function formatRatio(ratio: number): string {
  if (ratio <= 1.05) return 'fastest';
  return `${ratio.toFixed(2)}x slower`;
}

function statRow(stat: StatResult): string {
  const spread = stat.max - stat.min;
  const cv = stat.mean > 0 ? (stat.stddev / stat.mean) * 100 : 0;
  const skew =
    stat.mean > 0 ? ((stat.mean - stat.median) / stat.mean) * 100 : 0;
  return `${formatMs(stat.min)} | ${formatMs(stat.median)} | ${formatMs(stat.mean)} | ${formatMs(stat.p95)} | ${formatMs(stat.max)} | ${formatMs(stat.stddev)} | ${formatMs(spread)} | ${cv.toFixed(1)}% | ${skew > 0 ? '+' : ''}${skew.toFixed(1)}%`;
}

export function generateMarkdownReport(
  pureResults: PureStateResult[],
  reactResults: LibraryResults[],
): string {
  const lines: string[] = [];
  const ln = (s = '') => lines.push(s);

  const libraries = [...new Set(pureResults.map((r) => r.library))];
  const comparisons = buildComparisons(pureResults);

  if (pureResults.length > 0) {
    // Scorecard
    const scores: Record<
      string,
      { wins: number; losses: number; ratios: number[] }
    > = {};
    for (const lib of libraries)
      scores[lib] = { wins: 0, losses: 0, ratios: [] };
    for (const row of comparisons) {
      const fastestMedian = Math.min(
        ...[...row.results.values()].map((r) => r.avgDuration.median),
      );
      for (const lib of libraries) {
        const r = row.results.get(lib);
        if (!r) continue;
        const ratio =
          fastestMedian > 0 ? r.avgDuration.median / fastestMedian : 1;
        scores[lib].ratios.push(ratio);
        if (ratio <= 1.05) scores[lib].wins++;
        if (ratio > 1.5) scores[lib].losses++;
      }
    }

    ln('# React State Management Benchmarks');
    ln();
    ln('## Scorecard');
    ln();
    ln('| Library | Wins | Slow (>1.5x) | Geometric Mean |');
    ln('|---|---|---|---|');
    for (const lib of libraries) {
      const s = scores[lib];
      const geo =
        s.ratios.length > 0
          ? Math.exp(
              s.ratios.reduce((a, b) => a + Math.log(b), 0) / s.ratios.length,
            )
          : 1;
      ln(
        `| ${lib} | ${s.wins} wins | ${s.losses} slow (>1.5x) | ${geo.toFixed(2)}x |`,
      );
    }

    // Action items
    const actions: {
      severity: string;
      op: string;
      msg: string;
      gap?: string;
      ratio: number;
    }[] = [];
    for (const row of comparisons) {
      if (row.blacRatio === null) continue;
      const blac = row.results.get('Blac');
      if (!blac) continue;
      const fastestMedian = Math.min(
        ...[...row.results.values()].map((r) => r.avgDuration.median),
      );
      const fastestLib =
        [...row.results.entries()].find(
          ([, r]) => Math.abs(r.avgDuration.median - fastestMedian) < 0.001,
        )?.[0] ?? '';

      if (row.blacRatio > 2) {
        actions.push({
          severity: 'critical',
          op: row.operation,
          msg: `Blac is ${row.blacRatio.toFixed(1)}x slower than ${fastestLib} (${formatMs(blac.avgDuration.median)} vs ${formatMs(fastestMedian)})`,
          gap: `Gap: ${formatMs(blac.avgDuration.median - fastestMedian)} per operation`,
          ratio: row.blacRatio,
        });
      } else if (row.blacRatio > 1.25) {
        actions.push({
          severity: 'warning',
          op: row.operation,
          msg: `Blac is ${row.blacRatio.toFixed(2)}x slower than ${fastestLib} (${formatMs(blac.avgDuration.median)} vs ${formatMs(fastestMedian)})`,
          ratio: row.blacRatio,
        });
      } else if (row.blacRatio <= 1.05 && fastestLib === 'Blac') {
        actions.push({
          severity: 'win',
          op: row.operation,
          msg: `Blac wins at ${formatMs(blac.avgDuration.median)}`,
          ratio: row.blacRatio,
        });
      }
    }
    actions.sort((a, b) => b.ratio - a.ratio);

    const critical = actions.filter((a) => a.severity === 'critical');
    const warnings = actions.filter((a) => a.severity === 'warning');
    const wins = actions.filter((a) => a.severity === 'win');

    if (actions.length > 0) {
      ln();
      ln('## Blac Action Items');
      if (critical.length > 0) {
        ln();
        ln('### Critical (>2x slower)');
        ln();
        ln('| Operation | Result |');
        ln('|---|---|');
        for (const a of critical) ln(`| ${a.op} | ${a.msg} — ${a.gap} |`);
      }
      if (warnings.length > 0) {
        ln();
        ln('### Needs Attention (>1.25x slower)');
        ln();
        ln('| Operation | Result |');
        ln('|---|---|');
        for (const a of warnings) ln(`| ${a.op} | ${a.msg} |`);
      }
      if (wins.length > 0) {
        ln();
        ln('### Wins');
        ln();
        ln('| Operation | Result |');
        ln('|---|---|');
        for (const a of wins) ln(`| ${a.op} | ${a.msg} |`);
      }
    }

    // Pure state breakdown by category
    ln();
    ln('## Pure State — Detailed Breakdown');

    const allCategorized = Object.values(CATEGORIES).flat();
    const uncategorized = comparisons
      .filter((c) => !allCategorized.includes(c.operation))
      .map((c) => c.operation);

    const cats = {
      ...CATEGORIES,
      ...(uncategorized.length > 0 ? { Other: uncategorized } : {}),
    };

    for (const [category, opNames] of Object.entries(cats)) {
      const rows = comparisons.filter((c) => opNames.includes(c.operation));
      if (rows.length === 0) continue;

      // Summary table
      ln();
      ln(`### ${category} — Summary`);
      ln();
      const headerCols = libraries.flatMap((lib) => [
        `${lib} Median`,
        `${lib} vs Fastest`,
      ]);
      ln(`| Operation | ${headerCols.join(' | ')} |`);
      ln(`|---|${headerCols.map(() => '---').join('|')}|`);
      for (const row of rows) {
        const fastestMedian = Math.min(
          ...[...row.results.values()].map((r) => r.avgDuration.median),
        );
        const cells = libraries.flatMap((lib) => {
          const r = row.results.get(lib);
          if (!r) return ['-', '-'];
          const ratio =
            fastestMedian > 0 ? r.avgDuration.median / fastestMedian : 1;
          return [formatMs(r.avgDuration.median), formatRatio(ratio)];
        });
        ln(`| ${row.operation} | ${cells.join(' | ')} |`);
      }

      // Detailed stats per operation
      ln();
      ln(`### ${category} — Detailed Stats`);
      for (const row of rows) {
        const libs = [...row.results.keys()];
        ln();
        ln(`#### ${row.operation}`);
        ln();
        ln(
          '| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |',
        );
        ln('|---|---|---|---|---|---|---|---|---|---|');
        for (const lib of libs) {
          const r = row.results.get(lib);
          if (!r) continue;
          ln(`| ${lib} | ${statRow(r.avgDuration)} |`);
        }
      }
    }
  }

  // React benchmarks
  if (reactResults.length > 0) {
    const allOps = reactResults[0].operations.map((o) => o.operation);

    ln();
    ln('## React Benchmark Details');

    for (const op of allOps) {
      const opResults = reactResults
        .map((r) => ({
          library: r.library,
          result: r.operations.find((o) => o.operation === op),
        }))
        .filter(
          (r): r is { library: string; result: OperationResult } =>
            r.result !== undefined,
        );

      ln();
      ln(`### ${op}`);
      ln();
      ln(
        '| Library | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |',
      );
      ln('|---|---|---|---|---|---|---|');
      for (const { library, result: r } of opResults) {
        const cv =
          r.endToEnd.mean > 0 ? (r.endToEnd.stddev / r.endToEnd.mean) * 100 : 0;
        const overhead = r.endToEnd.median - r.renderActual.median;
        ln(
          `| ${library} | ${formatMs(r.endToEnd.median)} | ${formatMs(r.renderActual.median)} | ${formatMs(overhead)} | ${formatMs(r.endToEnd.p95)} | ${formatMs(r.endToEnd.stddev)} | ${cv.toFixed(1)}% |`,
        );
      }
    }
  }

  return lines.join('\n');
}

function BarChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 0.001);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {values.map((v, i) => {
        const pct = (v / max) * 100;
        const isFastest = Math.abs(v - Math.min(...values)) < 0.001;
        return (
          <div
            key={labels[i]}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span
              style={{
                width: 100,
                fontSize: 12,
                textAlign: 'right',
                color: 'var(--color-text-muted)',
              }}
            >
              {labels[i]}
            </span>
            <div
              style={{
                flex: 1,
                height: 20,
                background: 'var(--color-bg)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: isFastest
                    ? 'var(--color-fastest)'
                    : pct > 66
                      ? 'var(--color-slow)'
                      : 'var(--color-ok)',
                  borderRadius: 3,
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <span
              style={{
                width: 80,
                fontSize: 12,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatMs(v)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DistributionRow({ stat, label }: { stat: StatResult; label: string }) {
  const spread = stat.max - stat.min;
  const cv = stat.mean > 0 ? (stat.stddev / stat.mean) * 100 : 0;
  const skew =
    stat.mean > 0 ? ((stat.mean - stat.median) / stat.mean) * 100 : 0;
  return (
    <tr>
      <td>{label}</td>
      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatMs(stat.min)}
      </td>
      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
        {formatMs(stat.median)}
      </td>
      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatMs(stat.mean)}
      </td>
      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatMs(stat.p95)}
      </td>
      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatMs(stat.max)}
      </td>
      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatMs(stat.stddev)}
      </td>
      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMs(spread)}</td>
      <td
        style={{
          fontVariantNumeric: 'tabular-nums',
          color:
            cv > 30
              ? 'var(--color-slow)'
              : cv > 15
                ? 'var(--color-ok)'
                : 'var(--color-text-muted)',
        }}
      >
        {cv.toFixed(1)}%
      </td>
      <td
        style={{
          fontVariantNumeric: 'tabular-nums',
          color:
            Math.abs(skew) > 10 ? 'var(--color-ok)' : 'var(--color-text-muted)',
        }}
      >
        {skew > 0 ? '+' : ''}
        {skew.toFixed(1)}%
      </td>
    </tr>
  );
}

function Scorecard({
  comparisons,
  libraries,
}: {
  comparisons: ComparisonRow[];
  libraries: string[];
}) {
  const scores = useMemo(() => {
    const s: Record<
      string,
      { wins: number; losses: number; avgRatio: number[] }
    > = {};
    for (const lib of libraries) {
      s[lib] = { wins: 0, losses: 0, avgRatio: [] };
    }
    for (const row of comparisons) {
      const fastestMedian = Math.min(
        ...[...row.results.values()].map((r) => r.avgDuration.median),
      );
      for (const lib of libraries) {
        const r = row.results.get(lib);
        if (!r) continue;
        const ratio =
          fastestMedian > 0 ? r.avgDuration.median / fastestMedian : 1;
        s[lib].avgRatio.push(ratio);
        if (ratio <= 1.05) s[lib].wins++;
        if (ratio > 1.5) s[lib].losses++;
      }
    }
    return s;
  }, [comparisons, libraries]);

  return (
    <div className="report-scorecard">
      <h3>Scorecard</h3>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {libraries.map((lib) => {
          const s = scores[lib];
          const geoMean =
            s.avgRatio.length > 0
              ? Math.exp(
                  s.avgRatio.reduce((a, b) => a + Math.log(b), 0) /
                    s.avgRatio.length,
                )
              : 1;
          return (
            <div key={lib} className="scorecard-card">
              <div className="scorecard-lib">{lib}</div>
              <div className="scorecard-row">
                <span style={{ color: 'var(--color-fastest)' }}>
                  {s.wins} wins
                </span>
                <span style={{ color: 'var(--color-text-muted)' }}>/</span>
                <span
                  style={{
                    color:
                      s.losses > 0
                        ? 'var(--color-slow)'
                        : 'var(--color-text-muted)',
                  }}
                >
                  {s.losses} slow ({'>'}1.5x)
                </span>
              </div>
              <div className="scorecard-geo">
                Geometric mean:{' '}
                <strong style={{ color: getRatioColor(geoMean) }}>
                  {geoMean.toFixed(2)}x
                </strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ActionItem {
  severity: 'critical' | 'warning' | 'info';
  operation: string;
  message: string;
  ratio: number;
  blacMedian: number;
  fastestMedian: number;
  fastestLib: string;
}

function ActionItems({ comparisons }: { comparisons: ComparisonRow[] }) {
  const items = useMemo(() => {
    const actions: ActionItem[] = [];
    for (const row of comparisons) {
      if (row.blacRatio === null) continue;
      const blac = row.results.get('Blac');
      if (!blac) continue;
      const fastestMedian = Math.min(
        ...[...row.results.values()].map((r) => r.avgDuration.median),
      );
      const fastestLib =
        [...row.results.entries()].find(
          ([, r]) => Math.abs(r.avgDuration.median - fastestMedian) < 0.001,
        )?.[0] ?? '';

      if (row.blacRatio > 2) {
        actions.push({
          severity: 'critical',
          operation: row.operation,
          message: `Blac is ${row.blacRatio.toFixed(1)}x slower than ${fastestLib} (${formatMs(blac.avgDuration.median)} vs ${formatMs(fastestMedian)})`,
          ratio: row.blacRatio,
          blacMedian: blac.avgDuration.median,
          fastestMedian,
          fastestLib,
        });
      } else if (row.blacRatio > 1.25) {
        actions.push({
          severity: 'warning',
          operation: row.operation,
          message: `Blac is ${row.blacRatio.toFixed(2)}x slower than ${fastestLib} (${formatMs(blac.avgDuration.median)} vs ${formatMs(fastestMedian)})`,
          ratio: row.blacRatio,
          blacMedian: blac.avgDuration.median,
          fastestMedian,
          fastestLib,
        });
      } else if (row.blacRatio <= 1.05 && fastestLib === 'Blac') {
        actions.push({
          severity: 'info',
          operation: row.operation,
          message: `Blac wins at ${formatMs(blac.avgDuration.median)}`,
          ratio: row.blacRatio,
          blacMedian: blac.avgDuration.median,
          fastestMedian,
          fastestLib,
        });
      }
    }
    return actions.sort((a, b) => b.ratio - a.ratio);
  }, [comparisons]);

  if (items.length === 0) return null;

  const critical = items.filter((i) => i.severity === 'critical');
  const warnings = items.filter((i) => i.severity === 'warning');
  const wins = items.filter((i) => i.severity === 'info');

  return (
    <div className="report-actions">
      <h3>Blac Action Items</h3>

      {critical.length > 0 && (
        <div className="action-group">
          <h4 style={{ color: 'var(--color-slow)' }}>
            Critical ({'>'}2x slower)
          </h4>
          {critical.map((item) => (
            <div key={item.operation} className="action-item action-critical">
              <strong>{item.operation}</strong>
              <span>{item.message}</span>
              <span className="action-gap">
                Gap: {formatMs(item.blacMedian - item.fastestMedian)} per
                operation
              </span>
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="action-group">
          <h4 style={{ color: 'var(--color-ok)' }}>
            Needs Attention ({'>'}1.25x slower)
          </h4>
          {warnings.map((item) => (
            <div key={item.operation} className="action-item action-warning">
              <strong>{item.operation}</strong>
              <span>{item.message}</span>
            </div>
          ))}
        </div>
      )}

      {wins.length > 0 && (
        <div className="action-group">
          <h4 style={{ color: 'var(--color-fastest)' }}>Wins</h4>
          {wins.map((item) => (
            <div key={item.operation} className="action-item action-win">
              <strong>{item.operation}</strong>
              <span>{item.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategorySection({
  category,
  opNames,
  comparisons,
  libraries,
}: {
  category: string;
  opNames: string[];
  comparisons: ComparisonRow[];
  libraries: string[];
}) {
  const rows = comparisons.filter((c) => opNames.includes(c.operation));
  if (rows.length === 0) return null;

  return (
    <div className="report-category">
      <h4>{category}</h4>
      <table className="results-table">
        <thead>
          <tr>
            <th>Operation</th>
            {libraries.map((lib) => (
              <th key={lib} colSpan={2}>
                {lib}
              </th>
            ))}
          </tr>
          <tr>
            <th />
            {libraries.map((lib) => (
              <React.Fragment key={lib}>
                <th style={{ fontSize: 10 }}>Median</th>
                <th style={{ fontSize: 10 }}>vs Fastest</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const fastestMedian = Math.min(
              ...[...row.results.values()].map((r) => r.avgDuration.median),
            );
            return (
              <tr key={row.operation}>
                <td>{row.operation}</td>
                {libraries.map((lib) => {
                  const r = row.results.get(lib);
                  if (!r) {
                    return (
                      <React.Fragment key={lib}>
                        <td>-</td>
                        <td>-</td>
                      </React.Fragment>
                    );
                  }
                  const ratio =
                    fastestMedian > 0
                      ? r.avgDuration.median / fastestMedian
                      : 1;
                  return (
                    <React.Fragment key={lib}>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatMs(r.avgDuration.median)}
                      </td>
                      <td
                        style={{
                          fontVariantNumeric: 'tabular-nums',
                          color: getRatioColor(ratio),
                          fontWeight: ratio <= 1.05 ? 700 : 400,
                        }}
                      >
                        {formatRatio(ratio)}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {rows.map((row) => {
        const libs = [...row.results.keys()];
        const medians = libs.map(
          (lib) => row.results.get(lib)?.avgDuration.median ?? 0,
        );
        return (
          <div key={row.operation} className="report-op-detail">
            <h5>{row.operation}</h5>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px' }}>
                <BarChart values={medians} labels={libs} />
              </div>
              <div style={{ flex: '1 1 400px', overflowX: 'auto' }}>
                <table className="results-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Library</th>
                      <th>Min</th>
                      <th>Median</th>
                      <th>Mean</th>
                      <th>P95</th>
                      <th>Max</th>
                      <th>StdDev</th>
                      <th>Spread</th>
                      <th>CV%</th>
                      <th>Skew</th>
                    </tr>
                  </thead>
                  <tbody>
                    {libs.map((lib) => {
                      const r = row.results.get(lib);
                      if (!r) return null;
                      return (
                        <DistributionRow
                          key={lib}
                          stat={r.avgDuration}
                          label={lib}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReactReport({ results }: { results: LibraryResults[] }) {
  if (results.length === 0) return null;

  const libraries = results.map((r) => r.library);
  const allOps = results[0].operations.map((o) => o.operation);

  return (
    <div className="report-section">
      <h3>React Benchmark Details</h3>

      {allOps.map((op) => {
        const opResults = results
          .map((r) => ({
            library: r.library,
            result: r.operations.find((o) => o.operation === op),
          }))
          .filter(
            (r): r is { library: string; result: OperationResult } =>
              r.result !== undefined,
          );

        const e2eMedians = opResults.map((r) => r.result.endToEnd.median);
        const renderMedians = opResults.map(
          (r) => r.result.renderActual.median,
        );
        const overhead = opResults.map(
          (r) => r.result.endToEnd.median - r.result.renderActual.median,
        );

        return (
          <div key={op} className="report-op-detail">
            <h5>{op}</h5>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px' }}>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                    marginBottom: 4,
                  }}
                >
                  End-to-End
                </div>
                <BarChart values={e2eMedians} labels={libraries} />
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                    margin: '8px 0 4px',
                  }}
                >
                  React Render
                </div>
                <BarChart values={renderMedians} labels={libraries} />
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                    margin: '8px 0 4px',
                  }}
                >
                  Non-Render Overhead
                </div>
                <BarChart values={overhead} labels={libraries} />
              </div>
              <div style={{ flex: '1 1 400px', overflowX: 'auto' }}>
                <table className="results-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Library</th>
                      <th>E2E Med</th>
                      <th>Render Med</th>
                      <th>Overhead</th>
                      <th>E2E P95</th>
                      <th>E2E StdDev</th>
                      <th>E2E CV%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opResults.map(({ library, result: r }) => {
                      const cv =
                        r.endToEnd.mean > 0
                          ? (r.endToEnd.stddev / r.endToEnd.mean) * 100
                          : 0;
                      return (
                        <tr key={library}>
                          <td>{library}</td>
                          <td
                            style={{
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: 600,
                            }}
                          >
                            {formatMs(r.endToEnd.median)}
                          </td>
                          <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatMs(r.renderActual.median)}
                          </td>
                          <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatMs(
                              r.endToEnd.median - r.renderActual.median,
                            )}
                          </td>
                          <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatMs(r.endToEnd.p95)}
                          </td>
                          <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatMs(r.endToEnd.stddev)}
                          </td>
                          <td
                            style={{
                              fontVariantNumeric: 'tabular-nums',
                              color:
                                cv > 30
                                  ? 'var(--color-slow)'
                                  : cv > 15
                                    ? 'var(--color-ok)'
                                    : 'var(--color-text-muted)',
                            }}
                          >
                            {cv.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const BenchmarkReport: React.FC<Props> = ({
  pureResults,
  reactResults,
}) => {
  const libraries = useMemo(
    () => [...new Set(pureResults.map((r) => r.library))],
    [pureResults],
  );
  const comparisons = useMemo(
    () => buildComparisons(pureResults),
    [pureResults],
  );

  const uncategorized = useMemo(() => {
    const allCategorized = Object.values(CATEGORIES).flat();
    return comparisons
      .filter((c) => !allCategorized.includes(c.operation))
      .map((c) => c.operation);
  }, [comparisons]);

  const markdown = useMemo(
    () => generateMarkdownReport(pureResults, reactResults),
    [pureResults, reactResults],
  );

  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [markdown]);

  const hasData = pureResults.length > 0 || reactResults.length > 0;
  if (!hasData) {
    return (
      <div className="report-empty">
        <p>
          Run benchmarks first, then switch to this tab for a detailed report.
        </p>
      </div>
    );
  }

  return (
    <div className="benchmark-report">
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <button
          className="copy-report-btn"
          onClick={handleCopy}
          style={{
            padding: '6px 14px',
            fontSize: 13,
            cursor: 'pointer',
            border: '1px solid var(--color-text-muted)',
            borderRadius: 4,
            background: copied ? 'var(--color-fastest)' : 'var(--color-bg)',
            color: copied ? '#fff' : 'var(--color-text)',
            transition: 'all 0.2s',
          }}
        >
          {copied ? 'Copied!' : 'Copy as Markdown'}
        </button>
      </div>

      {pureResults.length > 0 && (
        <>
          <Scorecard comparisons={comparisons} libraries={libraries} />
          <ActionItems comparisons={comparisons} />

          <div className="report-section">
            <h3>Pure State — Detailed Breakdown</h3>
            {Object.entries(CATEGORIES).map(([category, ops]) => (
              <CategorySection
                key={category}
                category={category}
                opNames={ops}
                comparisons={comparisons}
                libraries={libraries}
              />
            ))}
            {uncategorized.length > 0 && (
              <CategorySection
                category="Other"
                opNames={uncategorized}
                comparisons={comparisons}
                libraries={libraries}
              />
            )}
          </div>
        </>
      )}

      {reactResults.length > 0 && <ReactReport results={reactResults} />}
    </div>
  );
};
