import type { ReactNode } from 'react';
import type { InstanceMeta } from '@blac/devtools-connect/protocol';
import { ago, clock, histogram, plural, refKind, type RefKind } from './format';

const BINS = 30;
const BIN_MS = 2000;

const REF_GROUPS: ReadonlyArray<[RefKind, string]> = [
  ['component', 'Components'],
  ['dependency', 'Components, via .track()'],
  ['watch', 'watch()'],
  ['manual', 'Manual acquire'],
];

export const lifetimeLabel = (meta: InstanceMeta) =>
  meta.keepAlive ? 'keepAlive' : meta.isolated ? 'isolated' : 'shared';

const LIFETIME_HINT = {
  keepAlive: 'Never disposed automatically; stays alive without owners.',
  isolated: 'Each useBloc mount gets its own instance.',
  shared: 'Disposed when its last owner releases it.',
};

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

function Activity({ times, now }: { times: readonly number[]; now: number }) {
  const bins = histogram(times, now, BINS, BIN_MS);
  const max = Math.max(1, ...bins);
  const recent = bins.slice(-5).reduce((a, b) => a + b, 0);
  return (
    <span className="activity">
      <svg
        className="spark"
        viewBox={`0 0 ${BINS * 4} 16`}
        width={BINS * 4}
        height={16}
        role="img"
        aria-label={`${plural(times.length, 'update')} in the log; updates per 2s over the last minute`}
      >
        {bins.map((count, i) => (
          <rect
            key={i}
            x={i * 4}
            y={16 - Math.max(1, (count / max) * 16)}
            width={3}
            height={Math.max(1, (count / max) * 16)}
            data-zero={count === 0 ? '' : undefined}
          />
        ))}
      </svg>
      <span className="num">{(recent / 10).toFixed(1)}/s</span>
    </span>
  );
}

/** Lifetime, ownership, hydration and activity of one instance. */
export function InfoView({
  meta,
  changes,
  now,
}: {
  meta: InstanceMeta;
  /** Times of this instance's changes still in the log. */
  changes: readonly number[];
  now: number;
}) {
  const { status } = meta;
  const lifetime = lifetimeLabel(meta);
  const refs = status?.refs ?? [];

  return (
    <div className="info">
      <dl className="facts">
        <Fact label="Lifetime">
          <span
            className="badge"
            data-tone={lifetime === 'shared' ? undefined : 'info'}
          >
            {lifetime}
          </span>{' '}
          <span className="muted">{LIFETIME_HINT[lifetime]}</span>
        </Fact>
        {status && (
          <Fact label="Owners">
            {status.active ? (
              plural(refs.length, 'ref')
            ) : (
              <>
                <span className="badge" data-tone="warn">
                  idle
                </span>{' '}
                <span className="muted">
                  {meta.keepAlive
                    ? 'No owners; kept alive.'
                    : 'Not acquired by anything.'}
                </span>
              </>
            )}
          </Fact>
        )}
        {status && status.hydration !== 'idle' && (
          <Fact label="Hydration">
            <span
              className="badge"
              data-tone={
                status.hydration === 'error'
                  ? 'danger'
                  : status.hydration === 'hydrating'
                    ? 'info'
                    : undefined
              }
            >
              {status.hydration}
            </span>
            {status.hydrationError && (
              <span className="mono"> {status.hydrationError}</span>
            )}
            {status.changedWhileHydrating && (
              <span className="muted"> · changed while hydrating</span>
            )}
          </Fact>
        )}
        <Fact label="Created">
          <span className="num">{clock(meta.createdAt)}</span>{' '}
          <span className="muted">· {ago(meta.createdAt, now)}</span>
        </Fact>
        <Fact label="Updates">
          <span className="num">{meta.version}</span>
          {meta.version > 0 && (
            <span className="muted"> · last {ago(meta.updatedAt, now)}</span>
          )}
        </Fact>
        <Fact label="Activity">
          <Activity times={changes} now={now} />
        </Fact>
        <Fact label="Console">
          <span className="muted">
            The selected instance is <code>$bloc</code> in the page console.
          </span>
        </Fact>
      </dl>

      {status && (
        <>
          <p className="caption">Refs · {refs.length}</p>
          {refs.length === 0 ? (
            <p className="muted">
              Nothing holds a ref
              {status.active ? '; owned by dependent blocs.' : '.'}
            </p>
          ) : (
            REF_GROUPS.map(([kind, label]) => {
              const ids = refs.filter((id) => refKind(id) === kind);
              if (ids.length === 0) return null;
              return (
                <div key={kind} className="card refs">
                  <p className="refs-head">
                    {label} <span className="num muted">{ids.length}</span>
                  </p>
                  {ids.map((id) => (
                    <p key={id} className="mono" title={id}>
                      {id}
                    </p>
                  ))}
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
