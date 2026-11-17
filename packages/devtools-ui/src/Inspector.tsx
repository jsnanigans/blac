import { useMemo, useState } from 'react';
import type {
  HistoryEntry,
  InstanceMeta,
  Paths,
} from '@blac/devtools-connect/protocol';
import { diff } from './diff';
import {
  ago,
  clock,
  instanceCopy,
  instanceKey,
  keyLabel,
  summary,
} from './format';
import { InfoView, lifetimeLabel } from './InfoView';
import { Tree } from './Tree';
import { ClassMark, Empty, Icon, Segmented, SkeletonRows } from './ui';

export type View = 'state' | 'changes' | 'history' | 'info';

export const VIEWS: readonly View[] = ['state', 'changes', 'history', 'info'];

const VIEW_LABEL: Record<View, string> = {
  state: 'State',
  changes: 'Changes',
  history: 'History',
  info: 'Info',
};

interface Props {
  meta: InstanceMeta;
  history: HistoryEntry[];
  /** Times of this instance's changes still in the log. */
  changes: readonly number[];
  /** A recorded version to hold the inspector at; `null` follows the latest. */
  pickedVersion: number | null;
  onPick: (version: number | null) => void;
  view: View;
  onView: (view: View) => void;
  onBack: () => void;
  now: number;
}

const clip = (text: string) =>
  text.length > 80 ? `${text.slice(0, 80)}…` : text;

const pathsText = (paths: Paths) =>
  paths === 'all' ? 'whole state' : paths.join(', ');

function CopyButton({ text, label }: { text: () => string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={label}
      title={label}
      onClick={() => {
        void navigator.clipboard?.writeText(text()).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        });
      }}
    >
      <Icon name={done ? 'check' : 'copy'} size={13} />
    </button>
  );
}

export function Inspector({
  meta,
  history,
  changes: changeTimes,
  pickedVersion,
  onPick,
  view,
  onView,
  onBack,
  now,
}: Props) {
  const found = history.findIndex((e) => e.version === pickedVersion);
  const index = found >= 0 ? found : history.length - 1;
  const entry = history[index];
  const previous = history[index - 1];
  const pinned =
    pickedVersion !== null && found >= 0 && index < history.length - 1;

  const changes = useMemo(
    () => (entry && previous ? diff(previous.state, entry.state) : []),
    [entry, previous],
  );
  const marks = useMemo(
    () => new Map(changes.map((c) => [c.path, c.kind] as const)),
    [changes],
  );
  const key = instanceKey(meta);
  const copy = instanceCopy(meta.id);

  let body;
  if (view === 'info') {
    body = <InfoView meta={meta} changes={changeTimes} now={now} />;
  } else if (!entry) {
    body = <SkeletonRows count={4} />;
  } else if (view === 'state') {
    body = <Tree value={entry.state} marks={marks} stamp={entry.version} />;
  } else if (view === 'changes') {
    body = !previous ? (
      <Empty
        title="First recorded version"
        hint={`v${entry.version} has nothing earlier to compare with.`}
      />
    ) : changes.length === 0 ? (
      <Empty
        title="No differences"
        hint={`v${entry.version} has the same state as v${previous.version}.`}
      />
    ) : (
      <>
        <p className="caption num">
          v{previous.version} → v{entry.version}
        </p>
        <ul className="changes">
          {changes.map((c) => (
            <li key={c.path} data-kind={c.kind}>
              <span className="sign" aria-label={c.kind}>
                {c.kind === 'added' ? '+' : c.kind === 'removed' ? '−' : '~'}
              </span>
              <span className="path" title={c.path}>
                {c.path || '(root)'}
              </span>
              <span className="vals">
                {c.kind !== 'added' && <del>{clip(summary(c.before))}</del>}
                {c.kind !== 'removed' && <ins>{clip(summary(c.after))}</ins>}
              </span>
            </li>
          ))}
        </ul>
      </>
    );
  } else {
    body = (
      <div className="card" data-list="select">
        {[...history].reverse().map((e, i) => (
          <button
            key={e.version}
            type="button"
            className="row"
            data-row
            aria-pressed={e === entry}
            onClick={() => onPick(i === 0 ? null : e.version)}
          >
            <span className="row-text">
              <span className="row-primary num">v{e.version}</span>
              <span className="row-meta mono" title={pathsText(e.paths)}>
                {e.version === 0 ? 'initial state' : pathsText(e.paths)}
              </span>
            </span>
            <span className="row-end" title={clock(e.at)}>
              {ago(e.at, now)}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      <header className="insp-head">
        <div className="insp-title">
          <button
            type="button"
            className="icon-btn back"
            aria-label="Back to instances"
            onClick={onBack}
          >
            <Icon name="chevronLeft" size={16} />
          </button>
          <ClassMark className={meta.className} />
          <h2 title={meta.className}>{meta.className}</h2>
          <span className="key" title={meta.id}>
            {keyLabel(key)}
          </span>
          {copy && <span className="badge num">#{copy}</span>}
          <span className="actions">
            {entry && (
              <CopyButton
                label={`Copy state v${entry.version}`}
                text={() => JSON.stringify(entry.state, null, 2)}
              />
            )}
            {history.length > 0 && (
              <button
                type="button"
                className="icon-btn"
                aria-label="Download recorded history"
                title="Download recorded history"
                onClick={() => download(meta, history)}
              >
                <Icon name="download" size={13} />
              </button>
            )}
          </span>
        </div>
        <div className="insp-meta">
          {meta.keepAlive !== undefined && lifetimeLabel(meta) !== 'shared' && (
            <span className="badge" data-tone="info">
              {lifetimeLabel(meta)}
            </span>
          )}
          {meta.status && <StatusBadges meta={meta} />}
          <span className="num">v{meta.version}</span>
          <span>·</span>
          <span title={clock(meta.createdAt)}>
            created {ago(meta.createdAt, now)}
          </span>
          {meta.args !== undefined && (
            <>
              <span>·</span>
              <span className="mono" title={JSON.stringify(meta.args)}>
                args {clip(JSON.stringify(meta.args))}
              </span>
            </>
          )}
        </div>
        <div className="insp-bar">
          <Segmented
            label="Inspector view"
            options={VIEWS}
            value={view}
            onChange={onView}
            render={(v) => VIEW_LABEL[v]}
          />
          {pinned && entry && (
            <span className="pinned">
              <span className="badge" data-tone="warn">
                Viewing v{entry.version}
              </span>
              <button
                type="button"
                className="btn"
                data-variant="outline"
                title="Back to latest (L)"
                onClick={() => onPick(null)}
              >
                Back to latest
              </button>
            </span>
          )}
        </div>
      </header>
      <div className="insp-body">{body}</div>
    </>
  );
}

/** Idle and hydration badges; nothing for the common active, unhydrated case. */
export function StatusBadges({ meta }: { meta: InstanceMeta }) {
  const status = meta.status;
  if (!status) return null;
  return (
    <>
      {!status.active && (
        <span
          className="badge"
          data-tone="warn"
          title={meta.keepAlive ? 'No owners; kept alive' : 'No owners'}
        >
          idle
        </span>
      )}
      {(status.hydration === 'hydrating' || status.hydration === 'error') && (
        <span
          className="badge"
          data-tone={status.hydration === 'error' ? 'danger' : 'info'}
          title={status.hydrationError}
        >
          {status.hydration === 'error' ? 'hydration failed' : 'hydrating'}
        </span>
      )}
    </>
  );
}

function download(meta: InstanceMeta, history: HistoryEntry[]) {
  const blob = new Blob([JSON.stringify({ meta, history }, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${meta.id.replace(/[^\w.-]+/g, '_')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
