import { useMemo, useRef, useState } from 'react';
import type { ChurnEntry } from '@blac/devtools-connect/client';
import type { InstanceMeta } from '@blac/devtools-connect/protocol';
import { StatusBadges } from './Inspector';
import {
  clock,
  instanceCopy,
  instanceKey,
  keyLabel,
  plural,
  time,
} from './format';
import { ClassMark, Empty, Icon, Kbd, hueStyle, read, write } from './ui';

interface Props {
  instances: InstanceMeta[];
  churn: ChurnEntry[];
  now: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Rows rendered per class before a "show more" button. */
const PAGE = 200;
const COLLAPSED_KEY = 'blac-devtools-collapsed';

const CHURN_WINDOW_MS = 10_000;

/** Also matches `keepalive`, `isolated` and `idle`. */
const matches = (meta: InstanceMeta, query: string) =>
  [
    meta.className,
    meta.name,
    meta.id,
    meta.keepAlive ? 'keepalive' : '',
    meta.isolated ? 'isolated' : '',
    meta.status && !meta.status.active ? 'idle' : '',
  ].some((text) => text.toLowerCase().includes(query));

/** Classes with short-lived instances in the last 10s, most first. */
function churning(churn: ChurnEntry[], now: number) {
  const counts = new Map<string, number>();
  for (let i = churn.length - 1; i >= 0; i--) {
    const { className, at, count } = churn[i];
    if (now - at > CHURN_WINDOW_MS) break;
    counts.set(className, (counts.get(className) ?? 0) + count);
  }
  return [...counts].sort((a, b) => b[1] - a[1]);
}

const lastEvent = (meta: InstanceMeta) =>
  meta.version === 0
    ? { verb: 'created', at: meta.createdAt }
    : { verb: 'changed', at: meta.updatedAt };

/** One instance. A child of a group drops the class it shares. */
function Row({
  meta,
  selected,
  onSelect,
  child,
}: {
  meta: InstanceMeta;
  selected: boolean;
  onSelect: (id: string) => void;
  child?: boolean;
}) {
  const initial = useRef(meta.version).current;
  const key = instanceKey(meta);
  const copy = instanceCopy(meta.id);
  const { verb, at } = lastEvent(meta);
  const status = `${verb} at ${clock(at)}`;
  return (
    <div
      className="line"
      data-child={child ? '' : undefined}
      style={hueStyle(meta.className)}
    >
      {meta.version !== initial && (
        <span key={meta.version} className="flash" aria-hidden />
      )}
      <span className="twisty" />
      <button
        type="button"
        className="row"
        data-row
        aria-pressed={selected}
        aria-label={`${meta.className} ${key}${copy ? ` #${copy}` : ''}, version ${meta.version}, ${status}`}
        title={meta.id}
        onClick={() => onSelect(meta.id)}
      >
        {!child && <ClassMark className={meta.className} />}
        <span className="row-line">
          {!child && (
            <>
              <span className="row-primary">{meta.className}</span>
              <span className="row-meta"> · </span>
            </>
          )}
          <span
            className="row-key"
            data-default={key === 'default' ? '' : undefined}
          >
            {keyLabel(key)}
          </span>
          <span className="row-meta">
            {meta.name !== meta.className && meta.name !== key && (
              <> · {meta.name}</>
            )}
            {' · '}
            <span
              key={meta.version}
              className="ver num"
              data-changed={meta.version > 0 ? '' : undefined}
              data-flash={meta.version !== initial ? '' : undefined}
            >
              v{meta.version}
            </span>
            {' · '}
            <span className="num" title={status}>
              {time(at)}
            </span>
          </span>
        </span>
        <StatusBadges meta={meta} />
        {copy && (
          <span
            className="badge num"
            title="Another live instance shares this key"
          >
            #{copy}
          </span>
        )}
      </button>
    </div>
  );
}

function GroupHeader({
  className,
  count,
  open,
  onToggle,
}: {
  className: string;
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="line group" style={hueStyle(className)}>
      <button
        type="button"
        className="row"
        aria-expanded={open}
        aria-label={`${open ? 'Collapse' : 'Expand'} ${className}, ${count} instances`}
        onClick={onToggle}
      >
        <span className="twisty">
          <Icon name="chevronRight" size={12} />
        </span>
        <ClassMark className={className} />
        <span className="row-line row-primary">{className}</span>
        <span className="badge num">{count}</span>
      </button>
    </div>
  );
}

function readCollapsed(): Set<string> {
  try {
    return new Set(JSON.parse(read(COLLAPSED_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function InstanceList({
  instances,
  churn,
  now,
  selectedId,
  onSelect,
}: Props) {
  const [filter, setFilter] = useState('');
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const query = filter.trim().toLowerCase();

  const visible = useMemo(
    () =>
      instances
        .filter((meta) => !query || matches(meta, query))
        .sort(
          (a, b) =>
            a.className.localeCompare(b.className) ||
            a.name.localeCompare(b.name) ||
            a.createdAt - b.createdAt,
        ),
    [instances, query],
  );

  const groups = useMemo(() => {
    const byClass = new Map<string, InstanceMeta[]>();
    for (const meta of visible) {
      const items = byClass.get(meta.className);
      if (items) items.push(meta);
      else byClass.set(meta.className, [meta]);
    }
    return [...byClass];
  }, [visible]);

  const toggle = (className: string) => {
    const next = new Set(collapsed);
    if (!next.delete(className)) next.add(className);
    setCollapsed(next);
    write(COLLAPSED_KEY, JSON.stringify([...next]));
  };

  return (
    <>
      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={13} />
          <input
            type="search"
            placeholder="Filter instances"
            aria-label="Filter instances"
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
      </div>
      {churning(churn, now)
        .slice(0, 3)
        .map(([className, count]) => (
          <button
            key={className}
            type="button"
            className="churn"
            title={`${plural(count, 'instance')} of ${className} were created and disposed within 1s in the last 10s. Unstable args or a missing static key?`}
            onClick={() => setFilter(className)}
          >
            <Icon name="info" size={13} />
            <span className="row-line">
              <span className="row-primary">{className}</span>
              <span className="row-meta"> · short-lived instances</span>
            </span>
            <span className="badge num" data-tone="warn">
              {count} in 10s
            </span>
          </button>
        ))}
      <div className="scroll" data-list="select">
        {groups.length === 0 && (
          <Empty
            title={
              instances.length === 0 ? 'No instances yet' : 'No instances match'
            }
            hint={
              instances.length === 0
                ? 'Instances appear here when a bloc or cubit is first used.'
                : 'Try another filter.'
            }
          />
        )}
        {groups.map(([className, items]) => {
          if (items.length === 1) {
            const meta = items[0];
            return (
              <section key={className}>
                <Row
                  meta={meta}
                  selected={meta.id === selectedId}
                  onSelect={onSelect}
                />
              </section>
            );
          }
          const limit = limits[className] ?? PAGE;
          const open = !collapsed.has(className);
          return (
            <section key={className} data-group>
              <GroupHeader
                className={className}
                count={items.length}
                open={open}
                onToggle={() => toggle(className)}
              />
              {open &&
                items
                  .slice(0, limit)
                  .map((meta) => (
                    <Row
                      key={meta.id}
                      meta={meta}
                      selected={meta.id === selectedId}
                      onSelect={onSelect}
                      child
                    />
                  ))}
              {open && items.length > limit && (
                <button
                  type="button"
                  className="btn more"
                  onClick={() =>
                    setLimits({ ...limits, [className]: limit + PAGE })
                  }
                >
                  Show {Math.min(PAGE, items.length - limit)} more of{' '}
                  {items.length - limit}
                </button>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
