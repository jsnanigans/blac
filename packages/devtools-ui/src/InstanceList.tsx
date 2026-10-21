import { useMemo, useRef, useState } from 'react';
import type { InstanceMeta } from '@blac/devtools-connect/protocol';
import { instanceKey } from './format';

interface Props {
  instances: InstanceMeta[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const matches = (meta: InstanceMeta, query: string) =>
  [meta.className, meta.name, meta.id].some((text) =>
    text.toLowerCase().includes(query),
  );

function Row({
  meta,
  selected,
  onSelect,
}: {
  meta: InstanceMeta;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const initial = useRef(meta.version).current;
  const classes = ['item', selected && 'selected', meta.disposedAt && 'off'];
  return (
    <button
      type="button"
      className={classes.filter(Boolean).join(' ')}
      aria-pressed={selected}
      onClick={() => onSelect(meta.id)}
    >
      <span className="name">{instanceKey(meta)}</span>
      {meta.name !== meta.className && (
        <span className="muted">{meta.name}</span>
      )}
      <span
        key={meta.version}
        className={`count ${meta.version !== initial ? 'flash' : ''}`}
        title="changes"
      >
        {meta.version}
      </span>
    </button>
  );
}

export function InstanceList({ instances, selectedId, onSelect }: Props) {
  const [filter, setFilter] = useState('');
  const [showDisposed, setShowDisposed] = useState(false);
  const query = filter.trim().toLowerCase();
  const disposed = instances.filter((meta) => meta.disposedAt).length;

  const groups = useMemo(() => {
    const byClass = new Map<string, InstanceMeta[]>();
    for (const meta of instances) {
      if (meta.disposedAt && !showDisposed) continue;
      if (query && !matches(meta, query)) continue;
      byClass.set(meta.className, [
        ...(byClass.get(meta.className) ?? []),
        meta,
      ]);
    }
    return [...byClass.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([className, items]) => ({
        className,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [instances, query, showDisposed]);

  return (
    <div className="list">
      <div className="toolbar">
        <input
          type="search"
          placeholder="Filter instances"
          aria-label="Filter instances"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <label title="Show disposed instances">
          <input
            type="checkbox"
            checked={showDisposed}
            onChange={(e) => setShowDisposed(e.target.checked)}
          />
          disposed ({disposed})
        </label>
      </div>
      <div className="scroll">
        {groups.length === 0 && (
          <p className="empty">
            {instances.length === 0
              ? 'No instances yet.'
              : 'No instances match.'}
          </p>
        )}
        {groups.map(({ className, items }) => (
          <section key={className}>
            <h3>
              {className} <span className="muted">{items.length}</span>
            </h3>
            {items.map((meta) => (
              <Row
                key={meta.id}
                meta={meta}
                selected={meta.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
