import React, { memo, useEffect, useState } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import { buildData } from '../../shared/data';
import { PropRow, Table, listOps, renderRow } from '../../shared/list';
import type { DataItem, ListAPI } from '../../shared/types';

interface ListState extends ListAPI {
  data: DataItem[];
  selected: number | null;
}

type ListStore = StoreApi<ListState>;

const createListStore = (): ListStore =>
  createStore<ListState>((set, get) => ({
    data: [],
    selected: null,
    run: () => set({ data: buildData(1000), selected: null }),
    runLots: () => set({ data: buildData(10000), selected: null }),
    add: () => set((s) => ({ data: [...s.data, ...buildData(1000)] })),
    updateEvery10th: () =>
      set((s) => ({ data: listOps.updateEvery10th(s.data) })),
    updateRow: (id) => set((s) => ({ data: listOps.updateRow(s.data, id) })),
    select: (id) => set({ selected: id }),
    swapRows: () => set((s) => ({ data: listOps.swap(s.data) })),
    remove: (id) => set((s) => ({ data: listOps.remove(s.data, id) })),
    clear: () => set({ data: [], selected: null }),
    idAt: (index) => get().data[index].id,
  }));

type Props = { onReady: (api: ListAPI) => void };

function useListStore(onReady: Props['onReady']): ListStore {
  const [store] = useState(createListStore);
  useEffect(() => onReady(store.getState()), [store, onReady]);
  return store;
}

// Each row selects its own item and selection flag, so a change re-runs every
// row's selectors but re-renders only rows whose result changed.
const SubRow = memo(function SubRow({
  index,
  store,
}: {
  index: number;
  store: ListStore;
}) {
  const item = useStore(store, (s) => s.data[index]);
  const selected = useStore(store, (s) => s.selected === item.id);
  const { select, remove } = store.getState();
  return renderRow(item.id, item.label, selected, select, remove);
});

export function ZustandSubRows({ onReady }: Props) {
  const store = useListStore(onReady);
  const data = useStore(store, (s) => s.data);
  return (
    <Table>
      {data.map((item, i) => (
        <SubRow key={item.id} index={i} store={store} />
      ))}
    </Table>
  );
}

export function ZustandPropRows({ onReady }: Props) {
  const store = useListStore(onReady);
  const data = useStore(store, (s) => s.data);
  const selected = useStore(store, (s) => s.selected);
  const { select, remove } = store.getState();
  return (
    <Table>
      {data.map((item) => (
        <PropRow
          key={item.id}
          id={item.id}
          label={item.label}
          selected={selected === item.id}
          onSelect={select}
          onRemove={remove}
        />
      ))}
    </Table>
  );
}
