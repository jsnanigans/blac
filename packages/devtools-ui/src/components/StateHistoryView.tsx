import React, { FC, useState, useRef } from 'react';
import JsonView from '@uiw/react-json-view';
import type { StateSnapshot } from '../blocs';
import { SectionHeader } from './SectionHeader';
import { T } from '../theme';
import { extractChanges } from '../utils/extractChanges';
import { formatRelative } from '../utils/formatRelative';
import { jsonViewTheme } from '../utils/jsonViewTheme';

// ---- ChangedPathsChips (inline copy for StateHistoryView) -------------------

const ChangedPathsChips: FC<{ paths: string[] | 'all' }> = ({ paths }) => {
  const chipStyle: React.CSSProperties = {
    fontSize: '9px',
    padding: '0 4px',
    background: 'rgba(0,122,204,0.15)',
    border: '1px solid rgba(0,122,204,0.35)',
    borderRadius: '3px',
    color: T.textAccent,
    fontFamily: T.fontMono,
    lineHeight: '14px',
    display: 'inline-block',
    whiteSpace: 'nowrap',
  };

  if (paths === 'all') {
    return (
      <span style={chipStyle} title="All paths changed">
        &lt;all&gt;
      </span>
    );
  }

  const MAX_VISIBLE = 5;
  const visible = paths.slice(0, MAX_VISIBLE);
  const overflow = paths.length - MAX_VISIBLE;

  return (
    <span
      style={{ display: 'inline-flex', gap: '2px', flexWrap: 'nowrap' }}
      title={paths.join(', ')}
    >
      {visible.map((p) => (
        <span key={p} style={chipStyle}>
          {p}
        </span>
      ))}
      {overflow > 0 && (
        <span style={{ ...chipStyle, opacity: 0.7 }}>+{overflow}</span>
      )}
    </span>
  );
};

interface StateHistoryViewProps {
  history: StateSnapshot[];
  currentState: any;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onTimeTravel?: (state: any) => void;
}

export const StateHistoryView: FC<StateHistoryViewProps> = React.memo(
  ({ history, currentState, isExpanded, onToggleExpanded, onTimeTravel }) => {
    const [restoredTimestamp, setRestoredTimestamp] = useState<number | null>(
      null,
    );
    const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleRestore = (state: any, timestamp: number) => {
      onTimeTravel?.(state);
      setRestoredTimestamp(timestamp);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(
        () => setRestoredTimestamp(null),
        1500,
      );
    };

    const historyEntries: Array<{
      snapshot: StateSnapshot;
      changes: any;
      previousState: any;
    }> = [];

    if (history.length > 0) {
      const mostRecent = history[0];
      const changes = extractChanges(mostRecent.state, currentState);
      historyEntries.push({
        snapshot: {
          state: currentState,
          timestamp: Date.now(),
          callstack: mostRecent.callstack,
          trigger: mostRecent.trigger,
          paths: mostRecent.paths,
        },
        changes,
        previousState: mostRecent.state,
      });
    }

    for (let i = 0; i < history.length; i++) {
      const snapshot = history[i];
      const nextSnapshot = history[i + 1];
      if (nextSnapshot) {
        historyEntries.push({
          snapshot,
          changes: extractChanges(nextSnapshot.state, snapshot.state),
          previousState: nextSnapshot.state,
        });
      } else {
        historyEntries.push({
          snapshot,
          changes: snapshot.state,
          previousState: null,
        });
      }
    }

    return (
      <div>
        <SectionHeader
          label="State History"
          isExpanded={isExpanded}
          onToggle={onToggleExpanded}
          badge={
            history.length > 0
              ? `${historyEntries.length} snapshots`
              : undefined
          }
        />

        {isExpanded && (
          <div>
            {historyEntries.length === 0 ? (
              <div
                style={{
                  color: T.text2,
                  fontSize: '12px',
                  padding: '15px',
                  textAlign: 'center',
                  border: `1px solid ${T.border1}`,
                  borderRadius: T.radius,
                  background: T.bg2,
                }}
              >
                No state changes recorded yet
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {historyEntries.map((entry, index) => {
                  const hasChanges = entry.changes !== undefined;
                  const isCurrent = index === 0;
                  const isInitial = entry.previousState === null;
                  const isRestored =
                    restoredTimestamp === entry.snapshot.timestamp;

                  return (
                    <div
                      key={entry.snapshot.timestamp}
                      style={{
                        border: `1px solid ${T.border1}`,
                        borderRadius: T.radius,
                        background: T.bg2,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Header */}
                      <div
                        style={{
                          padding: '8px 10px',
                          background: isCurrent ? '#1a3a1a' : T.bg3,
                          borderBottom: `1px solid ${T.border1}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: isCurrent ? T.success : T.text2,
                            }}
                          >
                            {isCurrent
                              ? 'CURRENT'
                              : isInitial
                                ? 'INITIAL'
                                : `SNAPSHOT ${historyEntries.length - index}`}
                          </span>
                          {!isCurrent && (
                            <span style={{ fontSize: '10px', color: T.text2 }}>
                              {formatRelative(entry.snapshot.timestamp)}
                            </span>
                          )}
                          {entry.snapshot.trigger && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 5px',
                                background: T.bgAccent,
                                border: `1px solid ${T.borderAccent}40`,
                                borderRadius: T.radiusSm,
                                color: T.textAccent,
                                fontFamily: T.fontMono,
                              }}
                              title="Method that triggered this state change"
                            >
                              {entry.snapshot.trigger}()
                            </span>
                          )}
                          {entry.snapshot.paths !== undefined && (
                            <ChangedPathsChips paths={entry.snapshot.paths} />
                          )}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          {hasChanges && !isInitial && !isCurrent && (
                            <span
                              style={{
                                fontSize: '10px',
                                color: T.success,
                                fontWeight: 600,
                              }}
                            >
                              CHANGED
                            </span>
                          )}
                          {!isCurrent && onTimeTravel && (
                            <button
                              onClick={() =>
                                handleRestore(
                                  entry.snapshot.state,
                                  entry.snapshot.timestamp,
                                )
                              }
                              style={{
                                fontSize: '10px',
                                padding: '2px 7px',
                                background: isRestored
                                  ? T.success
                                  : 'transparent',
                                border: `1px solid ${isRestored ? T.success : T.border3}`,
                                color: isRestored ? '#fff' : T.text2,
                                borderRadius: T.radiusSm,
                                cursor: 'pointer',
                              }}
                            >
                              {isRestored ? 'Restored' : '↩ Restore'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Callstack */}
                      {entry.snapshot.callstack && (
                        <pre
                          style={{
                            margin: '0',
                            padding: '8px 10px',
                            background: '#252526',
                            borderBottom: `1px solid ${T.border1}`,
                            fontSize: '9px',
                            color: '#d4d4d4',
                            fontFamily: 'Monaco, Menlo, Consolas, monospace',
                            lineHeight: '1.3',
                            overflow: 'auto',
                            maxHeight: '100px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                          }}
                        >
                          {entry.snapshot.callstack}
                        </pre>
                      )}

                      {/* Content */}
                      <div style={{ padding: '10px' }}>
                        {!hasChanges && !isInitial ? (
                          <div
                            style={{
                              color: T.text2,
                              fontSize: '12px',
                              fontStyle: 'italic',
                            }}
                          >
                            No changes
                          </div>
                        ) : (
                          <JsonView
                            value={
                              typeof entry.changes === 'object' &&
                              entry.changes !== null
                                ? entry.changes
                                : { value: entry.changes ?? null }
                            }
                            style={jsonViewTheme('#1e1e1e') as any}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

StateHistoryView.displayName = 'StateHistoryView';
