import { useState } from 'react';
import type { LogEntry } from '@blac/devtools-connect/client';
import { clock, instanceKey } from './format';
import { PathChips } from './PathChips';

interface Props {
  log: LogEntry[];
  onOpen: (entry: LogEntry) => void;
  onClear: () => void;
}

const MAX_SHOWN = 500;

export function LogView({ log, onOpen, onClear }: Props) {
  const [filter, setFilter] = useState('');
  const query = filter.trim().toLowerCase();
  const shown = log
    .filter(
      (e) =>
        !query ||
        [e.className, e.name, e.id, e.kind].some((text) =>
          text.toLowerCase().includes(query),
        ),
    )
    .slice(-MAX_SHOWN)
    .reverse();

  return (
    <div className="list wide log">
      <div className="toolbar">
        <input
          type="search"
          placeholder="Filter log"
          aria-label="Filter log"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button type="button" onClick={onClear} disabled={log.length === 0}>
          Clear
        </button>
      </div>
      <div className="scroll">
        {shown.length === 0 && <p className="empty">No log entries.</p>}
        {shown.map((e) => (
          <button
            key={e.key}
            type="button"
            className="item"
            onClick={() => onOpen(e)}
          >
            <span className={`badge ${e.kind}`}>{e.kind}</span>
            <span className="muted time">{clock(e.at)}</span>
            <span className="name">
              {e.className}
              <span className="muted">:{instanceKey(e)}</span>
            </span>
            {e.kind === 'changed' && <PathChips paths={e.paths} />}
          </button>
        ))}
      </div>
    </div>
  );
}
