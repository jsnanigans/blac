import React, { FC } from 'react';
import JsonView from '@uiw/react-json-view';
import type { StateSnapshot } from '../blocs';

interface StateHistoryViewProps {
  history: StateSnapshot[];
  currentState: any;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

/**
 * Displays state history showing only changes per snapshot
 * Newest snapshots appear at the top
 */
export const StateHistoryView: FC<StateHistoryViewProps> = React.memo(
  ({ history, currentState, isExpanded, onToggleExpanded }) => {
    /**
     * Extract only the changes between two states
     */
    const extractChanges = (previous: any, current: any): any => {
      // If types are different, return current
      if (typeof previous !== typeof current) {
        return current;
      }

      // If not objects, compare directly
      if (typeof current !== 'object' || current === null) {
        return previous !== current ? current : undefined;
      }

      // Handle arrays
      if (Array.isArray(current)) {
        if (!Array.isArray(previous) || previous.length !== current.length) {
          return current;
        }

        const changes: any[] = [];
        let hasChanges = false;

        for (let i = 0; i < current.length; i++) {
          const itemChange = extractChanges(previous[i], current[i]);
          if (itemChange !== undefined) {
            hasChanges = true;
            changes[i] = itemChange;
          }
        }

        return hasChanges ? current : undefined;
      }

      // Handle objects
      const changes: any = {};
      let hasChanges = false;

      // Check all keys in current
      for (const key in current) {
        if (!(key in previous)) {
          // New key added
          changes[key] = current[key];
          hasChanges = true;
        } else {
          const change = extractChanges(previous[key], current[key]);
          if (change !== undefined) {
            changes[key] = change;
            hasChanges = true;
          }
        }
      }

      // Check for deleted keys
      for (const key in previous) {
        if (!(key in current)) {
          changes[key] = undefined; // Mark as deleted
          hasChanges = true;
        }
      }

      return hasChanges ? changes : undefined;
    };

    /**
     * Format timestamp as relative time
     */
    const formatTime = (timestamp: number): string => {
      const now = Date.now();
      const diff = now - timestamp;

      if (diff < 1000) return 'just now';
      if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return `${Math.floor(diff / 86400000)}d ago`;
    };

    // Build history entries with changes
    const historyEntries: Array<{
      snapshot: StateSnapshot;
      changes: any;
      previousState: any;
    }> = [];

    // Start with current state (not in history yet)
    if (history.length > 0) {
      const mostRecent = history[0];
      const changes = extractChanges(mostRecent.state, currentState);
      historyEntries.push({
        snapshot: {
          state: currentState,
          timestamp: Date.now(),
          callstack: mostRecent.callstack, // Use callstack from most recent snapshot
        },
        changes,
        previousState: mostRecent.state,
      });
    }

    // Add each snapshot showing changes from next snapshot
    for (let i = 0; i < history.length; i++) {
      const snapshot = history[i];
      const nextSnapshot = history[i + 1];

      if (nextSnapshot) {
        const changes = extractChanges(nextSnapshot.state, snapshot.state);
        historyEntries.push({
          snapshot,
          changes,
          previousState: nextSnapshot.state,
        });
      } else {
        // Last snapshot (oldest) - show full state as "initial"
        historyEntries.push({
          snapshot,
          changes: snapshot.state,
          previousState: null,
        });
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
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#569cd6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#fff';
          }}
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
            <span
              style={{
                fontSize: '11px',
                color: '#888',
                fontWeight: 400,
                marginLeft: '4px',
              }}
            >
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
                            {isCurrent ? 'CURRENT' : isInitial ? 'INITIAL' : `SNAPSHOT ${historyEntries.length - index}`}
                          </span>
                          {!isCurrent && (
                            <span style={{ fontSize: '10px', color: '#666' }}>
                              {formatTime(entry.snapshot.timestamp)}
                            </span>
                          )}
                        </div>
                        {hasChanges && !isInitial && (
                          <span
                            style={{
                              fontSize: '10px',
                              color: '#10b981',
                              fontWeight: 600,
                            }}
                          >
                            CHANGED
                          </span>
                        )}
                      </div>

                      {/* Callstack - Show initiator */}
                      {entry.snapshot.callstack && (
                        <div
                          style={{
                            padding: '8px 10px',
                            background: '#252526',
                            borderBottom: '1px solid #333',
                            fontSize: '10px',
                          }}
                        >
                          <div style={{ color: '#888', marginBottom: '5px', fontWeight: 600 }}>
                            INITIATOR:
                          </div>
                          <pre
                            style={{
                              margin: 0,
                              color: '#d4d4d4',
                              fontFamily: 'Monaco, Menlo, Consolas, monospace',
                              fontSize: '9px',
                              lineHeight: '1.3',
                              overflow: 'auto',
                              maxHeight: '100px',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                            }}
                          >
                            {entry.snapshot.callstack}
                          </pre>
                        </div>
                      )}

                      {/* Content */}
                      <div style={{ padding: '10px' }}>
                        {!hasChanges && !isInitial ? (
                          <div style={{ color: '#666', fontSize: '12px', fontStyle: 'italic' }}>
                            No changes
                          </div>
                        ) : (
                          <JsonView
                            value={entry.changes}
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
