import { useMemo } from 'react';
import type {
  HistoryEntry,
  InstanceMeta,
} from '@blac/devtools-connect/protocol';
import { diff } from './diff';
import { clock, instanceKey, summary } from './format';
import { PathChips } from './PathChips';
import { Tree } from './Tree';

interface Props {
  meta: InstanceMeta;
  history: HistoryEntry[];
  pickedVersion: number | null;
  onPick: (version: number | null) => void;
}

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
        <span className="name">{instanceKey(meta)}</span>
        {meta.name !== meta.className && (
          <span className="muted">{meta.name}</span>
        )}
        {meta.disposedAt && <span className="badge disposed">disposed</span>}
        <div className="muted">
          created {clock(meta.createdAt)}
          {meta.args !== undefined &&
            ` · args ${clip(JSON.stringify(meta.args))}`}
        </div>
      </header>

      <h3>
        State
        {entry && <span className="ver"> · v{entry.version}</span>}
        {pickedVersion !== null && entry && (
          <button type="button" className="link" onClick={() => onPick(null)}>
            back to latest
          </button>
        )}
      </h3>
      {entry ? (
        <Tree value={entry.state} marks={marks} />
      ) : (
        <p className="empty">loading…</p>
      )}

      {entry && previous && (
        <>
          <h3>
            Changes <span className="ver">vs v{previous.version}</span>
          </h3>
          {changes.length === 0 && <p className="empty">No differences.</p>}
          <ul className="changes">
            {changes.map((c) => (
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
