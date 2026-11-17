import { useState } from 'react';
import type { Wire } from '@blac/devtools-connect/protocol';
import type { Change } from './diff';
import { children, scalar, summary } from './format';
import { Icon } from './ui';

export type Marks = ReadonlyMap<string, Change['kind']>;

const hasMarkInside = (marks: Marks | undefined, path: string) => {
  const prefix = path ? `${path}.` : '';
  for (const key of marks?.keys() ?? [])
    if (key.startsWith(prefix)) return true;
  return false;
};

interface NodeProps {
  label?: string;
  value: Wire;
  path: string;
  depth: number;
  marks?: Marks;
  /** Changes when the marks do, so they flash again. */
  stamp?: number;
}

function Node({ label, value, path, depth, marks, stamp }: NodeProps) {
  const [open, setOpen] = useState(depth < 2);
  const leaf = scalar(value);
  const mark = marks?.get(path);
  const key = label !== undefined && (
    <>
      <span className="key">{label}</span>
      <span className="sep">: </span>
    </>
  );

  if (leaf) {
    return (
      <div className="leaf" data-mark={mark} key={mark && stamp}>
        {key}
        <span className={`val ${leaf.kind}`}>{leaf.text}</span>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={`node${!open && !mark && hasMarkInside(marks, path) ? ' inside' : ''}`}
        data-mark={mark}
        key={mark && stamp}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Icon name="chevronRight" size={12} className="caret" />
        {key}
        {!open && <span className="muted">{summary(value)}</span>}
      </button>
      {open && (
        <div className="kids">
          <Children
            value={value}
            path={path}
            depth={depth}
            marks={marks}
            stamp={stamp}
          />
        </div>
      )}
    </div>
  );
}

function Children({ value, path, depth, marks, stamp }: NodeProps) {
  return children(value).map(([k, child], i) => (
    <Node
      key={i}
      label={k}
      value={child}
      path={path ? `${path}.${k}` : k}
      depth={depth + 1}
      marks={marks}
      stamp={stamp}
    />
  ));
}

/** The root's children are shown directly; a scalar root is a single leaf. */
export function Tree({
  value,
  marks,
  stamp,
}: {
  value: Wire;
  marks?: Marks;
  stamp?: number;
}) {
  let body;
  if (scalar(value)) body = <Node value={value} path="" depth={0} />;
  else if (children(value).length === 0) {
    body = <span className="muted">{summary(value)}</span>;
  } else
    body = (
      <Children value={value} path="" depth={0} marks={marks} stamp={stamp} />
    );
  return <div className="tree">{body}</div>;
}
