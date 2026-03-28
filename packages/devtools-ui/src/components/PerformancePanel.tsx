import React, { FC, useEffect, useState } from 'react';
import { T } from '../theme';
import { useBloc } from '@blac/react';
import { DevToolsMetricsBloc, DevToolsLayoutBloc } from '../blocs';
import type { InstanceMetrics } from '../blocs/DevToolsMetricsBloc';

type SortKey =
  | 'updatesPerSecond'
  | 'stateSizeBytes'
  | 'totalUpdates'
  | 'maxBurstRate';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '—';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

function formatMs(ms: number): string {
  if (ms === 0) return '—';
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const SparkBar: FC<{ value: number; max: number; color: string }> = ({
  value,
  max,
  color,
}) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        width: '80px',
      }}
    >
      <div
        style={{
          flex: 1,
          height: '6px',
          background: '#2a2a2a',
          borderRadius: '3px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: '3px',
            transition: 'width 0.3s',
          }}
        />
      </div>
      <span
        style={{
          fontSize: '10px',
          color: '#888',
          minWidth: '28px',
          textAlign: 'right',
        }}
      >
        {value.toFixed(1)}
      </span>
    </div>
  );
};

export const PerformancePanel: FC = React.memo(() => {
  const [metricsState] = useBloc(DevToolsMetricsBloc);
  const [, layoutBloc] = useBloc(DevToolsLayoutBloc);
  const [sortKey, setSortKey] = useState<SortKey>('updatesPerSecond');
  const [sortDesc, setSortDesc] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const ROW_LIMIT = 30;

  const allMetrics = Array.from(metricsState.metrics.values());

  const sorted = [...allMetrics].sort((a, b) => {
    const diff = (b[sortKey] as number) - (a[sortKey] as number);
    return sortDesc ? diff : -diff;
  });

  const visibleRows = showAll ? sorted : sorted.slice(0, ROW_LIMIT);
  const maxUps = Math.max(1, ...allMetrics.map((m) => m.updatesPerSecond));
  const maxSize = Math.max(1, ...allMetrics.map((m) => m.stateSizeBytes));

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  const colStyle = (key: SortKey): React.CSSProperties => ({
    cursor: 'pointer',
    color: sortKey === key ? T.textAccent : T.text2,
    fontWeight: sortKey === key ? 600 : 500,
    userSelect: 'none',
  });

  if (allMetrics.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: '13px',
        }}
      >
        No performance data yet — interact with your app to see metrics
      </div>
    );
  }

  const warnings = allMetrics.flatMap((m) =>
    m.warnings.map((w) => ({ instanceId: m.instanceId, ...w })),
  );

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Warning banner */}
      {warnings.length > 0 && (
        <div
          style={{
            background: '#1e1212',
            borderBottom: `1px solid ${T.error}`,
            padding: '6px 12px',
            fontSize: '11px',
          }}
        >
          <span
            style={{ color: '#ef4444', fontWeight: 600, marginRight: '8px' }}
          >
            ⚠ {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
          </span>
          {warnings.slice(0, 2).map((w, i) => (
            <span key={i} style={{ color: '#aaa', marginRight: '12px' }}>
              {w.instanceId.split(':')[0]}: {w.message}
            </span>
          ))}
          {warnings.length > 2 && (
            <span style={{ color: '#666' }}>+{warnings.length - 2} more</span>
          )}
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11px',
            fontFamily: 'monospace',
          }}
        >
          <thead>
            <tr
              style={{
                background: T.bg3,
                borderBottom: `1px solid ${T.border1}`,
                position: 'sticky',
                top: 0,
              }}
            >
              <th
                style={{
                  padding: '6px 10px',
                  textAlign: 'left',
                  color: T.text2,
                  fontWeight: 500,
                  minWidth: '150px',
                }}
              >
                Instance
              </th>
              <th
                style={{
                  padding: '6px 10px',
                  textAlign: 'left',
                  ...colStyle('updatesPerSecond'),
                }}
                onClick={() => handleSort('updatesPerSecond')}
              >
                Updates/sec{' '}
                {sortKey === 'updatesPerSecond' ? (sortDesc ? '↓' : '↑') : ''}
              </th>
              <th
                style={{
                  padding: '6px 10px',
                  textAlign: 'left',
                  ...colStyle('totalUpdates'),
                }}
                onClick={() => handleSort('totalUpdates')}
              >
                Total {sortKey === 'totalUpdates' ? (sortDesc ? '↓' : '↑') : ''}
              </th>
              <th
                style={{
                  padding: '6px 10px',
                  textAlign: 'left',
                  ...colStyle('maxBurstRate'),
                }}
                onClick={() => handleSort('maxBurstRate')}
              >
                Peak burst{' '}
                {sortKey === 'maxBurstRate' ? (sortDesc ? '↓' : '↑') : ''}
              </th>
              <th
                style={{
                  padding: '6px 10px',
                  textAlign: 'left',
                  ...colStyle('stateSizeBytes'),
                }}
                onClick={() => handleSort('stateSizeBytes')}
              >
                State size{' '}
                {sortKey === 'stateSizeBytes' ? (sortDesc ? '↓' : '↑') : ''}
              </th>
              <th
                style={{
                  padding: '6px 10px',
                  textAlign: 'left',
                  color: T.text2,
                  fontWeight: 500,
                }}
              >
                Avg interval
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((m) => {
              const hasWarning = m.warnings.length > 0;
              return (
                <tr
                  key={m.instanceId}
                  style={{
                    borderBottom: '1px solid #2a2a2a',
                    background: hasWarning ? '#1e1515' : 'transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    layoutBloc.setActiveTab('Instances');
                    layoutBloc.setSelectedId(m.instanceId);
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      hasWarning ? '#261818' : '#1e1e1e';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      hasWarning ? '#1e1515' : 'transparent';
                  }}
                >
                  <td style={{ padding: '6px 10px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {hasWarning && (
                        <span
                          style={{ color: '#ef4444', fontSize: '10px' }}
                          title={m.warnings.map((w) => w.message).join('\n')}
                        >
                          ⚠
                        </span>
                      )}
                      <span style={{ color: '#4FC3F7' }}>{m.className}</span>
                      <span style={{ color: '#555', fontSize: '10px' }}>
                        {m.instanceId.split(':')[1] || ''}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <SparkBar
                      value={m.updatesPerSecond}
                      max={maxUps}
                      color={
                        m.updatesPerSecond > 30
                          ? '#ef4444'
                          : m.updatesPerSecond > 10
                            ? '#FFB74D'
                            : '#10b981'
                      }
                    />
                  </td>
                  <td style={{ padding: '6px 10px', color: '#ccc' }}>
                    {m.totalUpdates}
                  </td>
                  <td style={{ padding: '6px 10px', color: '#ccc' }}>
                    {m.maxBurstRate > 0 ? `${m.maxBurstRate}/s` : '—'}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <SparkBar
                      value={m.stateSizeBytes / 1024}
                      max={maxSize / 1024}
                      color={
                        m.stateSizeBytes > 102400
                          ? '#ef4444'
                          : m.stateSizeBytes > 10240
                            ? '#FFB74D'
                            : '#569cd6'
                      }
                    />
                    <span
                      style={{
                        fontSize: '10px',
                        color: '#888',
                        marginLeft: '4px',
                      }}
                    >
                      {formatBytes(m.stateSizeBytes)}
                    </span>
                  </td>
                  <td style={{ padding: '6px 10px', color: '#888' }}>
                    {formatMs(m.avgUpdateInterval)}
                  </td>
                </tr>
              );
            })}
            {sorted.length > ROW_LIMIT && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: '8px 10px',
                    textAlign: 'center',
                    fontSize: '11px',
                  }}
                >
                  {showAll ? (
                    <span
                      style={{ cursor: 'pointer', color: T.textAccent }}
                      onClick={() => setShowAll(false)}
                    >
                      Showing all {sorted.length} — collapse
                    </span>
                  ) : (
                    <span
                      style={{ cursor: 'pointer', color: T.textAccent }}
                      onClick={() => setShowAll(true)}
                    >
                      Showing {ROW_LIMIT} of {sorted.length} — show all
                    </span>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Update frequency timeline */}
      <UpdateTimeline metrics={sorted} />
    </div>
  );
});

PerformancePanel.displayName = 'PerformancePanel';

/**
 * Simple horizontal bar chart showing recent update density per instance (last 60s).
 */
const UpdateTimeline: FC<{ metrics: InstanceMetrics[] }> = React.memo(
  ({ metrics }) => {
    const [metricsState] = useBloc(DevToolsMetricsBloc);
    const [, setTick] = useState(0);

    useEffect(() => {
      const id = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(id);
    }, []);

    const now = Date.now();
    const WINDOW = 60000; // 60 seconds
    const BUCKETS = 60; // 1 bucket per second

    const activeMetrics = metrics.filter((m) => m.totalUpdates > 0).slice(0, 8);
    if (activeMetrics.length === 0) return null;

    return (
      <div
        style={{
          borderTop: `1px solid ${T.border1}`,
          padding: '10px 12px',
          background: T.bg1,
        }}
      >
        <div style={{ fontSize: '10px', color: T.text2, marginBottom: '6px' }}>
          Update activity — last 60 seconds
        </div>
        {activeMetrics.map((m) => {
          const timestamps =
            metricsState.updateTimestamps.get(m.instanceId) || [];
          const buckets = Array(BUCKETS).fill(0);
          for (const t of timestamps) {
            const age = now - t;
            if (age < WINDOW) {
              const bucketIdx = Math.floor(age / 1000);
              buckets[BUCKETS - 1 - bucketIdx] =
                (buckets[BUCKETS - 1 - bucketIdx] || 0) + 1;
            }
          }
          const maxBucket = Math.max(1, ...buckets);

          return (
            <div
              key={m.instanceId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  color: '#4FC3F7',
                  width: '110px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                title={m.instanceId}
              >
                {m.className}
              </span>
              <div
                style={{
                  display: 'flex',
                  gap: '1px',
                  flex: 1,
                  height: '16px',
                  alignItems: 'flex-end',
                }}
              >
                {buckets.map((count, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${Math.max(0, (count / maxBucket) * 100)}%`,
                      minHeight: count > 0 ? '2px' : '0',
                      background:
                        count > 0
                          ? m.warnings.length > 0
                            ? '#ef4444'
                            : '#569cd6'
                          : '#2a2a2a',
                      borderRadius: '1px',
                      transition: 'height 0.2s',
                    }}
                    title={
                      count > 0
                        ? `${count} update${count !== 1 ? 's' : ''}`
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '9px',
            color: '#444',
            marginTop: '2px',
          }}
        >
          <span>60s ago</span>
          <span>now</span>
        </div>
      </div>
    );
  },
);

UpdateTimeline.displayName = 'UpdateTimeline';
