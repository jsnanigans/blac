import React, { FC } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useBloc } from '@blac/react';
import { DevToolsLogsBloc } from '../blocs';
import type { LogEntry, LogEventType } from '../types';
import { T } from '../theme';

function formatAbsoluteTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

function getEventTypeColor(eventType: LogEventType): string {
  switch (eventType) {
    case 'init':
      return T.success;
    case 'created':
      return T.info;
    case 'disposed':
      return T.error;
    case 'state-changed':
      return T.warning;
  }
}

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

function extractInstanceId(fullId: string): string {
  const colonIndex = fullId.indexOf(':');
  return colonIndex !== -1 ? fullId.substring(colonIndex + 1) : fullId;
}

const LogEntryRow: FC<{ entry: LogEntry }> = React.memo(({ entry }) => {
  const color = getEventTypeColor(entry.eventType);
  const label = getEventTypeLabel(entry.eventType);
  const displayInstanceId = extractInstanceId(entry.instanceId);

  return (
    <div
      style={{
        padding: '4px 10px',
        borderBottom: `1px solid ${T.border0}`,
        fontSize: '11px',
        fontFamily: T.fontMono,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        lineHeight: '1.3',
      }}
    >
      <span style={{ color: T.text2, minWidth: '95px', fontSize: '10px' }}>
        {formatAbsoluteTime(entry.timestamp)}
      </span>

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

      <span style={{ color: T.textCode, minWidth: '110px', fontSize: '11px' }}>
        {entry.className}
      </span>

      <span
        style={{ color: T.warning, fontSize: '10px', minWidth: '90px' }}
        title={entry.instanceId}
      >
        {displayInstanceId}
      </span>

      {entry.eventType === 'state-changed' && entry.trigger && (
        <span
          style={{
            fontSize: '10px',
            padding: '1px 5px',
            background: '#1a2a3a',
            border: '1px solid #2a4a6a',
            borderRadius: T.radiusSm,
            color: T.textAccent,
            fontFamily: T.fontMono,
          }}
          title="Method that triggered this state change"
        >
          {entry.trigger}()
        </span>
      )}

      {entry.eventType === 'init' &&
        entry.data?.instanceCount !== undefined && (
          <span style={{ color: T.text2, fontSize: '10px' }}>
            {entry.data.instanceCount} instances
          </span>
        )}
    </div>
  );
});

LogEntryRow.displayName = 'LogEntryRow';

const MultiSelect = <O extends string>({
  label,
  options,
  selected,
  onChange,
  showSearch = false,
  getOptionCount,
}: {
  label: string;
  options: O[];
  selected: O[];
  onChange: (selected: O[]) => void;
  showSearch?: boolean;
  getOptionCount?: (option: O) => number;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');

  const toggleOption = (option: O) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option) as O[]);
    } else {
      onChange([...selected, option] as O[]);
    }
  };

  const filteredOptions = React.useMemo(() => {
    if (!showSearch || !searchText.trim()) return options;
    const lower = searchText.toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(lower));
  }, [options, searchText, showSearch]);

  const handleClose = () => {
    setIsOpen(false);
    setSearchText('');
  };

  const hasActive = selected.length > 0;

  return (
    <div style={{ position: 'relative', minWidth: '110px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '3px 8px',
          background: hasActive ? 'rgba(0,122,204,0.2)' : 'transparent',
          color: hasActive ? T.text0 : T.text1,
          border: `1px solid ${hasActive ? T.borderAccent : T.border2}`,
          borderRadius: T.radius,
          fontSize: '11px',
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
          {hasActive && ` (${selected.length})`}
        </span>
        <span style={{ marginLeft: '4px', fontSize: '8px', opacity: 0.7 }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <>
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
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '3px',
              background: T.bg4,
              border: `1px solid ${T.border2}`,
              borderRadius: T.radius,
              maxHeight: '280px',
              overflowY: 'auto',
              zIndex: 1000,
              minWidth: '200px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
          >
            {showSearch && (
              <div
                style={{
                  padding: '6px 8px',
                  borderBottom: `1px solid ${T.border1}`,
                  position: 'sticky',
                  top: 0,
                  background: T.bg4,
                  zIndex: 1,
                }}
              >
                <input
                  type="text"
                  placeholder="Search…"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '3px 6px',
                    background: T.bg2,
                    color: T.text0,
                    border: `1px solid ${T.border2}`,
                    borderRadius: T.radiusSm,
                    fontSize: '11px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            <div
              style={{
                padding: '5px 8px',
                borderBottom: `1px solid ${T.border1}`,
                display: 'flex',
                gap: '6px',
                position: 'sticky',
                top: showSearch ? '37px' : 0,
                background: T.bg4,
                zIndex: 1,
              }}
            >
              <button
                onClick={() => onChange(filteredOptions)}
                style={{
                  padding: '2px 8px',
                  background: 'transparent',
                  color: T.textCode,
                  border: `1px solid ${T.border2}`,
                  borderRadius: T.radiusSm,
                  fontSize: '10px',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                All
              </button>
              <button
                onClick={() => onChange([])}
                style={{
                  padding: '2px 8px',
                  background: 'transparent',
                  color: T.error,
                  border: `1px solid ${T.border2}`,
                  borderRadius: T.radiusSm,
                  fontSize: '10px',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                None
              </button>
            </div>

            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '8px 10px',
                  fontSize: '11px',
                  color: T.text2,
                }}
              >
                {options.length === 0 ? 'No options' : 'No matches'}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const count = getOptionCount?.(option);
                const showCount = count !== undefined && count > 1;
                const isSelected = selected.includes(option);
                return (
                  <div
                    key={option}
                    onClick={() => toggleOption(option)}
                    style={{
                      padding: '5px 10px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: isSelected ? T.bgAccent : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.background = T.bgHover;
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      style={{ cursor: 'pointer', accentColor: T.borderAccent }}
                    />
                    <span style={{ flex: 1, color: T.text0 }}>{option}</span>
                    {showCount && (
                      <span style={{ color: T.text2, fontSize: '10px' }}>
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

const ROW_HEIGHT = 28;

export const LogsView: FC = React.memo(() => {
  const [state, logsBloc] = useBloc(DevToolsLogsBloc);
  const { filters } = state;
  const logs = logsBloc.filteredLogs;
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  const availableInstanceIds = React.useMemo(
    () => logsBloc.getAvailableInstanceIdsForClasses(filters.classNames),
    [logsBloc, filters.classNames],
  );

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

  const hasFilters =
    filters.eventTypes.length > 0 ||
    filters.classNames.length > 0 ||
    filters.instanceIds.length > 0;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          padding: '6px 10px',
          borderBottom: `1px solid ${T.border1}`,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: T.bg3,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '11px', color: T.text2, minWidth: '90px' }}>
          {logs.length} {logs.length === 1 ? 'event' : 'events'}
          {state.logs.length !== logs.length && (
            <span style={{ color: T.text3 }}> / {state.logs.length}</span>
          )}
        </span>

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
          showSearch
          getOptionCount={logsBloc.getClassInstanceCount}
        />
        <MultiSelect
          label="Instance ID"
          options={availableInstanceIds}
          selected={filters.instanceIds}
          onChange={logsBloc.setInstanceIdFilters}
          showSearch
        />

        <div style={{ display: 'flex', gap: '5px', marginLeft: 'auto' }}>
          {hasFilters && (
            <button
              onClick={logsBloc.clearFilters}
              style={{
                padding: '3px 8px',
                background: 'transparent',
                color: T.warning,
                border: `1px solid ${T.border2}`,
                borderRadius: T.radius,
                fontSize: '11px',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = T.bgHover;
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
                color: T.text1,
                border: `1px solid ${T.border2}`,
                borderRadius: T.radius,
                fontSize: '11px',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = T.bgHover;
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

      {/* Log rows */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto' }}>
        {logs.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: T.text2,
              fontSize: '13px',
            }}
          >
            {state.logs.length === 0
              ? 'No events yet'
              : 'No events match filters'}
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((item) => (
              <div
                key={item.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${item.size}px`,
                  transform: `translateY(${item.start}px)`,
                }}
              >
                <LogEntryRow entry={logs[item.index]} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

LogsView.displayName = 'LogsView';
