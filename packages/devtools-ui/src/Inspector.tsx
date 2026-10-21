import { useMemo } from 'react';
import type {
  HistoryEntry,
  InstanceMeta,
} from '@blac/devtools-connect/protocol';
import { diff } from './diff';
import { clock, summary } from './format';
import { PathChips } from './PathChips';
import { Tree } from './Tree';

interface Props {
  meta: InstanceMeta;
  history: HistoryEntry[];
  pickedVersion: number | null;
  onPick: (version: number | null) => void;
}

const MAX_SHOWN = 12;
const clip = (text: string) =>
  text.length > 60 ? `${text.slice(0, 60)}…` : text;

export function Inspector({ meta, history, pickedVersion, onPick }: Props) {
  const found = history.findIndex((e) => e.version === pickedVersion);
  const index = found >= 0 ? found : history.length - 1;
  const entry = history[index];
  const previous = history[index - 1];

  const changes = useMemo(
    () => (entry && previous ? diff(previous.state, entry.state) : []),
    [entry, previous],
  );
  const marks = useMemo(
    () => new Map(changes.map((c) => [c.path, c.kind] as const)),
    [changes],
  );

  return (
    <div className="inspector scroll">
      <header>
        <h2>{meta.className}</h2>
        {meta.name !== meta.className && (
          <span className="name">{meta.name}</span>
        )}
        <span className="muted">{meta.id}</span>
        {meta.disposedAt && <span className="badge disposed">disposed</span>}
        <div className="muted">
          created {clock(meta.createdAt)}
          {meta.args !== undefined && ` · args ${JSON.stringify(meta.args)}`}
        </div>
      </header>

      <h3>State{entry && ` · v${entry.version}`}</h3>
      {entry ? (
        <Tree value={entry.state} marks={marks} />
      ) : (
        <p className="empty">loading…</p>
      )}

      {entry && previous && (
        <>
          <h3>Changes vs v{previous.version}</h3>
          {changes.length === 0 && <p className="empty">No differences.</p>}
          <ul className="changes">
            {changes.slice(0, MAX_SHOWN).map((c) => (
              <li key={c.path}>
                <span className={`badge ${c.kind}`}>{c.kind}</span>
                <span className="key">{c.path}</span>
                {c.kind !== 'added' && (
                  <span className="val before">{clip(summary(c.before))}</span>
                )}
                {c.kind === 'changed' && ' → '}
                {c.kind !== 'removed' && (
                  <span className="val after">{clip(summary(c.after))}</span>
                )}
              </li>
            ))}
          </ul>
          {changes.length > MAX_SHOWN && (
            <p className="muted">+{changes.length - MAX_SHOWN} more</p>
          )}
        </>
      )}

      <h3>History</h3>
      <ul className="history">
        {[...history].reverse().map((e, i) => (
          <li key={e.version}>
            <button
              type="button"
              className={`item ${e === entry ? 'selected' : ''}`}
              aria-pressed={e === entry}
              onClick={() => onPick(i === 0 ? null : e.version)}
            >
              <span className="name">v{e.version}</span>
              <span className="muted">{clock(e.at)}</span>
              <PathChips paths={e.paths} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
