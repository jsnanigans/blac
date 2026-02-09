import { useState, useEffect, useCallback } from 'react';
import {
  getAnalyticsEntries,
  onAnalyticsChange,
  clearAnalyticsEntries,
  type AnalyticsEntry,
} from '../AnalyticsPlugin';
import { Button } from '../../../shared/components';

const typeColors: Record<AnalyticsEntry['type'], string> = {
  installed: 'var(--color-primary)',
  created: 'var(--color-success)',
  stateChanged: 'var(--color-warning)',
  disposed: 'var(--color-danger)',
};

export function AnalyticsWidget() {
  const [entries, setEntries] = useState(getAnalyticsEntries);

  const refresh = useCallback(() => {
    setEntries(getAnalyticsEntries());
  }, []);

  useEffect(() => {
    const unsub = onAnalyticsChange(refresh);
    refresh();
    return unsub;
  }, [refresh]);

  return (
    <div className="widget col-span-2">
      <div className="flex-between">
        <h3>Plugin Event Log</h3>
        <div className="row-xs">
          <span className="text-xs text-muted">{entries.length} events</span>
          <Button
            variant="ghost"
            onClick={() => {
              clearAnalyticsEntries();
              refresh();
            }}
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
          >
            Clear
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted">
        Real-time log from the custom <code>AnalyticsPlugin</code> — tracks instance creation, state changes, and disposal.
      </p>
      <div className="analytics-log">
        {entries.length === 0 && (
          <span className="text-muted">No events yet...</span>
        )}
        {entries.map((entry, i) => (
          <div key={i} className="log-entry">
            <span style={{ color: typeColors[entry.type], fontWeight: 600 }}>
              [{entry.type}]
            </span>{' '}
            <span>{entry.name}</span>{' '}
            <span style={{ opacity: 0.5 }}>{entry.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
