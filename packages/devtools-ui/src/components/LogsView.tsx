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
  }
}

/**
 * Extract instanceId from full ID (strip className prefix if present)
 * e.g., "UserCubit:user-me" -> "user-me"
 */
function extractInstanceId(fullId: string): string {
  const colonIndex = fullId.indexOf(':');
  return colonIndex !== -1 ? fullId.substring(colonIndex + 1) : fullId;
}

/**
 * Single log entry row
 */
const LogEntryRow: FC<{ entry: LogEntry }> = React.memo(({ entry }) => {
  const color = getEventTypeColor(entry.eventType);
  const label = getEventTypeLabel(entry.eventType);
  const displayInstanceId = extractInstanceId(entry.instanceId);

  return (
    <div
      style={{
        padding: '4px 10px',
        borderBottom: '1px solid #2a2a2a',
        fontSize: '11px',
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        lineHeight: '1.3',
      }}
    >
      {/* Timestamp */}
      <span style={{ color: '#666', minWidth: '95px', fontSize: '10px' }}>
        {formatAbsoluteTime(entry.timestamp)}
      </span>

      {/* Event type badge */}
      <span
        style={{
          color,
          fontWeight: 600,
          minWidth: '65px',
          fontSize: '10px',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </span>

      {/* Class name with color hash */}
      <span
        style={{
          color: '#4FC3F7',
          minWidth: '110px',
          fontSize: '11px',
        }}
      >
        {entry.className}
      </span>

      {/* Instance Key (instanceId) - only the ID part */}
      <span
        style={{
          color: '#FFB74D',
          fontSize: '10px',
          minWidth: '90px',
        }}
        title={entry.instanceId}
      >
        {displayInstanceId}
      </span>

      {/* Additional info for specific event types */}
      {entry.eventType === 'init' && entry.data?.instanceCount !== undefined && (
        <span style={{ color: '#666', fontSize: '10px' }}>
          {entry.data.instanceCount} instances
        </span>
      )}
    </div>
  );
});

LogEntryRow.displayName = 'LogEntryRow';

/**
 * Multi-select dropdown component
 */
const MultiSelect = <T extends string>({
  label,
  options,
  selected,
  onChange,
  showSearch = false,
  getOptionCount,
}: {
  label: string;
  options: T[];
  selected: T[];
  onChange: (selected: T[]) => void;
  showSearch?: boolean;
  getOptionCount?: (option: T) => number;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');

  const toggleOption = (option: T) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option) as T[]);
    } else {
      onChange([...selected, option] as T[]);
    }
  };

  const selectAll = () => {
    onChange(filteredOptions);
  };

  const clearAll = () => {
    onChange([]);
  };

  // Filter options based on search text
  const filteredOptions = React.useMemo(() => {
    if (!showSearch || !searchText.trim()) {
      return options;
    }
    const lowerSearch = searchText.toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(lowerSearch));
  }, [options, searchText, showSearch]);

  const handleClose = () => {
    setIsOpen(false);
    setSearchText('');
  };

  return (
    <div style={{ position: 'relative', minWidth: '120px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '3px 7px',
          background: selected.length > 0 ? '#2a5a8a' : 'transparent',
          color: selected.length > 0 ? '#fff' : '#aaa',
          border: '1px solid #555',
          borderRadius: '2px',
          fontSize: '10px',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>
          {label}
          {selected.length > 0 && ` (${selected.length})`}
        </span>
        <span style={{ marginLeft: '4px', fontSize: '9px' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            onClick={handleClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
          />

          {/* Dropdown menu */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '2px',
              background: '#2a2a2a',
              border: '1px solid #555',
              borderRadius: '3px',
              maxHeight: '300px',
              overflowY: 'auto',
              zIndex: 1000,
              minWidth: '200px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Search input */}
            {showSearch && (
              <div
                style={{
                  padding: '6px 10px',
                  borderBottom: '1px solid #444',
                  position: 'sticky',
                  top: 0,
                  background: '#2a2a2a',
                  zIndex: 1,
                }}
              >
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    background: '#1a1a1a',
                    color: '#fff',
                    border: '1px solid #555',
                    borderRadius: '2px',
                    fontSize: '11px',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            {/* Select All / Clear All */}
            <div
              style={{
                padding: '6px 10px',
                borderBottom: '1px solid #444',
                display: 'flex',
                gap: '8px',
                position: 'sticky',
                top: showSearch ? '41px' : 0,
                background: '#2a2a2a',
                zIndex: 1,
              }}
            >
              <button
                onClick={selectAll}
                style={{
                  padding: '2px 6px',
                  background: '#333',
                  color: '#4FC3F7',
                  border: '1px solid #555',
                  borderRadius: '2px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                All
              </button>
              <button
                onClick={clearAll}
                style={{
                  padding: '2px 6px',
                  background: '#333',
                  color: '#f44336',
                  border: '1px solid #555',
                  borderRadius: '2px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                None
              </button>
            </div>

            {/* Options */}
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '8px 10px',
                  fontSize: '11px',
                  color: '#666',
                }}
              >
                {options.length === 0 ? 'No options' : 'No matches'}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const count = getOptionCount?.(option);
                const showCount = count !== undefined && count > 1;

                return (
                  <div
                    key={option}
                    onClick={() => toggleOption(option)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: selected.includes(option) ? '#1e3a5f' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!selected.includes(option)) {
                        e.currentTarget.style.background = '#333';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selected.includes(option)) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(option)}
                      onChange={() => {}}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ flex: 1 }}>{option}</span>
                    {showCount && (
                      <span
                        style={{
                          color: '#888',
                          fontSize: '10px',
                          marginLeft: 'auto',
                        }}
                      >
                        ({count})
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Logs view component - shows unified log of all events
 */
export const LogsView: FC = React.memo(() => {
  const [state, logsBloc] = useBloc(DevToolsLogsBloc);
  const { filters } = state;
  const logs = logsBloc.filteredLogs;

  // Get instance IDs filtered by selected classes
  const availableInstanceIds = React.useMemo(
    () => logsBloc.getAvailableInstanceIdsForClasses(filters.classNames),
    [logsBloc, filters.classNames],
  );

  // Clear instance ID filters that are no longer in the available list
  React.useEffect(() => {
    if (filters.instanceIds.length > 0) {
      const validIds = filters.instanceIds.filter((id) =>
        availableInstanceIds.includes(id),
      );
      if (validIds.length !== filters.instanceIds.length) {
        logsBloc.setInstanceIdFilters(validIds);
      }
    }
  }, [availableInstanceIds, filters.instanceIds, logsBloc]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Compact header with filters and event count in one row */}
      <div
        style={{
          padding: '6px 10px',
          borderBottom: '1px solid #444',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#1e1e1e',
        }}
      >
        {/* Event count */}
        <div style={{ fontSize: '11px', color: '#888', minWidth: '100px' }}>
          {logs.length} {logs.length === 1 ? 'event' : 'events'}
          {state.logs.length !== logs.length && (
            <span style={{ color: '#666' }}> / {state.logs.length}</span>
          )}
        </div>

        {/* Filters */}
        <MultiSelect
          label="Event Type"
          options={logsBloc.availableEventTypes}
          selected={filters.eventTypes}
          onChange={logsBloc.setEventTypeFilters}
        />
        <MultiSelect
          label="Class"
          options={logsBloc.availableClassNames}
          selected={filters.classNames}
          onChange={logsBloc.setClassNameFilters}
          showSearch={true}
          getOptionCount={logsBloc.getClassInstanceCount}
        />
        <MultiSelect
          label="Instance ID"
          options={availableInstanceIds}
          selected={filters.instanceIds}
          onChange={logsBloc.setInstanceIdFilters}
          showSearch={true}
        />

        {/* Action buttons on the right */}
        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
          {(filters.eventTypes.length > 0 ||
            filters.classNames.length > 0 ||
            filters.instanceIds.length > 0) && (
            <button
              onClick={logsBloc.clearFilters}
              style={{
                padding: '3px 8px',
                background: 'transparent',
                color: '#FFB74D',
                border: '1px solid #555',
                borderRadius: '2px',
                fontSize: '10px',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2a2a2a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Clear Filters
            </button>
          )}
          {state.logs.length > 0 && (
            <button
              onClick={logsBloc.clearLogs}
              style={{
                padding: '3px 8px',
                background: 'transparent',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '2px',
                fontSize: '10px',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2a2a2a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Clear Logs
            </button>
          )}
        </div>
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
            {state.logs.length === 0 ? 'No events yet' : 'No events match filters'}
          </div>
        ) : (
          logs.map((entry) => <LogEntryRow key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  );
});

LogsView.displayName = 'LogsView';
