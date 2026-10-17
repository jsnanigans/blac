import React, { memo } from 'react';
import type { DataItem, ListAPI } from './types';

/**
 * The row markup every implementation renders. A plain function, not a
 * component, so "sub rows" add no fiber over "prop rows".
 */
export function renderRow(
  id: number,
  label: string,
  selected: boolean,
  onSelect: (id: number) => void,
  onRemove: (id: number) => void,
): React.ReactElement {
  return (
    <tr className={selected ? 'danger' : ''}>
      <td className="col-md-1">{id}</td>
      <td className="col-md-4">
        <a onClick={() => onSelect(id)}>{label}</a>
      </td>
      <td className="col-md-1">
        <a onClick={() => onRemove(id)}>
          <span className="glyphicon glyphicon-remove" aria-hidden="true" />
        </a>
      </td>
      <td className="col-md-6" />
    </tr>
  );
}

/**
 * "Prop rows": the row subscribes to nothing. The parent reads every field the
 * rows render and passes primitives down, so mount is cheap but every change
 * re-renders the parent and compares every row's props.
 */
export const PropRow = memo(function PropRow(props: {
  id: number;
  label: string;
  selected: boolean;
  onSelect: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  return renderRow(
    props.id,
    props.label,
    props.selected,
    props.onSelect,
    props.onRemove,
  );
});

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="container">
      <table className="table table-hover table-striped test-data">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export interface ListOp {
  label: string;
  /** Brings the table to the op's starting state; settled, not timed. */
  setup: (api: ListAPI) => void;
  run: (api: ListAPI) => void;
}

const MIDDLE = 500;

export const LIST_OPS: Record<string, ListOp> = {
  create1k: {
    label: 'Create 1,000 rows',
    setup: (a) => a.clear(),
    run: (a) => a.run(),
  },
  replace1k: {
    label: 'Replace 1,000 rows',
    setup: (a) => a.run(),
    run: (a) => a.run(),
  },
  update10th: {
    label: 'Update every 10th row',
    setup: (a) => a.run(),
    run: (a) => a.updateEvery10th(),
  },
  updateRow: {
    label: 'Update 1 row',
    setup: (a) => a.run(),
    run: (a) => a.updateRow(a.idAt(MIDDLE)),
  },
  select: {
    label: 'Select row',
    setup: (a) => a.run(),
    run: (a) => a.select(a.idAt(MIDDLE)),
  },
  swap: {
    label: 'Swap rows',
    setup: (a) => a.run(),
    run: (a) => a.swapRows(),
  },
  remove: {
    label: 'Remove row',
    setup: (a) => a.run(),
    run: (a) => a.remove(a.idAt(MIDDLE)),
  },
  create10k: {
    label: 'Create 10,000 rows',
    setup: (a) => a.clear(),
    run: (a) => a.runLots(),
  },
  append1k: {
    label: 'Append 1,000 rows',
    setup: (a) => a.run(),
    run: (a) => a.add(),
  },
  clear: {
    label: 'Clear 1,000 rows',
    setup: (a) => a.run(),
    run: (a) => a.clear(),
  },
};

/** Pure list transforms, shared so every library does the same work. */
export const listOps = {
  updateEvery10th(data: readonly DataItem[]): DataItem[] {
    const next = data.slice();
    for (let i = 0; i < next.length; i += 10) {
      next[i] = { ...next[i], label: next[i].label + ' !!!' };
    }
    return next;
  },
  updateRow(data: readonly DataItem[], id: number): DataItem[] {
    return data.map((d) =>
      d.id === id ? { ...d, label: d.label + ' !!!' } : d,
    );
  },
  relabel(data: readonly DataItem[], index: number): DataItem[] {
    const next = data.slice();
    next[index] = { ...next[index], label: next[index].label + ' !!!' };
    return next;
  },
  swap(data: readonly DataItem[]): DataItem[] {
    const next = data.slice();
    if (next.length > 998) {
      const tmp = next[1];
      next[1] = next[998];
      next[998] = tmp;
    }
    return next;
  },
  remove(data: readonly DataItem[], id: number): DataItem[] {
    return data.filter((d) => d.id !== id);
  },
};
