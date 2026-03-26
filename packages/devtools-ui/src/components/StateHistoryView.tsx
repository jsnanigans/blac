import React, { FC, useState, useRef } from 'react';
import JsonView from '@uiw/react-json-view';
import type { StateSnapshot } from '../blocs';
import { CallStackView } from './CallStackView';

interface StateHistoryViewProps {
  history: StateSnapshot[];
  currentState: any;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onTimeTravel?: (state: any) => void;
}

export const StateHistoryView: FC<StateHistoryViewProps> = React.memo(
  ({ history, currentState, isExpanded, onToggleExpanded, onTimeTravel }) => {
    const [restoredTimestamp, setRestoredTimestamp] = useState<number | null>(null);
    const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleRestore = (state: any, timestamp: number) => {
      onTimeTravel?.(state);
      setRestoredTimestamp(timestamp);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setRestoredTimestamp(null), 1500);
    };

    const extractChanges = (previous: any, current: any): any => {
      if (previous === current) return undefined;
      if (previous == null || current == null) return current;
      if (typeof previous !== typeof current) return current;
      if (typeof current !== 'object') {
        return previous !== current ? current : undefined;
      }
      if (Array.isArray(current)) {
        if (!Array.isArray(previous) || previous.length !== current.length) return current;
        const changes: any[] = [];
        let hasChanges = false;
        for (let i = 0; i < current.length; i++) {
          const itemChange = extractChanges(previous[i], current[i]);
          if (itemChange !== undefined) { hasChanges = true; changes[i] = itemChange; }
        }
        return hasChanges ? current : undefined;
      }
      const changes: any = {};
      let hasChanges = false;
      for (const key in current) {
        if (!(key in previous)) {
          changes[key] = current[key]; hasChanges = true;
        } else {
          const change = extractChanges(previous[key], current[key]);
          if (change !== undefined) { changes[key] = change; hasChanges = true; }
        }
      }
      for (const key in previous) {
        if (!(key in current)) { changes[key] = undefined; hasChanges = true; }
      }
      return hasChanges ? changes : undefined;
    };

    const formatTime = (timestamp: number): string => {
      const diff = Date.now() - timestamp;
      if (diff < 1000) return 'just now';
      if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return `${Math.floor(diff / 86400000)}d ago`;
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
        snapshot: { state: currentState, timestamp: Date.now(), callstack: mostRecent.callstack },
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
        historyEntries.push({ snapshot, changes: snapshot.state, previousState: null });
      }
    }

    return (
      <div style={{ marginTop: '20px' }}>
        <div
          onClick={onToggleExpanded}
          style={{
            fontSize: '14px',
            marginBottom: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            userSelect: 'none',
            padding: '3px 0',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#569cd6'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#fff'; }}
        >
          <span
            style={{
              display: 'inline-block',
              transition: 'transform 0.2s',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              fontSize: '12px',
            }}
          >
            ▶
          </span>
          <span>State History</span>
          {history.length > 0 && (
            <span style={{ fontSize: '11px', color: '#888', fontWeight: 400, marginLeft: '4px' }}>
              ({historyEntries.length} snapshots)
            </span>
          )}
        </div>

        {isExpanded && (
          <div style={{ marginTop: '10px' }}>
            {historyEntries.length === 0 ? (
              <div
                style={{
                  color: '#888',
                  fontSize: '12px',
                  padding: '15px',
                  textAlign: 'center',
                  border: '1px solid #333',
                  borderRadius: '3px',
                  background: '#1e1e1e',
                }}
              >
                No state changes recorded yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {historyEntries.map((entry, index) => {
                  const hasChanges = entry.changes !== undefined;
                  const isCurrent = index === 0;
                  const isInitial = entry.previousState === null;
                  const isRestored = restoredTimestamp === entry.snapshot.timestamp;

                  return (
                    <div
                      key={entry.snapshot.timestamp}
                      style={{
                        border: '1px solid #333',
                        borderRadius: '3px',
                        background: '#1e1e1e',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Header */}
                      <div
                        style={{
                          padding: '8px 10px',
                          background: isCurrent ? '#1a3a1a' : '#252526',
                          borderBottom: '1px solid #333',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: isCurrent ? '#10b981' : '#888',
                            }}
                          >
                            {isCurrent
                              ? 'CURRENT'
                              : isInitial
                              ? 'INITIAL'
                              : `SNAPSHOT ${historyEntries.length - index}`}
                          </span>
                          {!isCurrent && (
                            <span style={{ fontSize: '10px', color: '#666' }}>
                              {formatTime(entry.snapshot.timestamp)}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {hasChanges && !isInitial && !isCurrent && (
                            <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>
                              CHANGED
                            </span>
                          )}
                          {!isCurrent && onTimeTravel && (
                            <button
                              onClick={() => handleRestore(entry.snapshot.state, entry.snapshot.timestamp)}
                              style={{
                                fontSize: '10px',
                                padding: '2px 7px',
                                background: isRestored ? '#10b981' : 'transparent',
                                border: `1px solid ${isRestored ? '#10b981' : '#444'}`,
                                color: isRestored ? '#fff' : '#888',
                                borderRadius: '3px',
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
                        <CallStackView callstack={entry.snapshot.callstack} />
                      )}

                      {/* Content */}
                      <div style={{ padding: '10px' }}>
                        {!hasChanges && !isInitial ? (
                          <div style={{ color: '#666', fontSize: '12px', fontStyle: 'italic' }}>
                            No changes
                          </div>
                        ) : (
                          <JsonView
                            value={typeof entry.changes === 'object' && entry.changes !== null ? entry.changes : { value: entry.changes ?? null }}
                            style={
                              {
                                '--w-rjv-font-family': 'Monaco, Menlo, Consolas, monospace',
                                '--w-rjv-background-color': '#1e1e1e',
                                '--w-rjv-color': '#d4d4d4',
                                '--w-rjv-key-string': '#9cdcfe',
                                '--w-rjv-info-color': '#6a9955',
                                '--w-rjv-border-left': '1px solid #333',
                                '--w-rjv-line-color': '#1e1e1e',
                                '--w-rjv-arrow-color': '#858585',
                                '--w-rjv-edit-color': '#569cd6',
                                '--w-rjv-add-color': '#10b981',
                                '--w-rjv-del-color': '#ef4444',
                                '--w-rjv-copied-color': '#10b981',
                                '--w-rjv-curlybraces-color': '#d4d4d4',
                                '--w-rjv-brackets-color': '#d4d4d4',
                                '--w-rjv-ellipsis-color': '#858585',
                                '--w-rjv-quotes-color': '#ce9178',
                                '--w-rjv-quotes-string-color': '#ce9178',
                                '--w-rjv-type-string-color': '#ce9178',
                                '--w-rjv-type-int-color': '#b5cea8',
                                '--w-rjv-type-float-color': '#b5cea8',
                                '--w-rjv-type-bigint-color': '#b5cea8',
                                '--w-rjv-type-boolean-color': '#569cd6',
                                '--w-rjv-type-date-color': '#c586c0',
                                '--w-rjv-type-url-color': '#3b82f6',
                                '--w-rjv-type-null-color': '#569cd6',
                                '--w-rjv-type-nan-color': '#ef4444',
                                '--w-rjv-type-undefined-color': '#569cd6',
                              } as any
                            }
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
