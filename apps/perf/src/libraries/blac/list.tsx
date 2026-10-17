import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import React, { memo, useEffect } from 'react';
import { buildData } from '../../shared/data';
import { PropRow, Table, listOps, renderRow } from '../../shared/list';
import type { DataItem, ListAPI } from '../../shared/types';

interface ListState {
  data: DataItem[];
  selected: number | null;
}

class ListBloc extends Cubit<ListState> implements ListAPI {
  constructor() {
    super({ data: [], selected: null });
  }

  run = (): void => this.emit({ data: buildData(1000), selected: null });
  runLots = (): void => this.emit({ data: buildData(10000), selected: null });
  add = (): void =>
    this.patch({ data: [...this.state.data, ...buildData(1000)] });
  updateEvery10th = (): void =>
    this.patch({ data: listOps.updateEvery10th(this.state.data) });
  updateRow = (id: number): void =>
    this.patch({ data: listOps.updateRow(this.state.data, id) });
  select = (id: number): void => this.patch({ selected: id });
  swapRows = (): void => this.patch({ data: listOps.swap(this.state.data) });
  remove = (id: number): void =>
    this.patch({ data: listOps.remove(this.state.data, id) });
  clear = (): void => this.emit({ data: [], selected: null });
  idAt = (index: number): number => this.state.data[index].id;
}

type Props = { onReady: (api: ListAPI) => void };

// Auto-tracked: the row reads `data[index]` and `selected`, so a change to
// one item wakes only its row, while a selection change wakes every row.
const SubRow = memo(function SubRow({ index }: { index: number }) {
  const [state, bloc] = useBloc(ListBloc);
  const item = state.data[index];
  return renderRow(
    item.id,
    item.label,
    state.selected === item.id,
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
          selected={state.selected === item.id}
          onSelect={bloc.select}
          onRemove={bloc.remove}
        />
      ))}
    </Table>
  );
}
