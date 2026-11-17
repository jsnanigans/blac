import { useMemo, useRef, useState } from 'react';
import type { InstanceMeta } from '@blac/devtools-connect/protocol';
import { clock, instanceCopy, instanceKey, keyLabel, time } from './format';
import {
  ClassMark,
  Empty,
  Icon,
  Kbd,
  UpdatesPill,
  hueStyle,
  read,
  useHeldValue,
  useInteractionHold,
  write,
} from './ui';

interface Props {
  instances: InstanceMeta[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Rows rendered per class before a "show more" button. */
const PAGE = 200;
const COLLAPSED_KEY = 'blac-devtools-collapsed';

const matches = (meta: InstanceMeta, query: string) =>
  [meta.className, meta.name, meta.id].some((text) =>
    text.toLowerCase().includes(query),
  );

const ids = (list: InstanceMeta[]) => list.map((meta) => meta.id).join('\n');

/** Changes that don't add or remove rows go straight through a hold. */
const sameRows = (a: InstanceMeta[], b: InstanceMeta[]) =>
  a.length === b.length && a.every((meta, i) => meta.id === b[i].id);

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

export function InstanceList({ instances, selectedId, onSelect }: Props) {
  const [filter, setFilter] = useState('');
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
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
  const held = useInteractionHold(scroller);
  const { shown, pending, release } = useHeldValue(visible, held, sameRows);
  const latest = useMemo(
    () => new Map(visible.map((meta) => [meta.id, meta])),
    [visible],
  );

  const groups = useMemo(() => {
    const byClass = new Map<string, InstanceMeta[]>();
    for (const old of shown) {
      const meta = latest.get(old.id) ?? old;
      const items = byClass.get(meta.className);
      if (items) items.push(meta);
      else byClass.set(meta.className, [meta]);
    }
    return [...byClass];
  }, [shown, latest]);

  const toggle = (className: string) => {
    const next = new Set(collapsed);
    if (!next.delete(className)) next.add(className);
    setCollapsed(next);
    write(COLLAPSED_KEY, JSON.stringify([...next]));
  };

  const hidden = pending && ids(shown) !== ids(visible);

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
      <div className="scroll" ref={setScroller} data-list="select">
        <UpdatesPill visible={hidden} label="Show updates" onApply={release} />
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
