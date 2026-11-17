import { useMemo, useRef, useState } from 'react';
import type { LogEntry } from '@blac/devtools-connect/client';
import {
  ago,
  clock,
  instanceKey,
  keyLabel,
  logRows,
  type LogRow,
} from './format';
import { ClassMark, Empty, Icon, Kbd, Segmented, useNow } from './ui';

interface Props {
  log: LogEntry[];
  onOpen: (entry: LogEntry) => void;
  onClear: () => void;
}

type Kind = 'all' | 'lifecycle' | 'changes';

const KINDS: readonly Kind[] = ['all', 'lifecycle', 'changes'];
const KIND_LABEL: Record<Kind, string> = {
  all: 'All',
  lifecycle: 'Lifecycle',
  changes: 'Changes',
};
const MAX_SHOWN = 500;

function meta({ entry, count, first }: LogRow): string {
  if (entry.kind === 'created') return 'created';
  if (entry.kind === 'disposed') return 'disposed';
  const paths =
    entry.paths === 'all' ? 'whole state' : (entry.paths ?? []).join(', ');
  if (count === 1) return `v${entry.version} · ${paths}`;
  const span = ((entry.at - first) / 1000).toFixed(1);
  return `${count} changes in ${span}s · up to v${entry.version}`;
}

export function LogView({ log, onOpen, onClear }: Props) {
  const now = useNow();
  const [filter, setFilter] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const firstKey = useRef(log[log.length - 1]?.key ?? 0).current;
  const query = filter.trim().toLowerCase();

  const rows = useMemo(
    () =>
      logRows(
        log.filter(
          (e) =>
            (kind === 'all' ||
              (kind === 'changes') === (e.kind === 'changed')) &&
            (!query ||
              [e.className, e.name, e.id].some((text) =>
                text.toLowerCase().includes(query),
              )),
        ),
      ).slice(0, MAX_SHOWN),
    [log, kind, query],
  );

  return (
    <>
      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={13} />
          <input
            type="search"
            placeholder="Filter by class or key"
            aria-label="Filter log"
            data-filter
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && filter) {
                e.stopPropagation();
                setFilter('');
              }
            }}
          />
          <Kbd>/</Kbd>
        </label>
        <Segmented
          label="Event kind"
          options={KINDS}
          value={kind}
          onChange={setKind}
          render={(k) => KIND_LABEL[k]}
        />
        <button
          type="button"
          className="btn"
          onClick={onClear}
          disabled={log.length === 0}
        >
          Clear log
        </button>
      </div>
      <div className="scroll">
        {rows.length === 0 ? (
          <Empty
            title={log.length === 0 ? 'No events yet' : 'No events match'}
            hint={
              log.length === 0
                ? 'Lifecycle events and state changes appear here as the app runs.'
                : 'Try another filter or event kind.'
            }
          />
        ) : (
          <div className="card" data-list>
            {rows.map((row) => {
              const { entry } = row;
              const key = instanceKey(entry);
              return (
                <button
                  key={entry.key}
                  type="button"
                  className="row"
                  data-row
                  data-flash={entry.key > firstKey ? '' : undefined}
                  data-disposed={entry.kind === 'disposed' ? '' : undefined}
                  title="Open in inspector"
                  onClick={() => onOpen(entry)}
                >
                  <span className="row-icon" data-kind={entry.kind}>
                    <Icon
                      name={entry.kind === 'changed' ? 'dot' : entry.kind}
                      size={14}
                    />
                  </span>
                  <ClassMark className={entry.className} />
                  <span className="row-text">
                    <span className="row-primary">
                      {entry.className}
                      <span className="muted"> · {keyLabel(key)}</span>
                    </span>
                    <span className="row-meta mono">{meta(row)}</span>
                  </span>
                  <span className="row-end" title={clock(entry.at)}>
                    {ago(entry.at, now)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
