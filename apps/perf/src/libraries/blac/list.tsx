import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import React, { memo, useEffect } from 'react';
import { buildData } from '../../shared/data';
import { PropRow, Table, listOps, renderRow } from '../../shared/list';
import type { DataItem, ListAPI } from '../../shared/types';

// The selection lives on the rows: auto-tracking records which fields a
// component reads, so a row that reads only its own `selected` flag wakes only
// when that flag changes. A shared `selected: id` would wake every row.
interface ListState {
  data: DataItem[];
}

class ListBloc extends Cubit<ListState> implements ListAPI {
  constructor() {
    super({ data: [] });
  }

  run = (): void => this.emit({ data: buildData(1000) });
  runLots = (): void => this.emit({ data: buildData(10000) });
  add = (): void =>
    this.patch({ data: [...this.state.data, ...buildData(1000)] });
  updateEvery10th = (): void =>
    this.patch({ data: listOps.updateEvery10th(this.state.data) });
  updateRow = (id: number): void =>
    this.patch({ data: listOps.updateRow(this.state.data, id) });
  select = (id: number): void => {
    const data = this.state.data.slice();
    for (let i = 0; i < data.length; i++) {
      const selected = data[i].id === id;
      if ((data[i].selected === true) !== selected) {
        data[i] = { ...data[i], selected };
      }
    }
    this.patch({ data });
  };
  swapRows = (): void => this.patch({ data: listOps.swap(this.state.data) });
  remove = (id: number): void =>
    this.patch({ data: listOps.remove(this.state.data, id) });
  clear = (): void => this.emit({ data: [] });
  idAt = (index: number): number => this.state.data[index].id;
}

type Props = { onReady: (api: ListAPI) => void };

// Auto-tracked: the row reads only `data[index]`'s fields, so a change wakes
// only the rows whose item changed.
const SubRow = memo(function SubRow({ index }: { index: number }) {
  const [state, bloc] = useBloc(ListBloc);
  const item = state.data[index];
  return renderRow(
    item.id,
    item.label,
    item.selected === true,
    bloc.select,
    bloc.remove,
  );
});

export function BlacSubRows({ onReady }: Props) {
  const [state, bloc] = useBloc(ListBloc);
  useEffect(() => onReady(bloc), [bloc, onReady]);
  // Reads only each row's id, so a label change does not wake the parent.
  return (
    <Table>
      {state.data.map((item, i) => (
        <SubRow key={item.id} index={i} />
      ))}
    </Table>
  );
}

export function BlacPropRows({ onReady }: Props) {
  const [state, bloc] = useBloc(ListBloc);
  useEffect(() => onReady(bloc), [bloc, onReady]);
  return (
    <Table>
      {state.data.map((item) => (
        <PropRow
          key={item.id}
          id={item.id}
          label={item.label}
          selected={item.selected === true}
          onSelect={bloc.select}
          onRemove={bloc.remove}
        />
      ))}
    </Table>
  );
}
