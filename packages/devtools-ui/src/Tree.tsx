import { useState } from 'react';
import type { Wire } from '@blac/devtools-connect/protocol';
import type { Change } from './diff';
import { children, scalar, summary } from './format';

export type Marks = ReadonlyMap<string, Change['kind']>;

interface NodeProps {
  label?: string;
  value: Wire;
  path: string;
  depth: number;
  marks?: Marks;
}

function Node({ label, value, path, depth, marks }: NodeProps) {
  const [open, setOpen] = useState(depth < 2);
  const leaf = scalar(value);
  const mark = marks?.get(path);
  const key = label !== undefined && (
    <>
      <span className="key">{label}</span>
      {': '}
    </>
  );

  if (leaf) {
    return (
      <div className={`leaf ${mark ?? ''}`}>
        {key}
        <span className={`val ${leaf.kind}`}>{leaf.text}</span>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={`node ${mark ?? ''}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="caret">{open ? '▾' : '▸'}</span>
        {key}
        {!open && <span className="muted">{summary(value)}</span>}
      </button>
      {open && (
        <div className="kids">
          {children(value).map(([k, child], i) => (
            <Node
              key={i}
              label={k}
              value={child}
              path={path ? `${path}.${k}` : k}
              depth={depth + 1}
              marks={marks}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Tree({ value, marks }: { value: Wire; marks?: Marks }) {
  return (
    <div className="tree">
      <Node value={value} path="" depth={0} marks={marks} />
    </div>
  );
}
