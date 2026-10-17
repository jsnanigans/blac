import {
  configureStore,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { buildData } from '../../shared/data';
import { PropRow, Table, renderRow } from '../../shared/list';
import type { DataItem, ListAPI } from '../../shared/types';

interface ListState {
  data: DataItem[];
  selected: number | null;
}

const initialState: ListState = { data: [], selected: null };

// Immer reducers: the idiomatic RTK cost, included on purpose.
const slice = createSlice({
  name: 'list',
  initialState,
  reducers: {
    run(state) {
      state.data = buildData(1000);
      state.selected = null;
    },
    runLots(state) {
      state.data = buildData(10000);
      state.selected = null;
    },
    add(state) {
      state.data.push(...buildData(1000));
    },
    updateEvery10th(state) {
      for (let i = 0; i < state.data.length; i += 10) {
        state.data[i].label += ' !!!';
      }
    },
    updateRow(state, action: PayloadAction<number>) {
      const row = state.data.find((d) => d.id === action.payload);
      if (row) row.label += ' !!!';
    },
    select(state, action: PayloadAction<number>) {
      state.selected = action.payload;
    },
    swapRows(state) {
      if (state.data.length > 998) {
        const tmp = state.data[1];
        state.data[1] = state.data[998];
        state.data[998] = tmp;
      }
    },
    remove(state, action: PayloadAction<number>) {
      const idx = state.data.findIndex((d) => d.id === action.payload);
      if (idx !== -1) state.data.splice(idx, 1);
    },
    clear(state) {
      state.data = [];
      state.selected = null;
    },
  },
});

const { actions } = slice;

const createListStore = () =>
  configureStore({
    reducer: slice.reducer,
    middleware: (getDefault) =>
      getDefault({ serializableCheck: false, immutableCheck: false }),
  });

type ListStore = ReturnType<typeof createListStore>;

const listAPI = (store: ListStore): ListAPI => ({
  run: () => store.dispatch(actions.run()),
  runLots: () => store.dispatch(actions.runLots()),
  add: () => store.dispatch(actions.add()),
  updateEvery10th: () => store.dispatch(actions.updateEvery10th()),
  updateRow: (id) => store.dispatch(actions.updateRow(id)),
  select: (id) => store.dispatch(actions.select(id)),
  swapRows: () => store.dispatch(actions.swapRows()),
  remove: (id) => store.dispatch(actions.remove(id)),
  clear: () => store.dispatch(actions.clear()),
  idAt: (index) => store.getState().data[index].id,
});

type Props = { onReady: (api: ListAPI) => void };

function withStore(Body: React.ComponentType) {
  return function ReduxList({ onReady }: Props) {
    const [store] = useState(createListStore);
    useEffect(() => onReady(listAPI(store)), [store, onReady]);
    return (
      <Provider store={store}>
        <Body />
      </Provider>
    );
  };
}

function useRowActions() {
  const dispatch = useDispatch();
  return {
    onSelect: useCallback(
      (id: number) => dispatch(actions.select(id)),
      [dispatch],
    ),
    onRemove: useCallback(
      (id: number) => dispatch(actions.remove(id)),
      [dispatch],
    ),
  };
}

// Each row selects its own item and selection flag, so a change re-runs every
// row's selectors but re-renders only rows whose result changed.
const SubRow = memo(function SubRow({ index }: { index: number }) {
  const item = useSelector((s: ListState) => s.data[index]);
  const selected = useSelector((s: ListState) => s.selected === item.id);
  const { onSelect, onRemove } = useRowActions();
  return renderRow(item.id, item.label, selected, onSelect, onRemove);
});

export const ReduxSubRows = withStore(function SubRows() {
  const data = useSelector((s: ListState) => s.data);
  return (
    <Table>
      {data.map((item, i) => (
        <SubRow key={item.id} index={i} />
      ))}
    </Table>
  );
});

export const ReduxPropRows = withStore(function PropRows() {
  const data = useSelector((s: ListState) => s.data);
  const selected = useSelector((s: ListState) => s.selected);
  const { onSelect, onRemove } = useRowActions();
  return (
    <Table>
      {data.map((item) => (
        <PropRow
          key={item.id}
          id={item.id}
          label={item.label}
          selected={selected === item.id}
          onSelect={onSelect}
          onRemove={onRemove}
        />
      ))}
    </Table>
  );
});
