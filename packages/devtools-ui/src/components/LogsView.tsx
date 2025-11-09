import React, { FC } from 'react';
import { useBloc } from '@blac/react';
import { DevToolsLogsBloc } from '../blocs';
import type { LogEntry, LogEventType } from '../types';

/**
 * Format timestamp as absolute time (e.g., "10:45:23.123")
 */
function formatAbsoluteTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * Get color for event type
 */
function getEventTypeColor(eventType: LogEventType): string {
  switch (eventType) {
    case 'init':
      return '#4CAF50'; // Green
    case 'created':
      return '#2196F3'; // Blue
    case 'disposed':
      return '#f44336'; // Red
    case 'state-changed':
      return '#FF9800'; // Orange
    case 'event-added':
      return '#9C27B0'; // Purple
    default:
      return '#888';
  }
}

/**
 * Get label for event type
 */
function getEventTypeLabel(eventType: LogEventType): string {
  switch (eventType) {
    case 'init':
      return 'INIT';
    case 'created':
      return 'CREATED';
    case 'disposed':
      return 'DISPOSED';
    case 'state-changed':
      return 'STATE';
    case 'event-added':
      return 'EVENT';
  }
}

/**
 * Single log entry row
 */
const LogEntryRow: FC<{ entry: LogEntry }> = React.memo(({ entry }) => {
  const color = getEventTypeColor(entry.eventType);
  const label = getEventTypeLabel(entry.eventType);

  return (
    <div
      style={{
        padding: '6px 12px',
        borderBottom: '1px solid #2a2a2a',
        fontSize: '12px',
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        lineHeight: '1.4',
      }}
    >
      {/* Timestamp */}
      <span style={{ color: '#666', minWidth: '100px', fontSize: '11px' }}>
        {formatAbsoluteTime(entry.timestamp)}
      </span>

      {/* Event type badge */}
      <span
        style={{
          color,
          fontWeight: 600,
          minWidth: '70px',
          fontSize: '11px',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </span>

      {/* Class name with color hash */}
      <span
        style={{
          color: '#4FC3F7',
          minWidth: '120px',
        }}
      >
        {entry.className}
      </span>

      {/* Instance name/ID */}
      <span
        style={{
          color: '#888',
          fontSize: '11px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}
      >
        {entry.instanceName || entry.instanceId}
      </span>

      {/* Additional info for specific event types */}
      {entry.eventType === 'init' && entry.data?.instanceCount !== undefined && (
        <span style={{ color: '#666', fontSize: '11px' }}>
          ({entry.data.instanceCount} instances)
        </span>
      )}
    </div>
  );
});

LogEntryRow.displayName = 'LogEntryRow';

/**
 * Logs view component - shows unified log of all events
 */
export const LogsView: FC = React.memo(() => {
  const [{ logs }, logsBloc] = useBloc(DevToolsLogsBloc);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header with clear button */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #444',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: '13px', color: '#888' }}>
          {logs.length} {logs.length === 1 ? 'event' : 'events'}
        </div>
        {logs.length > 0 && (
          <button
            onClick={logsBloc.clearLogs}
            style={{
              padding: '4px 10px',
              background: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '3px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#333';
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Logs list */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
        }}
      >
        {logs.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#666',
              fontSize: '13px',
            }}
          >
            No events yet
          </div>
        ) : (
          logs.map((entry) => <LogEntryRow key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  );
});

LogsView.displayName = 'LogsView';
